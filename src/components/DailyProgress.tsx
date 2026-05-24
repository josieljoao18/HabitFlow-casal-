import { memo } from 'react';
import { Sparkles } from 'lucide-react';
import { Habit } from '../types';
import { isHabitActiveOnDate, formatLocalYMD } from '../utils/dateHelpers';

interface DailyProgressProps {
  habits: Habit[];
  date: Date;
  currentUserId: string;
}

export const DailyProgress = memo(({ habits = [], date, currentUserId = '' }: DailyProgressProps) => {
  const ds = formatLocalYMD(date);
  const active = habits.filter(h => isHabitActiveOnDate(h, ds));
  const done = active.filter(h => h.completedBy?.[ds]?.[currentUserId] === true).length;

  if (active.length === 0) {
    return (
      <div className="bg-card p-3 rounded-2xl mb-4 border border-primary/20 flex items-center justify-between">
        <span className="text-secondary text-xs">Nenhum hábito agendado para este dia</span>
        <span className="text-[10px] text-emerald-400 font-medium">Dia livre! 🕊️</span>
      </div>
    );
  }

  const pct = (done / active.length) * 100;
  const isComplete = pct === 100;

  return (
    <div className="bg-card p-4 rounded-2xl mb-4 border border-primary/20 shadow-sm relative overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1.5 font-sans">
          <span className="text-secondary text-xs font-semibold">Seu Progresso de Hoje</span>
          {isComplete && (
            <span className="flex items-center gap-0.5 text-amber-400 text-[10px] font-bold bg-amber-500/10 px-1.5 py-0.5 rounded-full animate-bounce">
              <Sparkles className="w-3 h-3" />
              Tudo feito!
            </span>
          )}
        </div>
        <span className="text-primary text-xs font-bold font-mono">
          {done}/{active.length} <span className="text-secondary font-normal">({Math.round(pct)}%)</span>
        </span>
      </div>

      <div className="w-full h-2.5 bg-secondary/10 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: isComplete 
              ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' 
              : 'linear-gradient(90deg, #10b981, #059669)'
          }}
        ></div>
      </div>
    </div>
  );
});

DailyProgress.displayName = 'DailyProgress';
export default DailyProgress;
