import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sparkles, Calendar, Clock, Zap, AlertCircle, Play, Pause, RefreshCw, Layers } from 'lucide-react';
import { Habit, Task, UserProfile } from '../types';
import { getToday, isHabitActiveOnDate } from '../utils/dateHelpers';
import { playCompletionSound, performVibe } from '../utils/fx';

interface LiveSmartNotificationEngineProps {
  habits: Habit[];
  tasks: Task[];
  currentUserProfile: UserProfile | null;
  onPushNotification: (targetUid: string, icon: string, message: string) => void;
  isGuestMode: boolean;
  onRecordFeedEvent?: (type: 'habit_completed' | 'task_completed' | 'reward_unlocked' | 'daily_challenge_completed' | 'mood_changed', title: string, extra?: string) => void;
}

// Creative reminder phrases for Portuguese localization depending on categories/tags
const CATEGORY_REMINDERS: Record<string, string[]> = {
  espiritual: [
    'Que tal tirar 5 minutos para elevar seus sentimentos com o hábito "%title%"? 🙏',
    'Momento de paz 🌟: lembrete para praticar "%title%" e cultivar sabedoria.',
    'A fé se constrói na rotina diária. Lembrete: "%title%"!'
  ],
  saúde: [
    'Cuidar de si é o hábito mais precioso! Lembrete para "%title%"! 🥤',
    'Mens sana in corpore sano! Lembre-se do seu hábito saudável: "%title%". 🏃‍♂️',
    'Pausa para o bem-estar 🍃: não se esqueça de realizar "%title%" hoje.'
  ],
  comunicação: [
    'Um diálogo sincero renova tudo. Tempo para o hábito: "%title%"! 💬',
    'Conexão ativa ☎️: que tal aproveitar agora para fazer "%title%" com seu amor?',
    'Palavras afetuosas criam laços. Lembrete de comunicação: "%title%".'
  ],
  amor: [
    'Pequenos carinhos mantêm a chama acesa. Lembrete: "%title%"! 😍',
    'O amor está nos detalhes cotidianos. Não se esqueça de praticar "%title%".',
    'Surpreenda quem você ama! Lembrete amoroso: "%title%" 🌹'
  ],
  relacionamento: [
    'Fortalecer a parceria é um compromisso diário. Pratique "%title%"! 💑',
    'Caminhar juntos exige sintonia. Lembrete para realizar "%title%".',
    'Um relacionamento feliz se faz com pequenos gestos. Lembrete: "%title%"!'
  ]
};

const DEFAULT_REMINDERS = [
  'Cultive sua consistência! Lembrete para realizar o hábito "%title%" hoje. 😉',
  'Mais um passo rumo às suas metas! Hora de realizar o hábito "%title%".',
  'Fortaleça sua determinação! Pratique "%title%" para evoluir seu dia.'
];

export const LiveSmartNotificationEngine = ({
  habits,
  tasks,
  currentUserProfile,
  onPushNotification,
  isGuestMode,
  onRecordFeedEvent
}: LiveSmartNotificationEngineProps) => {
  const [isActive, setIsActive] = useState<boolean>(true);
  const [fastSimulation, setFastSimulation] = useState<boolean>(false);
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(0);
  const [alreadyNotifiedIds, setAlreadyNotifiedIds] = useState<string[]>([]);
  const [counterSeconds, setCounterSeconds] = useState<number>(0);

  // Active hours of user productivity (e.g. 08:00 to 22:00 -> 14 hours)
  const ACTIVE_HOURS = 14; 

  const todayStr = getToday();

  // 1. Calculate active uncompleted habits for the current user today
  const activeUncompletedHabits = useMemo(() => {
    if (!currentUserProfile) return [];
    return habits.filter(habit => {
      // Must be active on today's weekday
      if (!isHabitActiveOnDate(habit, todayStr)) return false;
      
      // Assigned to current user or assigned to "both"
      const isAssigned = habit.assignedTo === 'both' || habit.assignedTo === currentUserProfile.uid;
      if (!isAssigned) return false;

      // Check if not completed by this user today
      const completedToday = !!habit.completedBy?.[todayStr]?.[currentUserProfile.uid];
      return !completedToday;
    });
  }, [habits, currentUserProfile, todayStr]);

  // 2. Calculate uncompleted single tasks for the current user today/overdue
  const pendingTasks = useMemo(() => {
    if (!currentUserProfile) return [];
    return tasks.filter(task => {
      if (task.completed) return false;
      // Assigned to current user or assigned to "both"
      const isAssigned = task.assignedTo === 'both' || task.assignedTo === currentUserProfile.uid;
      if (!isAssigned) return false;

      // Filter due today or has no due date but is pending
      if (task.dueDate) {
        return task.dueDate <= todayStr;
      }
      return true;
    });
  }, [tasks, currentUserProfile, todayStr]);

  // 3. Density Calculations
  const calculatedDensity = useMemo(() => {
    const totalItems = activeUncompletedHabits.length + pendingTasks.length;
    if (totalItems === 0) return { rate: 0, intervalMinutes: 120, label: 'Tudo pronto!' };

    // Rate = total items to complete split across active wake hours
    const rate = Number((totalItems / ACTIVE_HOURS).toFixed(2));
    
    // Interval = minutes between notifications in typical day setup
    // e.g. 14 hours * 60 minutes = 840 minutes total divided by totalItems
    const intervalMinutes = Math.max(30, Math.round(840 / totalItems));

    let label = 'Leve 🍃';
    if (rate > 0.6) label = 'Equilibrada ⚡';
    if (rate > 1.2) label = 'Focada 🔥';

    return { rate, intervalMinutes, label };
  }, [activeUncompletedHabits, pendingTasks, ACTIVE_HOURS]);

  // Unified callback to execute a single dynamic prompt notification
  const triggerSingleNotification = useCallback(() => {
    if (!currentUserProfile) return false;

    // Pick a candidate (habit or task)
    // Give 65% weight to uncompleted habits, 35% weight to tasks
    const hasHabits = activeUncompletedHabits.length > 0;
    const hasTasks = pendingTasks.length > 0;

    if (!hasHabits && !hasTasks) {
      return false;
    }

    let itemChosen: { type: 'habit' | 'task'; id: string; title: string; icon: string; category?: string } | null = null;

    if (hasHabits && hasTasks) {
      const isHabit = Math.random() < 0.65;
      if (isHabit) {
        // filter out already notified in this screen session if possible
        const candidates = activeUncompletedHabits.filter(h => !alreadyNotifiedIds.includes(`h_${h.id}`));
        const targetList = candidates.length > 0 ? candidates : activeUncompletedHabits;
        const randomHabit = targetList[Math.floor(Math.random() * targetList.length)];
        itemChosen = { type: 'habit', id: `h_${randomHabit.id}`, title: randomHabit.title, icon: randomHabit.icon, category: randomHabit.tag };
      } else {
        const candidates = pendingTasks.filter(t => !alreadyNotifiedIds.includes(`t_${t.id}`));
        const targetList = candidates.length > 0 ? candidates : pendingTasks;
        const randomTask = targetList[Math.floor(Math.random() * targetList.length)];
        itemChosen = { type: 'task', id: `t_${randomTask.id}`, title: randomTask.title, icon: randomTask.icon };
      }
    } else if (hasHabits) {
      const candidates = activeUncompletedHabits.filter(h => !alreadyNotifiedIds.includes(`h_${h.id}`));
      const targetList = candidates.length > 0 ? candidates : activeUncompletedHabits;
      const randomHabit = targetList[Math.floor(Math.random() * targetList.length)];
      itemChosen = { type: 'habit', id: `h_${randomHabit.id}`, title: randomHabit.title, icon: randomHabit.icon, category: randomHabit.tag };
    } else if (hasTasks) {
      const candidates = pendingTasks.filter(t => !alreadyNotifiedIds.includes(`t_${t.id}`));
      const targetList = candidates.length > 0 ? candidates : pendingTasks;
      const randomTask = targetList[Math.floor(Math.random() * targetList.length)];
      itemChosen = { type: 'task', id: `t_${randomTask.id}`, title: randomTask.title, icon: randomTask.icon };
    }

    if (!itemChosen) return false;

    // Build creative message
    let finalMessage = '';
    let finalIcon = itemChosen.icon;

    if (itemChosen.type === 'habit') {
      const templates = CATEGORY_REMINDERS[itemChosen.category || ''] || DEFAULT_REMINDERS;
      const template = templates[Math.floor(Math.random() * templates.length)];
      finalMessage = template.replace('%title%', itemChosen.title);
    } else {
      // Task close due
      finalMessage = `⌛ Tarefa Pendente: Não se esqueça de realizar "${itemChosen.title}" antes do final do dia hoje!`;
      finalIcon = '📅';
    }

    // Push!
    onPushNotification(currentUserProfile.uid, finalIcon, finalMessage);
    
    // Play subtle chime
    playCompletionSound();

    // Prevent immediate duplication
    setAlreadyNotifiedIds(prev => [...prev, itemChosen!.id]);
    setLastNotificationTime(Date.now());

    // Record on historical logs optionally to enrich the app!
    if (onRecordFeedEvent) {
      onRecordFeedEvent('mood_changed', `Sintonia AI ⚡: Enviou lembrete para ${currentUserProfile.name}`, `"${itemChosen.title}"`);
    }

    return true;
  }, [activeUncompletedHabits, pendingTasks, alreadyNotifiedIds, currentUserProfile, onPushNotification, onRecordFeedEvent]);

  // Fast manual notification bypass trigger for user exploration
  const handleSimulateInstant = () => {
    performVibe();
    const ok = triggerSingleNotification();
    if (!ok) {
      // Reset alreadyNotifiedIds list to give them more notifications!
      setAlreadyNotifiedIds([]);
      setTimeout(() => {
        const backupOk = triggerSingleNotification();
        if (!backupOk) {
          onPushNotification(
            currentUserProfile?.uid || 'guest', 
            '🕊️', 
            'Sintonia AI: Toda a sua rotina de hábitos e deveres já está concluída para hoje! Parabéns! 🎉'
          );
          playCompletionSound();
        }
      }, 100);
    }
  };

  // Main Background Dispatch Timer loop
  useEffect(() => {
    if (!isActive || !currentUserProfile) return;

    // If in fast simulation mode: check every 45 seconds
    // If in safe normal mode: check every 15 minutes (900 seconds)
    const tickIntervalSecs = fastSimulation ? 45 : 900;
    
    const intervalRef = setInterval(() => {
      // Check the items
      triggerSingleNotification();
    }, tickIntervalSecs * 1000);

    return () => clearInterval(intervalRef);
  }, [isActive, fastSimulation, triggerSingleNotification, currentUserProfile]);

  // Quick second counter for Fast Mode visual animation
  useEffect(() => {
    if (!isActive || !fastSimulation) {
      setCounterSeconds(0);
      return;
    }
    const updateTick = setInterval(() => {
      setCounterSeconds(prev => (prev >= 44 ? 0 : prev + 1));
    }, 1000);
    return () => clearInterval(updateTick);
  }, [isActive, fastSimulation]);

  if (!currentUserProfile) return null;

  return (
    <div className="bg-[#0b0f19]/45 border border-indigo-500/15 rounded-xl p-2.5 shadow-sm backdrop-blur-sm relative overflow-hidden select-none hover:border-indigo-500/25 transition-all">
      {/* Decorative subtle ambient soft glow */}
      <div className={`absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl pointer-events-none transition-all duration-1000 ${isActive ? 'scale-115 opacity-100' : 'scale-75 opacity-10'}`}></div>

      {/* Primary horizontal row layout with high density */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 relative z-10">
        
        {/* Left Side: Custom header, status indicator and brief tagline details */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
          </div>
          
          <div className="text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 font-sans block leading-none">
              Coach AI Sintonia
            </span>
            <span className="text-[9px] text-[#7e859c] font-sans leading-none block mt-0.5">
              Gera lembretes diários de {activeUncompletedHabits.length} hábitos e {pendingTasks.length} deveres
            </span>
          </div>
        </div>

        {/* Right Side: Micro Statistics & Interactive Action triggers */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          
          {/* Dynamic Smart density metrics */}
          <div className="flex gap-1.5 text-[8.5px] font-mono select-none">
            <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-white/5 text-teal-300 font-extrabold flex items-center gap-1" title="Intervalo calculado sugerido entre lembretes">
              ⏱️ {calculatedDensity.intervalMinutes}m
            </span>
            <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-white/5 text-rose-300 font-extrabold flex items-center gap-1" title="Instâncias pendentes para concluir hoje">
              🚨 {activeUncompletedHabits.length + pendingTasks.length} descasados
            </span>
          </div>

          <div className="h-4.5 w-[1px] bg-white/5 hidden sm:block shrink-0" />

          {/* Inline miniature state selectors */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => { performVibe(); setIsActive(!isActive); }}
              className={`px-2 py-0.5 text-[8.5px] font-black rounded uppercase cursor-pointer transition-all border-0 ${
                isActive 
                  ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' 
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
              title={isActive ? 'Pausar ciclo de lembretes automáticos' : 'Ativar monitor inteligente em segundo plano'}
            >
              {isActive ? 'Ativo' : 'Pausado'}
            </button>

            <button
              onClick={handleSimulateInstant}
              disabled={!isActive}
              className="py-0.5 px-2 bg-gradient-to-r from-indigo-500 to-teal-500 active:scale-95 hover:opacity-90 disabled:opacity-30 text-white border-0 rounded text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shadow-sm"
              title="Disparar um lembrete aleatório inteligente de demonstração agora"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              Testar
            </button>
          </div>

        </div>
      </div>

      {/* Thin expandable simulator parameters overlay */}
      <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[8px] text-zinc-500 select-none">
        
        {/* Toggle option for immediate developers test loop */}
        <label className="flex items-center gap-1 cursor-pointer hover:text-zinc-400 transition-colors">
          <input
            type="checkbox"
            checked={fastSimulation}
            onChange={() => { performVibe(); setFastSimulation(!fastSimulation); }}
            className="w-3 h-3 accent-indigo-500 cursor-pointer rounded bg-transparent border border-white/10"
          />
          <span className="font-sans font-bold">Modo Simulação Rápida (45s)</span>
          {fastSimulation && isActive && (
            <span className="text-[7.5px] text-indigo-400 font-mono animate-pulse bg-indigo-500/10 px-1 rounded-sm ml-1">
              Próximo em {45 - counterSeconds}s
            </span>
          )}
        </label>

        {/* Dynamic Coach state summary label */}
        <span className="italic self-end opacity-70">
          Sincronia {calculatedDensity.rate} r/h: {calculatedDensity.label}
        </span>
      </div>
    </div>
  );
};

export default LiveSmartNotificationEngine;
