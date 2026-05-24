import { memo, useMemo } from 'react';
import { Calendar, User, Edit2, Trash2 } from 'lucide-react';
import { Task } from '../types';
import { getToday, formatDate } from '../utils/dateHelpers';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onReact: (id: string, reaction: string) => void;
  currentUser: string;
  names: { [key: string]: string };
}

export const TaskCard = memo(({
  task,
  onToggle,
  onEdit,
  onDelete,
  onReact,
  currentUser,
  names
}: TaskCardProps) => {
  const isCompleted = task.completed;

  const priorityColor = useMemo(() => {
    switch (task.priority) {
      case 'high':
        return '#ef4444'; // red
      case 'medium':
        return '#f59e0b'; // yellow
      case 'low':
        return '#10b981'; // green
      default:
        return '#6b7280';
    }
  }, [task.priority]);

  const isOverdue = useMemo(() => {
    if (!task.dueDate || isCompleted) return false;
    return new Date(task.dueDate) < new Date(getToday());
  }, [task.dueDate, isCompleted]);

  const assignedName = useMemo(() => {
    if (task.assignedTo === 'both') return 'Ambos 💑';
    return names[task.assignedTo] || 'Membro';
  }, [task.assignedTo, names]);

  return (
    <div 
      className={`bg-card rounded-xl p-2.5 flex items-center gap-2.5 border border-primary/20 hover:border-primary/30 shadow-xs transition-all duration-300 relative ${
        isCompleted ? 'opacity-60 bg-secondary/5 border-emerald-500/10' : ''
      }`}
      style={{ borderLeft: `3px solid ${priorityColor}` }}
    >
      {/* Tiny Checkbox */}
      <button 
        onClick={() => onToggle(task.id)}
        className={`w-5.5 h-5.5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
          isCompleted 
            ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs' 
            : 'border-primary/40 hover:border-emerald-400 text-transparent hover:scale-105'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="5" className="w-3 h-3">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </button>

      {/* Task Information */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs select-none">{task.icon || '📋'}</span>
          <h4 className={`text-xs font-bold text-primary truncate tracking-tight ${isCompleted ? 'line-through opacity-70' : ''}`}>
            {task.title}
          </h4>
          
          {isOverdue && (
            <span className="text-[7.5px] font-bold bg-red-500/10 text-red-500 px-1.5 py-0.2 rounded border border-red-500/20 uppercase tracking-wider animate-pulse select-none">
              Atrasada
            </span>
          )}
        </div>

        {/* Info badges */}
        <div className="flex items-center gap-2 mt-1 text-[9px] text-zinc-400 flex-wrap">
          <span className="flex items-center gap-1">
            <User className="w-2.5 h-2.5 text-zinc-500" />
            <strong className="text-zinc-300">{assignedName}</strong>
          </span>

          {task.dueDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5 text-zinc-500" />
              {formatDate(task.dueDate)}
            </span>
          )}
          
          {/* Reaction shortcut bar on completion */}
          {isCompleted && (
            <div className="flex items-center gap-1 ml-auto bg-pink-500/10 px-1.5 py-0.2 rounded border border-pink-500/15 shadow-2xs animate-fade-in flex-wrap">
              <span className="text-[7.5px] text-pink-300 uppercase tracking-widest font-black mr-0.5">Parabenizar:</span>
              {['❤️', '🔥', '👏', '🥰', '⭐'].map(react => (
                <button 
                  key={react} 
                  onClick={() => onReact(task.id, react)} 
                  className="hover:scale-130 transition-transform active:scale-95 text-[10px] select-none cursor-pointer p-px"
                  title={`Reagir com ${react}`}
                >
                  {react}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-0 select-none flex-shrink-0">
        <button 
          onClick={() => onEdit(task)}
          className="p-1 hover:bg-secondary/15 rounded text-secondary hover:text-blue-400 transition-colors cursor-pointer"
          title="Editar tarefa"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={() => onDelete(task.id)}
          className="p-1 hover:bg-secondary/15 rounded text-secondary hover:text-red-400 transition-colors cursor-pointer"
          title="Deletar tarefa"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
});

TaskCard.displayName = 'TaskCard';
export default TaskCard;
