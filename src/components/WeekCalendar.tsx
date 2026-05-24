import { memo } from 'react';
import { Calendar } from 'lucide-react';
import { Habit } from '../types';
import { getWeekDays, formatDayName, isHabitActiveOnDate, formatLocalYMD } from '../utils/dateHelpers';

interface WeekCalendarProps {
  selectedDate: Date;
  onSelect: (date: Date) => void;
  habits: Habit[];
  currentUserId: string;
}

export const WeekCalendar = memo(({ selectedDate, onSelect, habits = [], currentUserId = '' }: WeekCalendarProps) => {
  const week = getWeekDays();
  const today = new Date();

  return (
    <div className="bg-card p-3 rounded-2xl border border-primary/20 shadow-sm mb-4">
      <div className="flex items-center gap-1.5 mb-2.5 text-secondary">
        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[11px] font-bold uppercase tracking-wider">Histórico Semanal</span>
      </div>

      <div className="grid grid-cols-7 gap-1.5 justify-items-stretch">
        {week.map((day, idx) => {
          const ds = formatLocalYMD(day);
          const isSelected = selectedDate.toDateString() === day.toDateString();
          const isToday = day.toDateString() === today.toDateString();
          
          const active = habits.filter(h => isHabitActiveOnDate(h, ds));
          const total = active.length;
          const done = active.filter(h => h.completedBy?.[ds]?.[currentUserId] === true).length;

          let progressColorClass = 'hover:bg-primary/20';
          if (total > 0) {
            if (done === total) {
              progressColorClass = isSelected ? 'bg-emerald-500' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400';
            } else if (done > 0) {
              progressColorClass = isSelected ? 'bg-amber-500 text-black' : 'bg-amber-500/10 border border-amber-500/30 text-amber-400';
            } else {
              progressColorClass = isSelected ? 'bg-gray-700' : 'bg-secondary/5 border border-primary/10';
            }
          } else if (isSelected) {
            progressColorClass = 'bg-slate-700';
          }

          return (
            <button
              key={idx}
              onClick={() => onSelect(day)}
              className={`flex flex-col items-center justify-between p-2 rounded-xl transition-all duration-200 cursor-pointer min-h-[56px] ${progressColorClass} ${
                isSelected ? 'ring-2 ring-emerald-400 font-bold scale-102 shadow-sm text-white' : ''
              }`}
            >
              <span className={`text-[10px] font-medium opacity-80 uppercase ${isSelected ? 'text-white' : 'text-secondary'}`}>
                {formatDayName(day)}
              </span>
              
              <span className={`text-xs font-bold ${isToday && !isSelected ? 'text-emerald-400 underline underline-offset-4 decoration-2' : ''}`}>
                {day.getDate()}
              </span>

              {total > 0 ? (
                <span className={`text-[8px] font-mono mt-1 ${isSelected ? 'text-white/80' : 'text-secondary font-bold'}`}>
                  {done}/{total}
                </span>
              ) : (
                <span className="text-[8px] opacity-20 mt-1">-</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

WeekCalendar.displayName = 'WeekCalendar';
export default WeekCalendar;
