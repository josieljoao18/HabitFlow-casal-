export interface HabitFrequency {
  type: 'daily' | 'weekly' | 'custom';
  day?: number; // 0-6 for weekly (Sunday-Saturday)
  interval?: number; // every N days for custom
}

export interface Habit {
  id: string;
  title: string;
  icon: string;
  tag: 'amor' | 'comunicação' | 'espiritual' | 'saúde' | 'relacionamento' | string;
  coupleId: string;
  createdBy: string;
  assignedTo: string; // 'both' | member userId
  frequency: HabitFrequency;
  completedBy?: {
    [date: string]: {
      [uid: string]: boolean;
    };
  };
  reactions?: {
    [date: string]: {
      [uid: string]: string; // uid of the completed person -> reaction emoji
    };
  };
  createdAt: number;
  streak?: number;
  order?: number;
}

export interface Task {
  id: string;
  title: string;
  icon: string;
  priority: 'high' | 'medium' | 'low';
  assignedTo: string; // member userId or 'both'
  createdBy: string; // member userId
  completed: boolean;
  dueDate: string | null;
  coupleId: string;
  createdAt: number;
}

export interface FeedEvent {
  id: string;
  type: 'habit_completed' | 'task_completed' | 'reward_unlocked' | 'daily_challenge_completed' | 'mood_changed';
  userId: string;
  userName: string;
  detailTitle: string;
  extraInfo?: string;
  timestamp: number;
}

export interface RewardStoreItem {
  id: string;
  title: string;
  description: string;
  cost: number;
  icon: string;
  coupleId: string;
  createdBy: string;
  targetUserId: string; // who receives this reward upon unlock
  unlockedAt?: number; // timestamp when purchased
  unlockedBy?: string; // UID of purchaser
  claimed?: boolean; // marked as enjoyed/claimed
}

export interface NotificationItem {
  id: string;
  icon: string;
  message: string;
  timestamp: number;
  read: boolean;
  refId?: string;
}

export interface DevotionalVerse {
  reference: string;
  text: string;
  context: string;
}

export interface CoupleChallenge {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
  coupleId: string | null;
  xp: number;
  level: number;
  streak: number;
  flowCoins: number;
  createdAt: number;
  mood?: string | null;
}

export interface Couple {
  id: string; // the code
  createdAt: number;
  members: {
    [uid: string]: boolean;
  };
  relationshipName: string;
  anniversaryDate?: string; // YYYY-MM-DD start date of relationship
  settings: {
    theme: 'dark' | 'light';
    notifications: boolean;
    anniversaryDate?: string; // fallback
  };
  couplePhoto: string | null;
  dailyChallengeCompletedDate?: string;
  coupleEnergy?: number;
}
