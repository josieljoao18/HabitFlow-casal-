import { Habit } from '../types';

export const getToday = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatLocalYMD = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDate = (dStr: string): string => {
  if (!dStr) return '';
  // Ensure we parse without timezone shifts
  const parts = dStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  const dateObj = new Date(dStr);
  return dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

export const formatDayName = (date: Date): string => {
  return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
};

export const getWeekDays = (): Date[] => {
  const today = new Date();
  const days: Date[] = [];
  
  // Show 3 days ago, and 3 days ahead of today
  for (let i = 3; i >= 1; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    days.push(d);
  }
  
  days.push(today);
  
  for (let i = 1; i <= 3; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  
  return days;
};

export const isHabitActiveOnDate = (habit: Habit, dateStr: string): boolean => {
  if (!habit || !dateStr) return false;
  
  // Daily frequency is always active
  if (!habit.frequency || habit.frequency.type === 'daily') return true;
  
  // Parse date correctly with local timezone
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  if (habit.frequency.type === 'weekly') {
    // day is Sunday (0) to Saturday (6)
    return habit.frequency.day === date.getDay();
  }
  
  if (habit.frequency.type === 'custom') {
    const interval = habit.frequency.interval || 2;
    // Calculate difference in days from creation or an anchor epoch
    const createdAtStr = typeof habit.createdAt === 'number'
      ? new Date(habit.createdAt).toISOString()
      : typeof habit.createdAt === 'string'
        ? habit.createdAt
        : '';
        
    const startObj = createdAtStr 
      ? new Date(createdAtStr.split('T')[0] + 'T00:00:00') 
      : new Date('2024-01-01T00:00:00');
    
    const targetObj = new Date(year, month - 1, day);
    const diffTime = Math.abs(targetObj.getTime() - startObj.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays % interval === 0;
  }
  
  return true;
};

export const calculateStreak = (dates: string[], frequency = { type: 'daily' }): number => {
  if (!Array.isArray(dates) || dates.length === 0) return 0;
  
  const sorted = [...dates].sort((a, b) => b.localeCompare(a));
  const today = getToday();
  
  if (frequency.type === 'daily') {
    let streak = 0;
    const check = new Date();
    const todayOk = sorted.includes(today);
    
    const yesterday = new Date();
    yesterday.setDate(check.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // If double missed, streak is broken
    if (!todayOk && !sorted.includes(yesterdayStr)) {
      return 0;
    }
    
    let cur = todayOk ? new Date() : yesterday;
    
    while (true) {
      const curStr = cur.toISOString().split('T')[0];
      if (sorted.includes(curStr)) {
        streak++;
        cur.setDate(cur.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }
  
  return 0;
};
