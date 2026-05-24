import { useState, useEffect, memo, FormEvent } from 'react';
import { Calendar, Tag, User, Layers, Check } from 'lucide-react';
import { Habit, Task, HabitFrequency } from '../types';

// Icons list for Habit Creation selection grid
const HABIT_EMOJIS = ['❤️','💬','🙏','✝️','📖','💌','💑','🧠','🏃','😴','🍽️','💰','🎯','🚶','🤝','💖','🎉','💪','🧘','🥗','⭐','✨','🌟'];

// Icons list for Task Creation selection grid
const TASK_EMOJIS = ['📋','🗓️','🛒','💊','🚗','📞','💰','🎯','📝','🏠','❤️','🙏'];

interface HabitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (habitData: Partial<Habit>) => void;
  initial: Habit | null;
  categories: string[];
  names: { [key: string]: string };
}

export const HabitFormModal = memo(({
  isOpen,
  onClose,
  onSave,
  initial,
  categories,
  names
}: HabitFormModalProps) => {
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('❤️');
  const [tag, setTag] = useState('amor');
  const [assignedTo, setAssignedTo] = useState<string>('both');
  const [freqType, setFreqType] = useState<'daily' | 'weekly' | 'custom'>('daily');
  const [weeklyDay, setWeeklyDay] = useState(0); // 0-6 (Sunday-Saturday)
  const [customInterval, setCustomInterval] = useState(2);

  useEffect(() => {
    if (isOpen) {
      if (initial) {
        setTitle(initial.title || '');
        setIcon(initial.icon || '❤️');
        setTag(initial.tag || 'amor');
        setAssignedTo(initial.assignedTo || 'both');
        const f = initial.frequency || { type: 'daily' };
        setFreqType(f.type || 'daily');
        setWeeklyDay(f.day ?? 0);
        setCustomInterval(f.interval ?? 2);
      } else {
        setTitle('');
        setIcon('❤️');
        setTag('amor');
        setAssignedTo('both');
        setFreqType('daily');
        setWeeklyDay(1); // Default segment (Monday)
        setCustomInterval(2);
      }
    }
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let frequency: HabitFrequency = { type: 'daily' };
    if (freqType === 'weekly') {
      frequency = { type: 'weekly', day: weeklyDay };
    } else if (freqType === 'custom') {
      frequency = { type: 'custom', interval: customInterval };
    }

    onSave({
      ...(initial || {}),
      title: title.trim(),
      icon,
      tag,
      frequency,
      assignedTo
    });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200] p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-card border border-primary/30 p-5 rounded-3xl max-w-sm w-full shadow-2xl overflow-y-auto max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        <span className="text-secondary text-[11px] font-bold uppercase tracking-widest block mb-1">
          {initial ? 'Modificar Hábito' : 'Meta Saudável'}
        </span>
        <h3 className="text-lg font-bold text-primary mb-4">
          {initial ? 'Editar Hábito' : 'Criar Novo Hábito'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Icon Chooser */}
          <div>
            <label className="text-xs text-secondary font-bold mb-1.5 block">Selecione o Ícone:</label>
            <div className="grid grid-cols-6 gap-1.5 max-h-[105px] overflow-y-auto p-1.5 bg-secondary/5 rounded-xl border border-primary/10">
              {HABIT_EMOJIS.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setIcon(item)}
                  className={`text-lg p-1.5 rounded-lg text-center cursor-pointer transition-all duration-150 ${
                    icon === item ? 'bg-emerald-500 scale-110 shadow-md text-white' : 'hover:bg-primary/20 bg-primary/5'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Title input */}
          <div>
            <label className="text-xs text-secondary font-bold mb-1.5 block">Título do Hábito:</label>
            <input 
              type="text"
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="w-full px-3.5 py-2 rounded-xl bg-secondary/10 border border-primary/20 text-primary text-sm focus:outline-none focus:border-emerald-500 transition-all font-medium" 
              placeholder="Ex: Leitura Bíblica em Casal" 
              required
            />
          </div>

          {/* Category SELECT */}
          <div>
            <label className="text-xs text-secondary font-bold mb-1.5 block">Categoria:</label>
            <div className="relative">
              <select 
                value={tag} 
                onChange={e => setTag(e.target.value)} 
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary/10 border border-primary/20 text-primary text-sm focus:outline-none focus:border-emerald-500 transition-all cursor-pointer font-medium appearance-none capitalize"
              >
                {categories.map(c => (
                  <option key={c} value={c} className="bg-slate-900 text-white capitalize">{c}</option>
                ))}
              </select>
              <Tag className="w-4 h-4 text-secondary/75 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Assigned To - Responsável */}
          <div>
            <label className="text-xs text-secondary font-bold mb-1.5 block">Responsável:</label>
            <div className="relative">
              <select 
                value={assignedTo} 
                onChange={e => setAssignedTo(e.target.value)} 
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary/10 border border-primary/20 text-primary text-sm focus:outline-none focus:border-emerald-500 transition-all cursor-pointer font-medium appearance-none"
              >
                <option value="both" className="bg-slate-900 text-white">💑 Ambos / Cooperação</option>
                {names && Object.entries(names).map(([uid, name]) => (
                  <option key={uid} value={uid} className="bg-slate-900 text-white">👤 {name}</option>
                ))}
              </select>
              <User className="w-4 h-4 text-secondary/75 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Frequency Type */}
          <div>
            <label className="text-xs text-secondary font-bold mb-1.5 block">Frequência:</label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-secondary/5 rounded-xl border border-primary/15">
              {(['daily', 'weekly', 'custom'] as const).map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFreqType(item)}
                  className={`py-1.5 rounded-lg text-[11px] font-bold transition-all text-center uppercase cursor-pointer ${
                    freqType === item 
                      ? 'bg-emerald-500 text-white shadow-md' 
                      : 'text-secondary hover:text-primary hover:bg-secondary/10'
                  }`}
                >
                  {item === 'daily' ? 'Diário' : item === 'weekly' ? 'Semanal' : 'Custom'}
                </button>
              ))}
            </div>
          </div>

          {/* Weekly extra settings */}
          {freqType === 'weekly' && (
            <div className="animate-fade-in">
              <label className="text-xs text-secondary font-bold mb-1.2 block">Selecione o Dia de Ativação:</label>
              <select 
                value={weeklyDay} 
                onChange={e => setWeeklyDay(Number(e.target.value))} 
                className="w-full px-3 py-2.5 rounded-xl bg-secondary/10 border border-primary/20 text-primary text-sm focus:outline-none focus:border-emerald-500"
              >
                {['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'].map((d, i) => (
                  <option key={i} value={i} className="bg-slate-900 text-white">{d}</option>
                ))}
              </select>
            </div>
          )}

          {/* Custom extra settings */}
          {freqType === 'custom' && (
            <div className="flex items-center gap-2.5 animate-fade-in bg-secondary/5 p-2 rounded-xl border border-primary/10">
              <span className="text-xs text-secondary font-medium">Ativar a cada:</span>
              <input 
                type="number" 
                min="1" 
                max="30"
                value={customInterval} 
                onChange={e => setCustomInterval(Math.max(1, Number(e.target.value) || 2))} 
                className="px-2.5 py-1 rounded-lg bg-secondary/10 border border-primary/20 text-primary w-14 text-center font-bold text-sm"
              />
              <span className="text-xs text-secondary font-medium">dias</span>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex gap-2 pt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-2.5 rounded-xl bg-secondary/10 text-secondary hover:bg-secondary/20 font-bold text-xs"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-xs shadow-md shadow-emerald-500/10 hover:brightness-110"
            >
              {initial ? 'Salvar Alterações' : 'Criar Hábito'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

HabitFormModal.displayName = 'HabitFormModal';


interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<Task>) => void;
  initial: Task | null;
  names: { [key: string]: string };
  activePerson: string;
}

export const TaskFormModal = memo(({
  isOpen,
  onClose,
  onSave,
  initial,
  names,
  activePerson
}: TaskFormModalProps) => {
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('📋');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [assignedTo, setAssignedTo] = useState<string>('both');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initial) {
        setTitle(initial.title || '');
        setIcon(initial.icon || '📋');
        setPriority(initial.priority || 'medium');
        setAssignedTo(initial.assignedTo || 'both');
        setDueDate(initial.dueDate || '');
      } else {
        setTitle('');
        setIcon('📋');
        setPriority('medium');
        setAssignedTo(activePerson as any || 'both');
        setDueDate('');
      }
    }
  }, [isOpen, initial, activePerson]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      ...(initial || {}),
      title: title.trim(),
      icon,
      priority,
      assignedTo,
      dueDate: dueDate || null
    });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200] p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-card border border-primary/30 p-5 rounded-3xl max-w-sm w-full shadow-2xl overflow-y-auto max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        <span className="text-secondary text-[11px] font-bold uppercase tracking-widest block mb-1">
          {initial ? 'Responsabilidade' : 'Cooperação'}
        </span>
        <h3 className="text-lg font-bold text-primary mb-4">
          {initial ? 'Editar Tarefa' : 'Criar Nova Tarefa'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Icon Selection */}
          <div>
            <label className="text-xs text-secondary font-bold mb-1.5 block">Selecione o Emoji:</label>
            <div className="grid grid-cols-6 gap-1.5 p-1.5 bg-secondary/5 rounded-xl border border-primary/10">
              {TASK_EMOJIS.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setIcon(item)}
                  className={`text-lg p-1.5 rounded-lg text-center cursor-pointer transition-all duration-150 ${
                    icon === item ? 'bg-blue-500 scale-110 shadow-md text-white' : 'hover:bg-primary/20 bg-primary/5'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label className="text-xs text-secondary font-bold mb-1.5 block">Nome da Tarefa:</label>
            <input 
              type="text"
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="w-full px-3.5 py-2 rounded-xl bg-secondary/10 border border-primary/20 text-primary text-sm focus:outline-none focus:border-blue-500 transition-all font-medium" 
              placeholder="Ex: Lavar a louça do jantar" 
              required
            />
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs text-secondary font-bold mb-1.5 block">Importância / Urgência:</label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-secondary/5 rounded-xl border border-primary/15">
              {(['low', 'medium', 'high'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`py-1.5 rounded-lg text-[10px] font-bold transition-all text-center uppercase cursor-pointer ${
                    priority === p 
                      ? p === 'high' 
                        ? 'bg-red-500 text-white shadow-md font-bold' 
                        : p === 'medium'
                        ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                        : 'bg-emerald-500 text-white shadow-md'
                      : 'text-secondary hover:text-primary hover:bg-secondary/10'
                  }`}
                >
                  {p === 'low' ? 'Baixa 🟢' : p === 'medium' ? 'Média 🟡' : 'Alta 🔴'}
                </button>
              ))}
            </div>
          </div>

          {/* Assigned To selection */}
          <div>
            <label className="text-xs text-secondary font-bold mb-1.5 block font-sans">Responsável:</label>
            <div className="relative">
              <select 
                value={assignedTo} 
                onChange={e => setAssignedTo(e.target.value)} 
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary/10 border border-primary/20 text-primary text-sm focus:outline-none focus:border-blue-500 transition-all cursor-pointer font-medium appearance-none"
              >
                <option value="both" className="bg-slate-900 text-white">💑 Ambos / Cooperação</option>
                {names && Object.entries(names).map(([uid, name]) => (
                  <option key={uid} value={uid} className="bg-slate-900 text-white">👤 {name}</option>
                ))}
              </select>
              <User className="w-4 h-4 text-secondary/75 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="text-xs text-secondary font-bold mb-1.5 block">Data Limite (Prazo):</label>
            <div className="relative">
              <input 
                type="date" 
                value={dueDate} 
                onChange={e => setDueDate(e.target.value)} 
                className="w-full px-3 py-2 rounded-xl bg-secondary/10 border border-primary/20 text-primary text-sm focus:outline-none font-medium text-left"
              />
            </div>
          </div>

          {/* Form action buttons */}
          <div className="flex gap-2 pt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-2.5 rounded-xl bg-secondary/10 text-secondary hover:bg-secondary/20 font-bold text-xs"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-bold text-xs shadow-md shadow-blue-500/10 hover:brightness-110"
            >
              {initial ? 'Salvar Alterações' : 'Criar Tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

TaskFormModal.displayName = 'TaskFormModal';
export default TaskFormModal;
