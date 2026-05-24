import { useState, memo, useMemo } from 'react';
import { ArrowUp, ArrowDown, Edit2, Trash2, Check, Flame } from 'lucide-react';
import { Habit } from '../types';
import { isHabitActiveOnDate, calculateStreak } from '../utils/dateHelpers';
import { performVibe } from '../utils/fx';

interface HabitCardProps {
  habit: Habit;
  onToggle: (id: string, dateStr: string) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (id: string) => void;
  onReact?: (id: string, dateStr: string, targetUid: string, reaction: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  dateStr: string;
  isFirst: boolean;
  isLast: boolean;
  currentUserId: string;
  names: { [key: string]: string };
}

export const HabitCard = memo(({
  habit,
  onToggle,
  onEdit,
  onDelete,
  onReact,
  onMoveUp,
  onMoveDown,
  dateStr,
  isFirst,
  isLast,
  currentUserId,
  names
}: HabitCardProps) => {
  const completedByMe = !!habit.completedBy?.[dateStr]?.[currentUserId];
  const partnerId = Object.keys(names || {}).find(uid => uid !== currentUserId);
  const completedByPartner = partnerId ? !!habit.completedBy?.[dateStr]?.[partnerId] : false;
  const partnerName = partnerId ? names[partnerId] : 'Parceiro';
  
  const assignedToBoth = habit.assignedTo === 'both';
  const assignedToMe = habit.assignedTo === currentUserId;
  const isCompleteInCouple = assignedToBoth && completedByMe && completedByPartner;

  const active = isHabitActiveOnDate(habit, dateStr);
  const [isToggling, setIsToggling] = useState(false);

  // Retrieve Reactions
  const partnerReaction = partnerId ? (habit.reactions?.[dateStr]?.[partnerId] || null) : null; // Reaction current user left on Partner's completion
  const myReaction = habit.reactions?.[dateStr]?.[currentUserId] || null; // Reaction partner left on current user's completion

  // Individual Completion Statistics
  const totalMyCompletions = useMemo(() => {
    if (!habit.completedBy) return 0;
    return Object.values(habit.completedBy).filter(uids => uids[currentUserId]).length;
  }, [habit.completedBy, currentUserId]);

  const datesForMe = useMemo(() => {
    if (!habit.completedBy) return [];
    return Object.entries(habit.completedBy)
      .filter(([_, uids]) => uids[currentUserId])
      .map(([date]) => date);
  }, [habit.completedBy, currentUserId]);

  const individualStreak = useMemo(() => {
    return calculateStreak(datesForMe, habit.frequency || { type: 'daily' });
  }, [datesForMe, habit.frequency]);

  const freqText = useMemo(() => {
    const f = habit.frequency || { type: 'daily' };
    if (f.type === 'weekly') {
      const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      return `📆 Toda ${weekdays[f.day ?? 0]}`;
    }
    if (f.type === 'custom') {
      return `🔄 A cada ${f.interval ?? 2} d`;
    }
    return '📅 Diário';
  }, [habit.frequency]);

  const tagColor = useMemo(() => {
    const defaultStyle = 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    const tag = habit.tag ? habit.tag.toLowerCase() : '';
    switch (tag) {
      case 'amor':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      case 'comunicação':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'espiritual':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'saúde':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'relacionamento':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return defaultStyle;
    }
  }, [habit.tag]);

  const handleToggle = () => {
    if (!active) return;
    setIsToggling(true);
    performVibe();
    onToggle(habit.id, dateStr);
    setTimeout(() => setIsToggling(false), 300);
  };

  return (
    <div 
      className={`bg-card rounded-xl p-3 border transition-all duration-300 relative overflow-hidden flex flex-col gap-2 ${
        completedByMe 
          ? 'border-emerald-500/30 bg-emerald-950/5' 
          : 'border-primary/20 hover:border-primary/40'
      } ${!active ? 'opacity-45 grayscale-[20%]' : ''}`}
    >
      {/* Decorative accent for completed items */}
      {completedByMe && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-400 to-green-600 rounded-l-xl"></div>
      )}

      <div className="flex items-center gap-2.5 w-full">
        {/* Compact Emoji Icon */}
        <div className="w-9 h-9 rounded-xl bg-secondary/5 border border-primary/15 flex items-center justify-center text-lg flex-shrink-0 select-none shadow-sm">
          {habit.icon || '🔥'}
        </div>

        {/* Center Details */}
        <div className="flex-1 min-w-0 font-sans">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className={`font-bold text-xs text-primary truncate tracking-tight leading-none ${completedByMe ? 'line-through opacity-70' : ''}`}>
              {habit.title}
            </h3>
            <span className={`text-[8px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider border ${tagColor}`}>
              {habit.tag}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1 text-[9px] text-zinc-400">
            {individualStreak > 0 && (
              <span className="flex items-center gap-0.5 text-amber-500 font-bold bg-amber-500/10 px-1 rounded">
                <Flame className="w-2.5 h-2.5 fill-current" />
                {individualStreak}d
              </span>
            )}
            <span>{freqText}</span>
            <span className="font-medium opacity-80">Você fez {totalMyCompletions}x</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0 z-10 select-none">
          {/* Re-ordering arrows */}
          <div className="flex flex-col gap-0">
            {onMoveUp && !isFirst && (
              <button 
                onClick={onMoveUp}
                className="p-0.5 hover:bg-secondary/15 rounded text-secondary transition-colors cursor-pointer"
                title="Mover para cima"
              >
                <ArrowUp className="w-2.5 h-2.5" />
              </button>
            )}
            {onMoveDown && !isLast && (
              <button 
                onClick={onMoveDown}
                className="p-0.5 hover:bg-secondary/15 rounded text-secondary transition-colors cursor-pointer"
                title="Mover para baixo"
              >
                <ArrowDown className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* Edit & Delete */}
          <button 
            onClick={() => onEdit(habit)}
            className="p-1 hover:bg-secondary/15 rounded-md text-secondary hover:text-emerald-400 transition-colors cursor-pointer"
            title="Editar hábito"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button 
            onClick={() => onDelete(habit.id)}
            className="p-1 hover:bg-secondary/15 rounded-md text-secondary hover:text-red-400 transition-colors cursor-pointer"
            title="Deletar hábito"
          >
            <Trash2 className="w-3 h-3" />
          </button>

          {/* Custom Compact Circular Check Button */}
          <button
            onClick={handleToggle}
            disabled={!active}
            className={`w-7.5 h-7.5 rounded-full flex items-center justify-center transition-all duration-300 ease-elastic cursor-pointer shadow-md ${
              completedByMe 
                ? 'bg-gradient-to-br from-emerald-400 to-green-600 text-white shadow-emerald-500/15 ring-2 ring-emerald-500/30 font-bold' 
                : 'bg-secondary/10 border border-primary/20 text-transparent hover:text-secondary/50 hover:bg-secondary/20 hover:scale-105'
            } ${isToggling ? 'scale-90' : ''}`}
          >
            <Check className="w-3.5 h-3.5 stroke-[4px]" />
          </button>
        </div>
      </div>

      {/* Shared Target Tracking layout */}
      {assignedToBoth && (
        <div className="flex items-center justify-between border-t border-white/5 pt-1.5 text-[10px] font-sans flex-wrap gap-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Status:</span>
            <div className="flex items-center gap-1 flex-wrap">
              {/* Me Completion status + partner's reaction */}
              <span className={`px-1.5 py-0.2 rounded flex items-center gap-0.5 font-bold text-[9px] border ${completedByMe ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-secondary/10 text-secondary border-transparent'}`}>
                Você {completedByMe ? '✅' : '⏳'}
                {completedByMe && myReaction && (
                  <span className="ml-1 text-[11px] animate-bounce" title={`${partnerName} reagiu: ${myReaction}`}>
                    {myReaction}
                  </span>
                )}
              </span>

              {/* Partner Completion status */}
              <span className={`px-1.5 py-0.2 rounded flex items-center gap-0.5 font-bold text-[9px] border ${completedByPartner ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-secondary/10 text-secondary border-transparent'}`}>
                {partnerName} {completedByPartner ? '✅' : '⏳'}
              </span>

              {/* Interactive Reaction box for completed partner */}
              {completedByPartner && partnerId && onReact && (
                <div className="flex items-center gap-0.5 pl-1">
                  {partnerReaction ? (
                    <span 
                      onClick={() => onReact(habit.id, dateStr, partnerId, '')} 
                      className="text-xs bg-pink-500/15 px-1 py-0.2 rounded cursor-pointer hover:bg-pink-500/35 border border-pink-500/25 flex items-center gap-1 animate-fade-in"
                      title="Sua reação. Clique para remover."
                    >
                      <span>Reagiu: {partnerReaction}</span>
                      <span className="text-[8px] opacity-60">✖</span>
                    </span>
                  ) : (
                    <div className="flex items-center gap-0.5 bg-pink-500/10 px-1 py-0.2 rounded border border-pink-500/20">
                      <span className="text-[8px] text-pink-300 font-bold uppercase tracking-wider mr-1">Reagir:</span>
                      {['❤️', '🔥', '👏', '🥰', '⭐'].map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => onReact(habit.id, dateStr, partnerId, emoji)}
                          className="hover:scale-130 transition-transform active:scale-95 text-[10px] select-none cursor-pointer bg-transparent border-0 p-px"
                          title={`Reagir com ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {isCompleteInCouple ? (
            <span className="text-[8px] px-1.5 py-0.2 rounded bg-pink-500/10 text-pink-400 font-extrabold tracking-wider uppercase border border-pink-500/20 select-none">
              🔥 Casal (+20 XP 💑)
            </span>
          ) : (
            <span className="text-[8px] text-zinc-500 italic">Juntos têm bônus!</span>
          )}
        </div>
      )}

      {/* Individual target layout & partner reaction option when completed by partner or me */}
      {!assignedToBoth && (
        <div className="text-[9.5px] text-zinc-500 border-t border-white/5 pt-1.5 flex justify-between items-center font-sans tracking-wide flex-wrap gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>🎯 Dono: <strong className="text-zinc-300 font-sans">{assignedToMe ? 'Você' : partnerName}</strong></span>
            
            {/* If it belongs to partner, partner completed it, allow me to react */}
            {!assignedToMe && completedByPartner && partnerId && onReact && (
              <div className="flex items-center gap-1">
                <span className="text-[8.5px] text-emerald-400 font-bold uppercase px-1 rounded bg-emerald-500/10">feito!</span>
                {partnerReaction ? (
                  <span 
                    onClick={() => onReact(habit.id, dateStr, partnerId, '')} 
                    className="text-xs bg-pink-500/15 px-1 rounded cursor-pointer hover:bg-pink-500/35 border border-pink-500/25 flex items-center gap-0.5"
                    title="Sua reação. Clique para remover."
                  >
                    <span>Reagiu: {partnerReaction}</span>
                    <span className="text-[8px] opacity-60">✖</span>
                  </span>
                ) : (
                  <div className="flex items-center gap-0.5 bg-pink-500/10 px-1 py-0.2 rounded border border-pink-500/20">
                    <span className="text-[8px] text-pink-300 font-black uppercase mr-1">Aplauda:</span>
                    {['❤️', '🔥', '👏', '🥰', '⭐'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => onReact(habit.id, dateStr, partnerId, emoji)}
                        className="hover:scale-130 transition-transform active:scale-95 text-[10px] select-none cursor-pointer bg-transparent border-0 p-px"
                        title={`Reagir com ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* If it belongs to me, completed by me, show if they reacted */}
            {assignedToMe && completedByMe && myReaction && (
              <span className="text-[9.5px] text-pink-400 bg-pink-500/10 border border-pink-500/15 rounded-md px-1 py-0.2 animate-pulse font-bold flex items-center gap-0.5">
                {partnerName} reagiu: <span className="text-[11px] scale-102 leading-none">{myReaction}</span>
              </span>
            )}
          </div>
          <span className="text-[10px]">👤</span>
        </div>
      )}
    </div>
  );
});

HabitCard.displayName = 'HabitCard';
export default HabitCard;
