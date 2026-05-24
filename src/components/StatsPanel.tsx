import { memo, useMemo, useState } from 'react';
import { 
  Award, 
  Flame, 
  TrendingUp, 
  Heart, 
  Sparkles, 
  CheckCircle2, 
  User, 
  Zap, 
  Hourglass,
  Calendar,
  Layers,
  BarChart3,
  ThumbsUp,
  Lock,
  Unlock,
  Filter,
  Check,
  Star,
  Gift,
  Compass
} from 'lucide-react';
import { Habit, Task, UserProfile, Couple, RewardStoreItem } from '../types';
import { getToday, calculateStreak, formatLocalYMD } from '../utils/dateHelpers';

interface StatsPanelProps {
  habits: Habit[];
  tasks: Task[];
  currentUserProfile: UserProfile;
  partnerProfile: UserProfile | null;
  couple: Couple | null;
  names: { [key: string]: string };
  rewards?: RewardStoreItem[];
}

export const StatsPanel = memo(({
  habits = [],
  tasks = [],
  currentUserProfile,
  partnerProfile,
  couple,
  names,
  rewards = []
}: StatsPanelProps) => {

  const partnerName = useMemo(() => {
    if (!partnerProfile) return 'Parceiro(a)';
    return partnerProfile.name || 'Parceiro(a)';
  }, [partnerProfile]);

  const todayStr = useMemo(() => getToday(), []);

  // Filter state for Achievements
  const [selectedRarity, setSelectedRarity] = useState<'tudo' | 'comum' | 'raro' | 'epico' | 'lendario'>('tudo');

  // 1. Overall Daily Synergy Percentage (pooled together)
  const dailySynergy = useMemo(() => {
    // Habits checked today
    const activeToday = habits.filter(h => {
      return h.assignedTo === 'both' || h.assignedTo === currentUserProfile.uid || h.assignedTo === partnerProfile?.uid;
    });

    if (activeToday.length === 0) return 0;

    let possibleTargetPoints = 0;
    let accomplishedPoints = 0;

    activeToday.forEach(h => {
      const assigned = h.assignedTo;
      const completeByMe = !!h.completedBy?.[todayStr]?.[currentUserProfile.uid];
      const completeByPartner = partnerProfile ? !!h.completedBy?.[todayStr]?.[partnerProfile.uid] : false;

      if (assigned === 'both') {
        possibleTargetPoints += 2;
        if (completeByMe) accomplishedPoints += 1;
        if (completeByPartner) accomplishedPoints += 1;
      } else if (assigned === currentUserProfile.uid) {
        possibleTargetPoints += 1;
        if (completeByMe) accomplishedPoints += 1;
      } else if (partnerProfile && assigned === partnerProfile.uid) {
        possibleTargetPoints += 1;
        if (completeByPartner) accomplishedPoints += 1;
      }
    });

    if (possibleTargetPoints === 0) return 0;
    return Math.round((accomplishedPoints / possibleTargetPoints) * 100);
  }, [habits, todayStr, currentUserProfile, partnerProfile]);

  // Messages based on Synergy
  const synergyMessage = useMemo(() => {
    if (dailySynergy === 100) return { title: 'Sintonia Extrema! 👑', desc: 'Vocês completaram absolutamente tudo hoje! Sintonia divina.' };
    if (dailySynergy >= 75) return { title: 'Quase lá! 🔥', desc: 'Sua cooperação amorosa está brilhando forte hoje!' };
    if (dailySynergy >= 40) return { title: 'No caminho certo! 💞', desc: 'Continuem dividindo tarefas para atingir o ápice.' };
    if (dailySynergy > 0) return { title: 'Primeiros Passos 🐾', desc: 'Ótimo começo! Conclua mais hábitos para subir a sintonia.' };
    return { title: 'Sementinha do Dia 🌱', desc: 'Que tal marcar o primeiro hábito ou dever juntos hoje?' };
  }, [dailySynergy]);

  // 2. Productivity metrics per category (All time completions)
  const categoryStats = useMemo(() => {
    const categoriesList = ['amor', 'comunicação', 'espiritual', 'saúde', 'relacionamento'];
    const statsMap: { [key: string]: { me: number; partner: number; total: number } } = {};
    
    categoriesList.forEach(cat => {
      statsMap[cat] = { me: 0, partner: 0, total: 0 };
    });

    habits.forEach(h => {
      const parentTag = (h.tag || 'relacionamento').toLowerCase();
      const currentTag = categoriesList.includes(parentTag) ? parentTag : 'relacionamento';
      
      if (h.completedBy) {
        Object.values(h.completedBy).forEach(uids => {
          if (uids[currentUserProfile.uid]) {
            statsMap[currentTag].me += 1;
            statsMap[currentTag].total += 1;
          }
          if (partnerProfile && uids[partnerProfile.uid]) {
            statsMap[currentTag].partner += 1;
            statsMap[currentTag].total += 1;
          }
        });
      }
    });

    return statsMap;
  }, [habits, currentUserProfile, partnerProfile]);

  // Max value of category for styling percent comparison
  const maxCategoryCount = useMemo(() => {
    const vals = Object.values(categoryStats).map((s: any) => s.total);
    const max = Math.max(...vals, 1);
    return max;
  }, [categoryStats]);

  // 3. Last 7 Days Habit completions timeline
  const lastSevenDaysStats = useMemo(() => {
    const list: { label: string; dateStr: string; me: number; partner: number; total: number }[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      const key = formatLocalYMD(d);

      let meCount = 0;
      let partnerCount = 0;

      habits.forEach(h => {
        if (h.completedBy?.[key]?.[currentUserProfile.uid]) meCount++;
        if (partnerProfile && h.completedBy?.[key]?.[partnerProfile.uid]) partnerCount++;
      });

      list.push({
        label: dayName.toUpperCase(),
        dateStr: key,
        me: meCount,
        partner: partnerCount,
        total: meCount + partnerCount
      });
    }

    return list;
  }, [habits, currentUserProfile, partnerProfile]);

  // Find max activity for past 7 days scale representation
  const maxPastDaysMax = useMemo(() => {
    return Math.max(...lastSevenDaysStats.map(d => d.total), 1);
  }, [lastSevenDaysStats]);

  // 4. Tasks completed statistics
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const incomplete = total - completed;

    // Breakdown
    const myTasks = tasks.filter(t => t.assignedTo === currentUserProfile.uid);
    const myCompleted = myTasks.filter(t => t.completed).length;

    const partnerTasks = partnerProfile ? tasks.filter(t => t.assignedTo === partnerProfile.uid) : [];
    const partnerCompleted = partnerTasks.filter(t => t.completed).length;

    const mutualTasks = tasks.filter(t => t.assignedTo === 'both');
    const mutualCompleted = mutualTasks.filter(t => t.completed).length;

    return {
      total,
      completed,
      incomplete,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      myTotal: myTasks.length,
      myCompleted,
      partnerTotal: partnerTasks.length,
      partnerCompleted,
      mutualTotal: mutualTasks.length,
      mutualCompleted
    };
  }, [tasks, currentUserProfile, partnerProfile]);

  // 5. Relationship age & variables calculations
  const anniversaryDate = couple?.anniversaryDate || couple?.settings?.anniversaryDate || '';
  const relationshipDuration = useMemo(() => {
    if (!anniversaryDate) return null;
    try {
      const start = new Date(anniversaryDate + 'T12:00:00');
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const diffTime = today.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return isNaN(diffDays) ? null : diffDays;
    } catch (e) {
      return null;
    }
  }, [anniversaryDate]);

  // Love Pass - Couple combined progress calculations
  const myLevel = currentUserProfile.level || 1;
  const partnerLevel = partnerProfile ? (partnerProfile.level || 1) : 1;
  const coupleLevelProgress = myLevel + partnerLevel;

  const milestones = useMemo(() => {
    return [
      { level: 2, name: 'Beijo Apaixonado 💋', desc: 'Dizer bom dia com um selinho carinhoso de 5 segs.' },
      { level: 4, name: 'Tarde de Romance 🍿', desc: 'Sessão caseira com pipoca e cafuné sem pressa.' },
      { level: 6, name: 'SPA Sincronizado 💆', desc: 'Privilégio de massagem relaxante nas costas de 30 minutos.' },
      { level: 8, name: 'Jantar Gourmet 🍷', desc: 'Desbloqueia resgates e mimos afetivos duplos no restaurante.' },
      { level: 10, name: 'Fuga Romântica VIP ✈️', desc: 'Viagem incrível ou bate-volta no chalé especial a dois!' }
    ];
  }, []);

  // 6. Upgraded achievements list (16 options, categorized by difficulty/rarity)
  const achievements = useMemo(() => {
    const totalHabitsEver = habits.length;
    
    let allTimeHabitCompletions = 0;
    
    // Calculate total completions ever
    habits.forEach(h => {
      if (h.completedBy) {
        Object.values(h.completedBy).forEach(userMap => {
          if (userMap[currentUserProfile.uid]) allTimeHabitCompletions++;
          if (partnerProfile && userMap[partnerProfile.uid]) allTimeHabitCompletions++;
        });
      }
    });

    const hasCouplePhoto = !!couple?.couplePhoto;

    // Calculate maximum habit streak
    let maxHabitStreak = 0;
    habits.forEach(h => {
      if (h.completedBy) {
        const datesMe = Object.keys(h.completedBy).filter(d => h.completedBy[d][currentUserProfile.uid]);
        const streakMe = calculateStreak(datesMe, h.frequency || { type: 'daily' });
        if (streakMe > maxHabitStreak) maxHabitStreak = streakMe;

        if (partnerProfile) {
          const datesPartner = Object.keys(h.completedBy).filter(d => h.completedBy[d][partnerProfile.uid]);
          const streakPartner = calculateStreak(datesPartner, h.frequency || { type: 'daily' });
          if (streakPartner > maxHabitStreak) maxHabitStreak = streakPartner;
        }
      }
    });

    // Unlocked achievements from affective store
    const unlockedRewardsCount = rewards ? rewards.filter(r => r.unlockedAt).length : 0;

    return [
      // 🟢 COMUM (5 Achievements)
      {
        id: 'ach_1',
        title: 'Casal Iniciante',
        icon: '🌱',
        rarity: 'comum' as const,
        desc: 'Adicionaram o primeiro hábito ao painel do HabitFlow.',
        current: totalHabitsEver,
        target: 1,
        met: totalHabitsEver >= 1
      },
      {
        id: 'ach_2',
        title: 'Álbum Selado',
        icon: '📸',
        rarity: 'comum' as const,
        desc: 'Configuraram e enviaram uma linda foto oficial de casal.',
        current: hasCouplePhoto ? 1 : 0,
        target: 1,
        met: hasCouplePhoto
      },
      {
        id: 'ach_3',
        title: 'Pequenos Passos',
        icon: '👟',
        rarity: 'comum' as const,
        desc: 'Alcançaram 10 conclusões de rotinas acumuladas no total.',
        current: allTimeHabitCompletions,
        target: 10,
        met: allTimeHabitCompletions >= 10
      },
      {
        id: 'ach_4',
        title: 'Primeiro Dever',
        icon: '📋',
        rarity: 'comum' as const,
        desc: 'Executaram o primeiro dever ou obrigação conjunta do casal.',
        current: taskStats.completed,
        target: 1,
        met: taskStats.completed >= 1
      },
      {
        id: 'ach_5',
        title: 'Complicidade Diária',
        icon: '💬',
        rarity: 'comum' as const,
        desc: 'Concluíram juntos 3 hábitos na categoria "Comunicação".',
        current: categoryStats['comunicação']?.total || 0,
        target: 3,
        met: (categoryStats['comunicação']?.total || 0) >= 3
      },

      // 🔵 RARO (4 Achievements)
      {
        id: 'ach_6',
        title: 'Amor em Sintonia',
        icon: '⚡',
        rarity: 'raro' as const,
        desc: 'Alcançaram 100% de sintonia diária no painel de hábitos.',
        current: dailySynergy === 100 ? 1 : 0,
        target: 1,
        met: dailySynergy === 100
      },
      {
        id: 'ach_7',
        title: 'Alma Fortalecida',
        icon: '🙏',
        rarity: 'raro' as const,
        desc: 'Sincronizaram 15 orações ou rotinas na categoria "Espiritual".',
        current: categoryStats['espiritual']?.total || 0,
        target: 15,
        met: (categoryStats['espiritual']?.total || 0) >= 15
      },
      {
        id: 'ach_8',
        title: 'Engenheiros do Lar',
        icon: '🧹',
        rarity: 'raro' as const,
        desc: 'Concluíram 10 deveres e tarefas da lista juntos.',
        current: taskStats.completed,
        target: 10,
        met: taskStats.completed >= 10
      },
      {
        id: 'ach_9',
        title: 'Chama Viva',
        icon: '🔥',
        rarity: 'raro' as const,
        desc: 'Alcançaram uma sequência (streak) de 5 dias em qualquer hábito.',
        current: maxHabitStreak,
        target: 5,
        met: maxHabitStreak >= 5
      },

      // 🟣 ÉPICO (3 Achievements)
      {
        id: 'ach_10',
        title: 'Conexão Inabalável',
        icon: '🧱',
        rarity: 'epico' as const,
        desc: 'Alcançaram a incrível marca de 55 rotinas acumuladas no total.',
        current: allTimeHabitCompletions,
        target: 55,
        met: allTimeHabitCompletions >= 55
      },
      {
        id: 'ach_11',
        title: 'Soberania Mútua',
        icon: '🤝',
        rarity: 'epico' as const,
        desc: 'Completaram 8 obrigações mútuas compartilhadas (Atribuídas aos Dois).',
        current: taskStats.mutualCompleted,
        target: 8,
        met: taskStats.mutualCompleted >= 8
      },
      {
        id: 'ach_12',
        title: 'Marcadores de Tempo',
        icon: '⏳',
        rarity: 'epico' as const,
        desc: 'Definiram a data oficial de aniversário do casal e acumularam 30 dias juntos.',
        current: relationshipDuration || 0,
        target: 30,
        met: relationshipDuration !== null && relationshipDuration >= 30
      },

      // 🟡 LENDÁRIO (4 Achievements - EXTREMAMENTE DIFÍCEIS)
      {
        id: 'ach_13',
        title: 'Fidelidade Absoluta',
        icon: '👑',
        rarity: 'lendario' as const,
        desc: 'Chama Eterna: Atinjam 15 dias seguidos em um hábito ativo de casal.',
        current: maxHabitStreak,
        target: 15,
        met: maxHabitStreak >= 15
      },
      {
        id: 'ach_14',
        title: 'Aniversário de Safira',
        icon: '💎',
        rarity: 'lendario' as const,
        desc: 'Registraram 365 dias de amor, cumplicidade e união desde o início de tudo.',
        current: relationshipDuration || 0,
        target: 365,
        met: relationshipDuration !== null && relationshipDuration >= 365
      },
      {
        id: 'ach_15',
        title: 'Império da Cooperação',
        icon: '🏛️',
        rarity: 'lendario' as const,
        desc: 'Inigualáveis! Concluíram 150 hábitos ou rotinas somados de todo tempo.',
        current: allTimeHabitCompletions,
        target: 150,
        met: allTimeHabitCompletions >= 150
      },
      {
        id: 'ach_16',
        title: 'Reis da Loja de Afetos',
        icon: '🎁',
        rarity: 'lendario' as const,
        desc: 'Filantropos do carinho: Desbloquearam e presentearam 10 mimos de afeto.',
        current: unlockedRewardsCount,
        target: 10,
        met: unlockedRewardsCount >= 10
      }
    ];
  }, [habits, couple, dailySynergy, categoryStats, taskStats, rewards, currentUserProfile, partnerProfile]);

  // Filter achievements based on selected level
  const filteredAchievements = useMemo(() => {
    if (selectedRarity === 'tudo') return achievements;
    return achievements.filter(ach => ach.rarity === selectedRarity);
  }, [achievements, selectedRarity]);

  // Rarity Stats calculation for filter buttons indicators
  const rarityCounts = useMemo(() => {
    return {
      tudo: achievements.length,
      comum: achievements.filter(a => a.rarity === 'comum').length,
      raro: achievements.filter(a => a.rarity === 'raro').length,
      epico: achievements.filter(a => a.rarity === 'epico').length,
      lendario: achievements.filter(a => a.rarity === 'lendario').length,
    };
  }, [achievements]);

  return (
    <div className="space-y-4 font-sans text-left">
      
      {/* 1. Header with Stats Summary Title */}
      <div className="flex justify-between items-center px-1 select-none">
        <div>
          <h2 className="text-lg font-black text-primary leading-none flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-pink-400" />
            Central de Estatísticas
          </h2>
          <span className="text-[10px] text-zinc-500">Métricas reais, gamificação e conquistas a dois</span>
        </div>
        
        <span className="bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/35 px-2 py-1 rounded-xl text-[10px] font-extrabold text-pink-400 flex items-center gap-1.5 shadow-sm">
          <Zap className="w-3.5 h-3.5 animate-bounce fill-current" />
          Nível {coupleLevelProgress} Harmonia
        </span>
      </div>

      {/* NEW: 2. Love Pass / Passe de Conexão (Modern App Level Gamification) */}
      <div className="bg-gradient-to-r from-indigo-950/70 via-rose-950/20 to-slate-950/70 border border-pink-500/15 p-4 rounded-3xl space-y-3.5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full blur-xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between select-none">
          <div className="flex items-center gap-1.5">
            <Compass className="w-4.5 h-4.5 text-pink-400 animate-spin-slow" />
            <h3 className="text-xs font-black uppercase tracking-wider text-pink-300">Passe de Conexão Amorosa 💖</h3>
          </div>
          <span className="text-[9px] text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-widest font-mono">
            Love Pass
          </span>
        </div>

        <p className="text-[10px] text-zinc-400 leading-normal">
          Subam de nível completando rotinas e obrigações diárias para desbloquearem lindos privilégios e mimos adicionais para o relacionamento!
        </p>

        {/* Path of checkpoints */}
        <div className="pt-2 pb-1 space-y-3">
          {/* Main stepper bar container */}
          <div className="relative w-full h-1.5 bg-slate-900 rounded-full border border-white/5">
            {/* Progress bar fill */}
            <div 
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-indigo-500 via-pink-500 to-rose-500 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(100, (coupleLevelProgress / 10) * 100)}%` }}
            />
            
            {/* Step badges */}
            <div className="absolute inset-x-0 -top-1.5 flex justify-between select-none">
              {[2, 4, 6, 8, 10].map((lvl) => {
                const isReached = coupleLevelProgress >= lvl;
                return (
                  <div key={lvl} className="flex flex-col items-center relative group">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center border font-mono text-[8px] font-black transition-all ${
                      isReached 
                        ? 'bg-pink-500 border-pink-300 text-white shadow-glow' 
                        : 'bg-zinc-950 border-zinc-700 text-zinc-500'
                    }`}>
                      {isReached ? '✓' : lvl}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stepper text label/description */}
          <div className="grid grid-cols-5 text-center gap-1 select-none">
            {[2, 4, 6, 8, 10].map((lvl) => {
              const isReached = coupleLevelProgress >= lvl;
              return (
                <div key={lvl} className="space-y-0.5">
                  <span className={`text-[8px] block font-black leading-none ${isReached ? 'text-pink-300' : 'text-zinc-600'}`}>
                    Nível {lvl}
                  </span>
                  <span className={`text-[7.5px] block font-medium leading-tight text-ellipsis overflow-hidden whitespace-nowrap px-0.5 ${isReached ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    {lvl === 2 ? 'Beijo 💋' : lvl === 4 ? 'Romance 🍿' : lvl === 6 ? 'SPA 💆' : lvl === 8 ? 'Jantar 🍷' : 'Viagem ✈️'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic active status box */}
        <div className="p-2.5 bg-slate-900/60 rounded-2xl border border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-xl select-none animate-pulse">🎁</span>
            <div>
              <span className="text-[9px] uppercase font-black tracking-widest text-zinc-500">Milestone Atual</span>
              <p className="text-zinc-300 font-bold leading-normal text-[10px]">
                {coupleLevelProgress >= 10 
                  ? 'Parabéns! Vocês atingiram o ápice: Almas Gêmeas Lendárias! 👑' 
                  : `Próximo prêmio no Nível ${milestones.find(m => !m.unlocked)?.level || 10}: ${milestones.find(m => !m.unlocked)?.name || ''}`
                }
              </p>
            </div>
          </div>
          <span className="text-[9px] text-pink-400 font-extrabold px-2 py-0.5 bg-pink-500/10 rounded-lg border border-pink-500/20">
            Nív. {coupleLevelProgress} / 10
          </span>
        </div>
      </div>

      {/* 3. Interactive synergy meter visual */}
      <div className="bg-gradient-to-br from-[#0f172a]/95 via-slate-900/40 to-[#070b13]/95 border border-primary/20 rounded-3xl p-5 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-28 h-28 bg-pink-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10">
          
          {/* Circular progress wheel inside customized styling */}
          <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="46"
                className="stroke-zinc-800"
                strokeWidth="7"
                fill="transparent"
              />
              <circle
                cx="56"
                cy="56"
                r="46"
                className="stroke-pink-500 transition-all duration-1000 ease-out"
                strokeWidth="7"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 46}
                strokeDashoffset={2 * Math.PI * 46 * (1 - dailySynergy / 100)}
                strokeLinecap="round"
              />
            </svg>

            {/* Percent Text Node */}
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black font-serif text-white leading-none">
                {dailySynergy}%
              </span>
              <span className="text-[8px] text-zinc-500 font-bold tracking-widest uppercase mt-0.5">Sintonia</span>
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-sm font-black text-pink-300 uppercase tracking-wide flex items-center justify-center sm:justify-start gap-1 font-serif">
              {synergyMessage.title}
            </h3>
            <p className="text-zinc-300 text-xs mt-1 leading-relaxed">
              {synergyMessage.desc}
            </p>

            <div className="mt-3.5 bg-slate-950/50 p-2 border border-white/5 rounded-2xl grid grid-cols-2 gap-2 text-center text-xs">
              <div>
                <span className="text-[8.5px] uppercase tracking-wider text-zinc-500 block font-bold">XP de {currentUserProfile.name}</span>
                <strong className="text-xs text-amber-500 font-mono font-black">{currentUserProfile.xp || 10} XP</strong>
              </div>
              <div className="border-l border-white/5">
                <span className="text-[8.5px] uppercase tracking-wider text-zinc-500 block font-bold">XP de {partnerName}</span>
                <strong className="text-xs text-indigo-400 font-mono font-black">{partnerProfile?.xp || 0} XP</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Horizontal layout comparison table 7 days history */}
      <div className="bg-card p-4 rounded-3xl border border-primary/20 space-y-3 shadow-md">
        <div className="flex items-center justify-between select-none">
          <div className="flex items-center gap-1.5 text-primary">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wide leading-none">Consistência Compartilhada (7 dias)</h3>
          </div>
          <span className="text-[9px] text-zinc-500">Total de check-ins</span>
        </div>

        {/* 7-Day Chart representation using pure beautifully styled Tailwind components */}
        <div className="grid grid-cols-7 gap-1.5 pt-2">
          {lastSevenDaysStats.map((item, index) => {
            const barHeight = item.total > 0 ? (item.total / maxPastDaysMax) * 100 : 0;
            const isTodayIndex = index === 6;

            return (
              <div key={item.dateStr} className="flex flex-col items-center">
                
                {/* Visual tooltip style values on top */}
                <span className="text-[8.5px] font-bold text-zinc-400 mb-1 leading-none font-mono">
                  {item.total}
                </span>

                {/* Column wrapper area with size constraint */}
                <div className="w-full h-24 bg-slate-950/40 rounded-xl relative overflow-hidden flex flex-col justify-end p-0.5 border border-white/5">
                  
                  {/* Me portion of the completion bar */}
                  {item.me > 0 && (
                    <div 
                      className={`w-full rounded-t-sm bg-pink-500/80 transition-all duration-700`}
                      style={{ height: `${(item.me / maxPastDaysMax) * 50}%` }}
                      title={`Você fez ${item.me}`}
                    />
                  )}

                  {/* Partner portion of the completion bar */}
                  {item.partner > 0 && (
                    <div 
                      className={`w-full rounded-b-sm bg-indigo-500/80 transition-all duration-700`}
                      style={{ height: `${(item.partner / maxPastDaysMax) * 50}%` }}
                      title={`${partnerName} fez ${item.partner}`}
                    />
                  )}

                  {/* Empty state fill if total is zero */}
                  {item.total === 0 && (
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-zinc-800/20" />
                  )}
                </div>

                <span className={`text-[8.5px] font-black tracking-tighter mt-1.5 ${isTodayIndex ? 'text-pink-400 font-extrabold' : 'text-zinc-500'}`}>
                  {isTodayIndex ? 'HOJE' : item.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Label Legend detail rows */}
        <div className="flex gap-4 justify-center text-[9px] font-sans text-zinc-500 pt-1 select-none">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2 rounded bg-pink-500" />
            Hábitos Seus
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2 rounded bg-indigo-500" />
            Hábitos de {partnerName}
          </span>
        </div>
      </div>

      {/* Grid of details: Tasks Summary & Category focus */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* 5. Category breakdown card */}
        <div className="bg-card p-4 rounded-3xl border border-primary/20 space-y-3.5 shadow-md">
          <div className="flex items-center justify-between border-b border-primary/10 pb-2 select-none">
            <div className="flex items-center gap-1.5 text-primary">
              <Layers className="w-4 h-4 text-pink-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider leading-none">Foco de Dedicação</h3>
            </div>
            <span className="text-[9px] text-zinc-500">Histórico de Conclusões</span>
          </div>

          <div className="space-y-3 pt-1">
            {[
              { id: 'amor', label: 'Amor & Afeto', emoji: '💖', color: 'bg-pink-500' },
              { id: 'comunicação', label: 'Comunicação', emoji: '💬', color: 'bg-sky-500' },
              { id: 'espiritual', label: 'Vida Espiritual', emoji: '🙏', color: 'bg-indigo-500' },
              { id: 'saúde', label: 'Saúde & Rotina', emoji: '🥦', color: 'bg-emerald-500' },
              { id: 'relacionamento', label: 'Parceria', emoji: '💑', color: 'bg-amber-500' }
            ].map(cat => {
              const statistics = categoryStats[cat.id] || { me: 0, partner: 0, total: 0 };
              
              const scalePercent = maxCategoryCount > 0 ? (statistics.total / maxCategoryCount) * 100 : 0;

              return (
                <div key={cat.id} className="space-y-1 text-left">
                  <div className="flex justify-between items-center text-[10px] font-sans">
                    <span className="text-zinc-300 font-medium flex items-center gap-1">
                      <span className="text-xs">{cat.emoji}</span>
                      {cat.label}
                    </span>
                    <strong className="text-primary font-mono">{statistics.total}x concluído</strong>
                  </div>

                  <div className="w-full h-2 bg-slate-950/40 rounded-full overflow-hidden flex">
                    <div 
                      className={`h-full ${cat.color} brightness-110`} 
                      style={{ width: `${statistics.total > 0 ? (statistics.me / statistics.total) * scalePercent : 0}%` }}
                      title={`Você fez: ${statistics.me}`}
                    />
                    <div 
                      className={`h-full ${cat.color} opacity-45`} 
                      style={{ width: `${statistics.total > 0 ? (statistics.partner / statistics.total) * scalePercent : 0}%` }}
                      title={`${partnerName} fez: ${statistics.partner}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. Checklists & Tasks Progress panel */}
        <div className="bg-card p-4 rounded-3xl border border-primary/20 space-y-3.5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-primary/10 pb-2 select-none">
              <div className="flex items-center gap-1.5 text-primary">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider leading-none">Obrigações Gerais</h3>
              </div>
              <span className="text-[9px] text-zinc-500">Tarefas Realizadas</span>
            </div>

            <div className="space-y-3.5 pt-3">
              
              <div className="space-y-1 text-left">
                <div className="flex justify-between text-[10px] font-sans">
                  <span className="text-zinc-300 font-bold">Taxa total de Sucesso de Deveres:</span>
                  <span className="text-emerald-400 font-extrabold">{taskStats.percent}%</span>
                </div>
                <div className="h-2 w-full bg-slate-950/40 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-1000"
                    style={{ width: `${taskStats.percent}%` }}
                  />
                </div>
              </div>

              {/* Dynamic summary breakdown rows */}
              <div className="space-y-2 pt-1 font-sans text-xs">
                <div className="flex justify-between items-center text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Responsabilidades Suas cumpridas:
                  </span>
                  <strong className="text-primary font-mono">{taskStats.myCompleted}/{taskStats.myTotal}</strong>
                </div>

                <div className="flex justify-between items-center text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    Obrigações de {partnerName} concluídas:
                  </span>
                  <strong className="text-primary font-mono">{taskStats.partnerCompleted}/{taskStats.partnerTotal}</strong>
                </div>

                <div className="flex justify-between items-center text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                    Cooperação Mútua unificada:
                  </span>
                  <strong className="text-primary font-mono">{taskStats.mutualCompleted}/{taskStats.mutualTotal}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/50 p-2.5 border border-white/5 rounded-2xl text-[10px] text-zinc-400 text-center leading-relaxed mt-2 select-none">
            🏡 **Como funciona**: Completar deveres ajuda a manter as tarefas domésticas ou rotinas em ordem, fortalecendo a harmonia do casal!
          </div>
        </div>
      </div>

      {/* UPGRADED 7. Achievements Badge Wall with rarity filter and progress status */}
      <div className="bg-card p-4 rounded-3xl border border-primary/20 space-y-4 shadow-md font-sans">
        
        {/* Achievements header */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between border-b border-primary/10 pb-3">
          <div className="flex items-center gap-1.5 text-primary select-none">
            <Award className="w-4.5 h-4.5 text-pink-400 animate-pulse animate-duration-1000" />
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider leading-none">Mural de Conquistas Juntos 🏆</h3>
              <span className="text-[9px] text-zinc-400 block mt-0.5 font-serif">Rotinas concluídas e marcos do amor</span>
            </div>
          </div>
          
          {/* Progress fraction badge */}
          <span className="self-start sm:self-center text-[10px] bg-pink-500/10 text-pink-300 font-extrabold px-3 py-1 rounded-full border border-pink-500/20 shadow-inner flex items-center gap-1">
            <Star className="w-3 h-3 fill-pink-500 text-pink-300" />
            {achievements.filter(ach => ach.met).length} / {achievements.length} Liberados
          </span>
        </div>

        {/* 2. Rarity Filters (Modern Interactive Segmented Control) */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950/40 rounded-2xl border border-white/5 select-none text-xs text-center">
          {[
            { id: 'tudo', label: 'Ver Tudo', count: rarityCounts.tudo, color: 'text-zinc-300 hover:bg-white/5' },
            { id: 'comum', label: 'Comum 🟢', count: rarityCounts.comum, color: 'text-emerald-400 hover:bg-emerald-500/5' },
            { id: 'raro', label: 'Raro 🔵', count: rarityCounts.raro, color: 'text-sky-400 hover:bg-sky-500/5' },
            { id: 'epico', label: 'Épico 🟣', count: rarityCounts.epico, color: 'text-purple-400 hover:bg-purple-500/5' },
            { id: 'lendario', label: 'Lendário ✨', count: rarityCounts.lendario, color: 'text-amber-400 hover:bg-amber-500/5' }
          ].map(rar => (
            <button
              key={rar.id}
              onClick={() => setSelectedRarity(rar.id as any)}
              className={`flex-grow min-w-[65px] py-1.5 px-2 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all border-0 cursor-pointer flex items-center justify-center gap-1 ${
                selectedRarity === rar.id 
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black shadow-md' 
                  : `${rar.color} bg-transparent`
              }`}
            >
              <span>{rar.label.split(' ')[0]}</span>
              <span className="text-[9px] opacity-75">({rar.count})</span>
            </button>
          ))}
        </div>

        {/* List of Dynamic Achievements grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {filteredAchievements.map(ach => {
            const progressPercent = Math.min(100, (ach.current / ach.target) * 100);
            
            // Modern styling based on rarity
            const isLendario = ach.rarity === 'lendario';
            const isEpico = ach.rarity === 'epico';
            const isRaro = ach.rarity === 'raro';
            
            const cardBg = ach.met
              ? isLendario
                ? 'border-amber-500/45 bg-gradient-to-tr from-zinc-950 via-amber-500/5 to-rose-500/5 shadow-amber-500/5'
                : isEpico
                  ? 'border-purple-500/35 bg-gradient-to-tr from-zinc-950 via-purple-500/5 to-pink-500/5'
                  : isRaro
                    ? 'border-sky-500/25 bg-slate-900/40'
                    : 'border-emerald-500/20 bg-emerald-500/5'
              : 'border-zinc-800/60 bg-zinc-950/25 opacity-40 grayscale-[40%] hover:opacity-60 transition-opacity';

            const badgeBorder = ach.met
              ? isLendario
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 select-none shadow-glow text-xl h-10 w-10 shrink-0 animate-pulse'
                : isEpico
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 select-none text-lg h-9 w-9 shrink-0'
                  : isRaro
                    ? 'bg-sky-500/10 border-sky-500/30 text-sky-400 select-none text-lg h-9 w-9 shrink-0'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 select-none text-lg h-9 w-9 shrink-0'
              : 'bg-zinc-900 border-zinc-800 text-zinc-600 h-9 w-9 shrink-0';

            const rarityLabel = isLendario 
              ? 'LENDÁRIO ✨' 
              : isEpico 
                ? 'ÉPICO 🟣' 
                : isRaro 
                  ? 'RARO 🔵' 
                  : 'COMUM 🟢';

            const rarityTextColor = isLendario
              ? 'text-amber-400'
              : isEpico
                ? 'text-purple-400'
                : isRaro
                  ? 'text-sky-400'
                  : 'text-emerald-400';

            return (
              <div 
                key={ach.id} 
                className={`p-3.5 rounded-3xl border transition-all flex flex-col justify-between ${cardBg}`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon Circle */}
                  <div className={`rounded-2xl flex items-center justify-center border font-bold ${badgeBorder}`}>
                    {ach.icon}
                  </div>

                  {/* Context text labels */}
                  <div className="min-w-0 space-y-0.5 flex-1 text-left">
                    <span className={`text-[8px] font-black uppercase tracking-widest ${rarityTextColor}`}>
                      {rarityLabel}
                    </span>
                    <h4 className={`text-xs font-black tracking-tight leading-tighter ${ach.met ? 'text-zinc-100' : 'text-zinc-500'}`}>
                      {ach.title}
                    </h4>
                    <p className="text-[10.5px] text-zinc-400 leading-snug mt-1 text-left">
                      {ach.desc}
                    </p>
                  </div>
                </div>

                {/* Progress bar and details for blocked/in-progress items */}
                <div className="mt-3.5 space-y-1.5 pt-2 border-t border-white/5 font-sans">
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="text-zinc-500 font-bold">Progresso:</span>
                    <strong className="text-zinc-300 font-mono">
                      {ach.current} / {ach.target}
                    </strong>
                  </div>
                  
                  {/* Mini visual indicator progress bar */}
                  <div className="w-full h-1.5 bg-slate-950/50 rounded-full overflow-hidden border border-white/5 relative">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${
                        ach.met 
                          ? isLendario 
                            ? 'bg-gradient-to-r from-amber-400 to-rose-500' 
                            : isEpico 
                              ? 'bg-purple-500' 
                              : isRaro 
                                ? 'bg-sky-500' 
                                : 'bg-emerald-500'
                          : 'bg-zinc-750'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[8px] pt-1 select-none">
                    {ach.met ? (
                      <span className="text-emerald-400 font-black uppercase tracking-wider flex items-center gap-0.5">
                        ✓ Conquistada!
                      </span>
                    ) : (
                      <span className="text-zinc-500 font-medium tracking-tight">
                        Restam {Math.max(0, ach.target - ach.current)} para a glória
                      </span>
                    )}
                    <span className="text-pink-400 font-black text-[9px] uppercase bg-pink-500/5 px-2 py-0.5 rounded border border-pink-500/10">
                      +{isLendario ? '100' : isEpico ? '50' : isRaro ? '30' : '15'} XP
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state when filtering */}
        {filteredAchievements.length === 0 && (
          <div className="p-8 text-center text-zinc-500 bg-slate-950/20 rounded-3xl border border-zinc-900 border-dashed select-none">
            <Award className="w-8 h-8 mx-auto stroke-1 stroke-zinc-700 opacity-60 mb-2" />
            <p className="text-xs font-bold font-sans animate-pulse">Nenhuma conquista selecionada.</p>
            <p className="text-[10px] mt-0.5">Mantenham vivo os hábitos e objetivos conjuntos para liberar!</p>
          </div>
        )}
      </div>
      
    </div>
  );
});

StatsPanel.displayName = 'StatsPanel';
export default StatsPanel;
