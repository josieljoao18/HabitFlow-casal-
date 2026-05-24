import { useState, useEffect, useCallback, useMemo, useRef, ChangeEvent, FormEvent } from 'react';
import { 
  Heart, 
  Calendar, 
  CheckSquare, 
  Settings, 
  Sparkles, 
  LogOut, 
  Moon, 
  Sun, 
  Camera, 
  Plus, 
  Check, 
  TrendingUp, 
  BookOpen, 
  RefreshCw,
  Bell,
  Activity,
  UserCheck,
  Award,
  Coins,
  Flame,
  Zap,
  Gift,
  Link,
  Users,
  Smile,
  Edit3,
  Trash2,
  Mic,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { ref, set, update, onValue, push, remove, get } from 'firebase/database';

import { auth, rtdb, isFirebaseAvailable } from './firebase';
import { Habit, Task, NotificationItem, UserProfile, Couple, FeedEvent, RewardStoreItem } from './types';
import { getToday, isHabitActiveOnDate, calculateStreak, formatLocalYMD } from './utils/dateHelpers';
import { getDailyChallenge } from './utils/devotionals';
import { playCompletionSound, triggerConfetti, performVibe, triggerSystemNotification } from './utils/fx';
import DevotionalCard from './components/DevotionalCard';
import DailyProgress from './components/DailyProgress';
import WeekCalendar from './components/WeekCalendar';
import HabitCard from './components/HabitCard';
import TaskCard from './components/TaskCard';
import NotificationPanel from './components/NotificationPanel';
import LiveSmartNotificationEngine from './components/LiveSmartNotificationEngine';
import VoiceAssistantCoach from './components/VoiceAssistantCoach';
import { HabitFormModal, TaskFormModal } from './components/Forms';
import StatsPanel from './components/StatsPanel';
import SettingsPanel from './components/SettingsPanel';

// Custom Toast renderer
interface ToastState {
  message: string;
  error?: boolean;
}

const DEFAULT_HABITS = [
  { id: 'h_def1', title: 'Leitura Bíblica Diária', icon: '📖', tag: 'espiritual', frequency: { type: 'daily' }, assignedTo: 'both', createdAt: Date.now() },
  { id: 'h_def2', title: 'Oração pelo Casal', icon: '🙏', tag: 'espiritual', frequency: { type: 'daily' }, assignedTo: 'both', createdAt: Date.now() },
  { id: 'h_def3', title: 'Palavra de Carinho', icon: '💌', tag: 'amor', frequency: { type: 'daily' }, assignedTo: 'both', createdAt: Date.now() }
];

const DEFAULT_TASKS_SEED = [
  { id: 't_seed1', title: 'Orar juntos antes de dormir', icon: '🙏', priority: 'high', assignedTo: 'both', dueDate: getToday(), completed: false, createdAt: Date.now() },
  { id: 't_seed2', title: 'Preparar o jantar especial', icon: '🍽️', priority: 'medium', assignedTo: 'both', dueDate: getToday(), completed: false, createdAt: Date.now() }
];

const DEFAULT_REWARDS: Omit<RewardStoreItem, 'coupleId' | 'createdBy'>[] = [
  { id: 'rew_1', title: '🍬 Chocolate Especial', description: 'Garante um chocolate favorito entregue com muito carinho.', cost: 200, icon: '🍬', targetUserId: 'both' },
  { id: 'rew_7', title: '☕ Pequeno-Almoço na Cama', description: 'Um café da manhã completo na cama servido com flores silvestres e beijo.', cost: 400, icon: '☕', targetUserId: 'both' },
  { id: 'rew_3', title: '💆 Massagem Relaxante', description: 'Garante uma massagem caprichada e prolongada sem reclamações.', cost: 500, icon: '💆', targetUserId: 'both' },
  { id: 'rew_10', title: '🍿 Controle Absoluto da TV', description: 'Sua escolha soberana de filmes ou séries por uma semana inteira.', cost: 600, icon: '🍿', targetUserId: 'both' },
  { id: 'rew_2', title: '🍕 Noite de Pizza Casal', description: 'Uma noite especial de pizza com direito a escolher o sabor e o filme.', cost: 800, icon: '🍕', targetUserId: 'both' },
  { id: 'rew_8', title: '🎫 Vale-Paz Espontâneo', description: 'Pausa instantânea para discussões e debates por 24 horas na paz total!', cost: 1200, icon: '🎫', targetUserId: 'both' },
  { id: 'rew_6', title: '👑 Dia Sem Tarefas Domésticas', description: 'O parceiro assume absolutamente todos os deveres e louças por 24 horas.', cost: 2000, icon: '👑', targetUserId: 'both' },
  { id: 'rew_4', title: '🛍️ Vale Desejo Shopee/Mimo', description: 'Desbloqueia um mimo surpresa do parceiro(a) no seu carrinho.', cost: 3500, icon: '🛍️', targetUserId: 'both' },
  { id: 'rew_5', title: '🍽️ Jantar Romântico Premium', description: 'Um jantar inesquecível de gala patrocinado pelo amor da sua vida.', cost: 5000, icon: '🍽️', targetUserId: 'both' },
  { id: 'rew_9', title: '✈️ Fuga a Dois de Fim de Semana', description: 'Passeio incrível planejado e patrocinado inteiramente com as moedas.', cost: 9000, icon: '✈️', targetUserId: 'both' }
];

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [showHomeView, setShowHomeView] = useState<boolean>(true);
  
  // Navigation
  const [nav, setNav] = useState<'habits' | 'tasks' | 'couple' | 'stats' | 'settings'>('habits');
  
  // Multi-user & Couple Profiles (synced from DB)
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  
  // Collections lists
  const [habitsData, setHabitsData] = useState<Habit[]>([]);
  const [tasksData, setTasksData] = useState<Task[]>([]);
  const [rewardsData, setRewardsData] = useState<RewardStoreItem[]>([]);
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Simulation Controller (extremely useful for test sandbox and toggling roles in preview)
  const [simulatedLoggedUid, setSimulatedLoggedUid] = useState<string>('');

  // Sinc UI Themes
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [toast, setToast] = useState<ToastState | null>(null);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState<boolean>(false);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState<boolean>(false);
  
  // Track notifications displayed natively to avoid browser spam
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  const sessionStartTimeRef = useRef<number>(Date.now());
  
  // Modal controllers
  const [activeHabitModal, setActiveHabitModal] = useState<boolean>(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [activeTaskModal, setActiveTaskModal] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showCustomRewardModal, setShowCustomRewardModal] = useState<boolean>(false);
  const [editingReward, setEditingReward] = useState<RewardStoreItem | null>(null);
  
  // Custom Reward Creation States
  const [newRewTitle, setNewRewTitle] = useState('');
  const [newRewDesc, setNewRewDesc] = useState('');
  const [newRewCost, setNewRewCost] = useState<number | string>(300);
  const [newRewIcon, setNewRewIcon] = useState('🎁');

  // Login credentials form
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isSignMode, setIsSignMode] = useState(false);
  const [authErrorAlert, setAuthErrorAlert] = useState('');
  const [submittingAuth, setSubmittingAuth] = useState(false);

  // Invite system inputs
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isWaitingPartnerLink, setIsWaitingPartnerLink] = useState(false);
  const [myCreatedInviteCode, setMyCreatedInviteCode] = useState('');

  // Checks if the current user is Josiel
  const isJosiel = currentUserProfile ? (
    (currentUserProfile.name || '').toLowerCase().trim() === 'josiel' ||
    (currentUserProfile.email || '').toLowerCase().includes('josiel') ||
    currentUserProfile.uid === 'uid_josiel'
  ) : false;

  // Helper trigger Toast
  const triggerToast = (msg: string, isErr = false) => {
    setToast({ message: msg, error: isErr });
    setTimeout(() => setToast(null), 3000);
  };

  // Sync Class Theme
  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-mode' : '';
  }, [theme]);

  // Auth Synchronizer
  useEffect(() => {
    if (!isFirebaseAvailable) {
      setLoading(false);
      loadLocalBackup();
      return;
    }

    const unsub = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        setUser(authUser);
        setIsGuestMode(false);
        setShowHomeView(false);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return unsub;
  }, []);

  // Real-time Database profile listener
  useEffect(() => {
    if (!user || isGuestMode) return;

    const profileRef = ref(rtdb, `users/${user.uid}`);
    const unsub = onValue(profileRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val() as UserProfile;
        setCurrentUserProfile(val);
        setSimulatedLoggedUid(prev => prev || val.uid);
      } else {
        // Setup initial user profile doc
        const initProfile: UserProfile = {
          uid: user.uid,
          name: user.email ? user.email.split('@')[0] : 'Parceiro',
          email: user.email || '',
          photoURL: null,
          coupleId: null,
          xp: 10,
          level: 1,
          streak: 0,
          flowCoins: 300,
          createdAt: Date.now(),
          mood: '😊'
        };
        set(profileRef, initProfile);
        setCurrentUserProfile(initProfile);
        setSimulatedLoggedUid(initProfile.uid);
      }
      setLoading(false);
    });

    return unsub;
  }, [user, isGuestMode]);

  // Real-time Database couple & entities listener
  useEffect(() => {
    const activeCoupleId = currentUserProfile?.coupleId;
    if (!activeCoupleId || isGuestMode) return;

    // 1. Couple document listener
    const coupleRef = ref(rtdb, `couples/${activeCoupleId}`);
    const unsubCouple = onValue(coupleRef, (snap) => {
      if (snap.exists()) {
        const coupleData = snap.val() as Couple;
        setCouple(coupleData);
        if (coupleData.settings?.theme) {
          setTheme(coupleData.settings.theme);
        }
        
        // Listen to partner profile dynamically
        const partnerUid = Object.keys(coupleData.members || {}).find(uid => uid !== user?.uid);
        if (partnerUid) {
          const partnerProfileRef = ref(rtdb, `users/${partnerUid}`);
          onValue(partnerProfileRef, (pSnap) => {
            if (pSnap.exists()) {
              setPartnerProfile(pSnap.val() as UserProfile);
            }
          });
        } else {
          setPartnerProfile(null);
        }
      }
    });

    // 2. Habits listener
    const habitsRef = ref(rtdb, `habits`);
    const unsubHabits = onValue(habitsRef, (snap) => {
      let currentHabits: Habit[] = [];
      if (snap.exists()) {
        const all = Object.values(snap.val()) as Habit[];
        currentHabits = all.filter(h => h && h.coupleId === activeCoupleId);
      }

      if (currentHabits.length === 0) {
        // Automatically seed default habits for this couple so they are never empty!
        const seededList: Habit[] = DEFAULT_HABITS.map(h => ({
          ...h,
          id: `${h.id}_${activeCoupleId}`,
          coupleId: activeCoupleId,
          createdBy: user?.uid || 'system',
          createdAt: Date.now()
        })) as Habit[];
        
        seededList.forEach(seed => {
          set(ref(rtdb, `habits/${seed.id}`), seed);
        });
        setHabitsData(seededList);
      } else {
        setHabitsData(currentHabits);
      }
    });

    // 3. Tasks listener
    const tasksRef = ref(rtdb, `tasks`);
    const unsubTasks = onValue(tasksRef, (snap) => {
      let currentTasks: Task[] = [];
      if (snap.exists()) {
        const all = Object.values(snap.val()) as Task[];
        currentTasks = all.filter(t => t && t.coupleId === activeCoupleId);
      }

      if (currentTasks.length === 0) {
        // Automatically seed default tasks for this couple
        const seededList: Task[] = DEFAULT_TASKS_SEED.map(t => ({
          ...t,
          id: `${t.id}_${activeCoupleId}`,
          coupleId: activeCoupleId,
          createdBy: user?.uid || 'system',
          createdAt: Date.now()
        })) as Task[];

        seededList.forEach(seed => {
          set(ref(rtdb, `tasks/${seed.id}`), seed);
        });
        setTasksData(seededList);
      } else {
        setTasksData(currentTasks);
      }
    });

    // 4. Rewards listener
    const rewardsRef = ref(rtdb, `rewards/${activeCoupleId}`);
    const unsubRewards = onValue(rewardsRef, (snap) => {
      if (snap.exists()) {
        const list = Object.values(snap.val()) as RewardStoreItem[];
        setRewardsData(list);
      } else {
        // Seed default rewards if empty
        const seededList: RewardStoreItem[] = DEFAULT_REWARDS.map(r => ({
          ...r,
          coupleId: activeCoupleId,
          createdBy: 'system'
        }));
        seededList.forEach(seed => {
          set(ref(rtdb, `rewards/${activeCoupleId}/${seed.id}`), seed);
        });
        setRewardsData(seededList);
      }
    });

    // 5. Feed ticker listener
    const feedRef = ref(rtdb, `feed/${activeCoupleId}`);
    const unsubFeed = onValue(feedRef, (snap) => {
      if (snap.exists()) {
        const all = Object.values(snap.val()) as FeedEvent[];
        const sorted = all.sort((a,b) => b.timestamp - a.timestamp);
        setFeedEvents(sorted.slice(0, 30));
      } else {
        setFeedEvents([]);
      }
    });

    // 6. Notifications listener (for real logged uid)
    const notifRef = ref(rtdb, `notifications/${user?.uid}`);
    const unsubNotif = onValue(notifRef, (snap) => {
      if (snap.exists()) {
        const rawObj = snap.val();
        const all = Object.values(rawObj) as NotificationItem[];
        const todayStr = getToday();
        
        // Filter out notifications that are not from today
        const todayNotifs = all.filter(n => {
          const dateOfNotif = new Date(n.timestamp);
          const year = dateOfNotif.getFullYear();
          const month = String(dateOfNotif.getMonth() + 1).padStart(2, '0');
          const day = String(dateOfNotif.getDate()).padStart(2, '0');
          const notifDateStr = `${year}-${month}-${day}`;
          return notifDateStr === todayStr;
        });

        const sorted = todayNotifs.sort((a,b) => b.timestamp - a.timestamp);
        setNotifications(sorted);

        // Trigger native system/PWA notifications for newly received items
        sorted.forEach(notif => {
          if (!notifiedIdsRef.current.has(notif.id)) {
            notifiedIdsRef.current.add(notif.id);
            // Trigger system alert if the notification is fresh in our active session (since startup or last minute)
            if (notif.timestamp > sessionStartTimeRef.current - 5000) {
              triggerSystemNotification(`Sintonia Casal ${notif.icon || '🔔'}`, notif.message);
            }
          }
        });

        // Auto-cleanup older notifications from the database
        Object.keys(rawObj).forEach(key => {
          const n = rawObj[key] as NotificationItem;
          const dateOfNotif = new Date(n.timestamp);
          const year = dateOfNotif.getFullYear();
          const month = String(dateOfNotif.getMonth() + 1).padStart(2, '0');
          const day = String(dateOfNotif.getDate()).padStart(2, '0');
          const notifDateStr = `${year}-${month}-${day}`;
          if (notifDateStr !== todayStr && user?.uid) {
            remove(ref(rtdb, `notifications/${user.uid}/${key}`));
          }
        });
      } else {
        setNotifications([]);
      }
    });

    return () => {
      unsubCouple();
      unsubHabits();
      unsubTasks();
      unsubRewards();
      unsubFeed();
      unsubNotif();
    };
  }, [currentUserProfile?.coupleId, user?.uid, isGuestMode]);

  // Fallbacks local cache backup for offline/Guest session sandbox
  const saveLocalBackup = (mutated: any) => {
    localStorage.setItem('habitflow_couple_os_guest_cache_v3', JSON.stringify({
      currentUserProfile: currentUserProfile,
      partnerProfile: partnerProfile,
      couple: couple,
      habitsData: habitsData,
      tasksData: tasksData,
      rewardsData: rewardsData,
      feedEvents: feedEvents,
      notifications: notifications,
      simulatedLoggedUid: simulatedLoggedUid,
      theme: theme,
      ...mutated
    }));
  };

  const loadLocalBackup = () => {
    const cached = localStorage.getItem('habitflow_couple_os_guest_cache_v3');
    if (cached) {
      try {
        const d = JSON.parse(cached);
        if (d.currentUserProfile) setCurrentUserProfile(d.currentUserProfile);
        if (d.partnerProfile) setPartnerProfile(d.partnerProfile);
        if (d.couple) setCouple(d.couple);
        if (d.habitsData) setHabitsData(d.habitsData);
        if (d.tasksData) setTasksData(d.tasksData);
        if (d.rewardsData) setRewardsData(d.rewardsData);
        if (d.feedEvents) setFeedEvents(d.feedEvents);
        if (d.notifications) {
          const todayStr = getToday();
          const todayNotifs = (d.notifications as NotificationItem[]).filter(n => {
            const dateOfNotif = new Date(n.timestamp);
            const year = dateOfNotif.getFullYear();
            const month = String(dateOfNotif.getMonth() + 1).padStart(2, '0');
            const day = String(dateOfNotif.getDate()).padStart(2, '0');
            const notifDateStr = `${year}-${month}-${day}`;
            return notifDateStr === todayStr;
          });
          setNotifications(todayNotifs);
        }
        if (d.simulatedLoggedUid) setSimulatedLoggedUid(d.simulatedLoggedUid);
        if (d.theme) setTheme(d.theme);
      } catch (err) {
        console.warn('Failed parsing guest backup keys', err);
      }
    } else {
      // Seed rich mock data right away for demo guest accounts
      const mockUser: UserProfile = {
        uid: 'uid_josiel',
        name: 'Josiel',
        email: 'josiel@gmail.com',
        photoURL: null,
        coupleId: 'ABCD123',
        xp: 4200,
        level: 5,
        streak: 12,
        flowCoins: 350,
        createdAt: Date.now(),
        mood: '😊'
      };
      const mockPartner: UserProfile = {
        uid: 'uid_zipora',
        name: 'Zípora',
        email: 'zipora@gmail.com',
        photoURL: null,
        coupleId: 'ABCD123',
        xp: 3800,
        level: 4,
        streak: 10,
        flowCoins: 210,
        createdAt: Date.now(),
        mood: '🥰'
      };
      const mockCouple: Couple = {
        id: 'ABCD123',
        createdAt: Date.now(),
        members: { uid_josiel: true, uid_zipora: true },
        relationshipName: 'Josiel ❤️ Zípora',
        settings: { theme: 'dark', notifications: true },
        couplePhoto: null,
        coupleEnergy: 85,
        dailyChallengeCompletedDate: ''
      };
      const mockHabits: Habit[] = DEFAULT_HABITS.map(h => ({
        ...h,
        tag: h.tag as any,
        frequency: h.frequency as any,
        coupleId: 'ABCD123',
        createdBy: 'uid_josiel',
        completedBy: {
          [getToday()]: { 'uid_josiel': true }
        }
      })) as Habit[];
      const mockTasks: Task[] = DEFAULT_TASKS_SEED.map(t => ({
        ...t,
        coupleId: 'ABCD123',
        createdBy: 'uid_zipora'
      })) as Task[];
      const mockRewards: RewardStoreItem[] = DEFAULT_REWARDS.map(r => ({
        ...r,
        coupleId: 'ABCD123',
        createdBy: 'system'
      }));
      const mockFeed: FeedEvent[] = [
        { id: 'f1', type: 'habit_completed', userId: 'uid_josiel', userName: 'Josiel', detailTitle: 'Leitura Bíblica Diária', timestamp: Date.now() - 1000 * 60 * 5 },
        { id: 'f2', type: 'mood_changed', userId: 'uid_zipora', userName: 'Zípora', detailTitle: '🥰 Radiante', timestamp: Date.now() - 1000 * 60 * 12 }
      ];

      setCurrentUserProfile(mockUser);
      setPartnerProfile(mockPartner);
      setCouple(mockCouple);
      setHabitsData(mockHabits);
      setTasksData(mockTasks);
      setRewardsData(mockRewards);
      setFeedEvents(mockFeed);
      setSimulatedLoggedUid('uid_josiel');
      setTheme('dark');
    }
    setLoading(false);
  };

  // Switch between simulated profiles (Josiel & Zipora sandbox toggle)
  const handleToggleSimulationLogged = () => {
    if (!currentUserProfile || !partnerProfile) return;
    const nextCurrent = { ...partnerProfile };
    const nextPartner = { ...currentUserProfile };
    
    // Swap profiles
    setCurrentUserProfile(nextCurrent);
    setPartnerProfile(nextPartner);
    setSimulatedLoggedUid(nextCurrent.uid);

    triggerToast(`Alterado! Simulando ações sob perfil de: ${nextCurrent.name}`);

    if (isGuestMode) {
      saveLocalBackup({
        currentUserProfile: nextCurrent,
        partnerProfile: nextPartner,
        simulatedLoggedUid: nextCurrent.uid
      });
    }
  };

  // Helper names lookup dictionary
  const membersNamesLookup = useMemo(() => {
    const dict: { [uid: string]: string } = {};
    if (currentUserProfile) dict[currentUserProfile.uid] = currentUserProfile.name;
    if (partnerProfile) dict[partnerProfile.uid] = partnerProfile.name;
    return dict;
  }, [currentUserProfile, partnerProfile]);

  // Auth Operations
  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !passwordInput.trim()) {
      setAuthErrorAlert('Insira seu email e senha de acesso');
      return;
    }
    setSubmittingAuth(true);
    setAuthErrorAlert('');

    try {
      if (isSignMode) {
        await createUserWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
        triggerToast('Conta individual criada e logs iniciados!');
      } else {
        await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
        triggerToast('Bem-vindo de volta ao HabitFlow!');
      }
      setShowHomeView(false);
    } catch (err: any) {
      let friendly = err.message;
      if (err.code === 'auth/invalid-credential') friendly = 'Credenciais de acesso incorretas.';
      else if (err.code === 'auth/email-already-in-use') friendly = 'Este e-mail já está em uso.';
      setAuthErrorAlert(friendly);
      triggerToast(friendly, true);
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleGuestEntry = () => {
    setIsGuestMode(true);
    setUser(null);
    setShowHomeView(false);
    loadLocalBackup();
    triggerToast('Conectado no Modo Laboratório de Casal 🕊️');
  };

  const handleSignOut = async () => {
    if (isGuestMode) {
      setIsGuestMode(false);
      setShowHomeView(true);
      triggerToast('Sessão laboratório encerrada!');
      return;
    }
    await signOut(auth);
    setUser(null);
    setCurrentUserProfile(null);
    setPartnerProfile(null);
    setCouple(null);
    setShowHomeView(true);
    triggerToast('Sessão encerrada!');
  };

  // Invitation link operations
  const handleCreateCoupleId = async () => {
    if (!currentUserProfile) return;
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setMyCreatedInviteCode(inviteCode);
    setIsWaitingPartnerLink(true);

    const initialCouple: Couple = {
      id: inviteCode,
      createdAt: Date.now(),
      members: { [currentUserProfile.uid]: true },
      relationshipName: `${currentUserProfile.name} ❤️ Cadastrar parceiro`,
      settings: { theme: 'dark', notifications: true },
      couplePhoto: null
    };

    if (isGuestMode) {
      setCouple(initialCouple);
      const updatedProfile = { ...currentUserProfile, coupleId: inviteCode };
      setCurrentUserProfile(updatedProfile);
      saveLocalBackup({ couple: initialCouple, currentUserProfile: updatedProfile });
    } else {
      // RTDB creation
      await set(ref(rtdb, `couples/${inviteCode}`), initialCouple);
      await update(ref(rtdb, `users/${currentUserProfile.uid}`), { coupleId: inviteCode });
    }
    triggerToast(`Código ${inviteCode} criado! Passe para seu parceiro(a).`);
  };

  const handleJoinCouple = async () => {
    const code = joinCodeInput.trim().toUpperCase();
    if (!code || !currentUserProfile) {
      triggerToast('Digite um código válido de 6 caracteres', true);
      return;
    }

    if (isGuestMode) {
      // Mock link
      const mockC: Couple = {
        id: code,
        createdAt: Date.now(),
        members: { 'uid_josiel': true, 'uid_zipora': true },
        relationshipName: `Josiel ❤️ Zípora`,
        settings: { theme: 'dark', notifications: true },
        couplePhoto: null
      };
      setCouple(mockC);
      const updatedProfile = { ...currentUserProfile, coupleId: code };
      setCurrentUserProfile(updatedProfile);
      saveLocalBackup({ couple: mockC, currentUserProfile: updatedProfile });
      triggerToast('Sincronia estabelecida com sucesso!');
      return;
    }

    try {
      const coupleSnap = await get(ref(rtdb, `couples/${code}`));
      if (!coupleSnap.exists()) {
        triggerToast('Código de convite não encontrado. Verifique se digitou correto.', true);
        return;
      }

      const coupleObj = coupleSnap.val() as Couple;
      // Add current user uid in members list
      await update(ref(rtdb, `couples/${code}/members`), { [currentUserProfile.uid]: true });
      await update(ref(rtdb, `users/${currentUserProfile.uid}`), { coupleId: code });
      
      // Update Name combination in couple space
      const ownerUid = Object.keys(coupleObj.members || {})[0];
      let combinedName = `${currentUserProfile.name} ❤️ Parceiro`;
      if (ownerUid) {
        const ownerSnap = await get(ref(rtdb, `users/${ownerUid}`));
        if (ownerSnap.exists()) {
          combinedName = `${ownerSnap.val().name} ❤️ ${currentUserProfile.name}`;
        }
      }
      await update(ref(rtdb, `couples/${code}`), { relationshipName: combinedName });
      triggerToast('Conexão realizada com sucesso!');
    } catch (err: any) {
      triggerToast('Falha ao conectar convite.', true);
    }
  };

  // Live Feed Event Recorder
  const recordFeedEvent = useCallback((type: FeedEvent['type'], title: string, extra?: string) => {
    if (!currentUserProfile || !currentUserProfile.coupleId) return;
    const cid = currentUserProfile.coupleId;
    const newEvent: FeedEvent = {
      id: `fee_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      type,
      userId: currentUserProfile.uid,
      userName: currentUserProfile.name,
      detailTitle: title,
      extraInfo: extra || '',
      timestamp: Date.now()
    };

    if (isGuestMode) {
      const nextList = [newEvent, ...feedEvents];
      setFeedEvents(nextList);
      saveLocalBackup({ feedEvents: nextList });
    } else {
      push(ref(rtdb, `feed/${cid}`), newEvent);
    }
  }, [currentUserProfile, isGuestMode, feedEvents]);

  // Alert and notification engine
  const pushNotificationToUser = useCallback((targetUid: string, icon: string, message: string) => {
    const alert: NotificationItem = {
      id: `not_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      icon,
      message,
      timestamp: Date.now(),
      read: false
    };

    if (isGuestMode) {
      const todayStr = getToday();
      const todayNotifs = notifications.filter(n => {
        const dateOfNotif = new Date(n.timestamp);
        const year = dateOfNotif.getFullYear();
        const month = String(dateOfNotif.getMonth() + 1).padStart(2, '0');
        const day = String(dateOfNotif.getDate()).padStart(2, '0');
        const notifDateStr = `${year}-${month}-${day}`;
        return notifDateStr === todayStr;
      });
      const nextList = [alert, ...todayNotifs];
      setNotifications(nextList);
      saveLocalBackup({ notifications: nextList });
      
      // Render offline native system notification
      notifiedIdsRef.current.add(alert.id);
      triggerSystemNotification(`Sintonia Casal ${alert.icon || '🔔'}`, alert.message);
    } else {
      push(ref(rtdb, `notifications/${targetUid}`), alert);
    }
  }, [isGuestMode, notifications]);

  // Safe parameters updater for User profile inside RTDB
  const updateUserProfileDocs = useCallback((uid: string, fields: Partial<UserProfile>) => {
    if (isGuestMode) {
      if (currentUserProfile && currentUserProfile.uid === uid) {
        const next = { ...currentUserProfile, ...fields };
        setCurrentUserProfile(next);
        saveLocalBackup({ currentUserProfile: next });
      } else if (partnerProfile && partnerProfile.uid === uid) {
        const next = { ...partnerProfile, ...fields };
        setPartnerProfile(next);
        saveLocalBackup({ partnerProfile: next });
      }
      return;
    }
    update(ref(rtdb, `users/${uid}`), fields);
  }, [isGuestMode, currentUserProfile, partnerProfile]);

  // Automatic day crossover reset hook
  // If the app is kept open when midnight passes, auto-reset the selectedDate to today
  // to ensure habits appear naturally unmarked for the new day
  useEffect(() => {
    let currentDayStr = getToday();

    const interval = setInterval(() => {
      const todayStr = getToday();
      if (todayStr !== currentDayStr) {
        currentDayStr = todayStr;
        setSelectedDate(new Date());
        triggerToast("Um novo dia amanheceu! Seus hábitos diários foram renovados para começarem novamente. ☀️🌱");
      }
    }, 20000); // Check every 20 seconds

    return () => clearInterval(interval);
  }, []);

  // Validate daily streak and grant rewards on startup/day change
  useEffect(() => {
    if (!currentUserProfile || habitsData.length === 0) return;

    const todayStr = getToday();
    const lastValidated = localStorage.getItem(`streak_val_${currentUserProfile.uid}`);
    
    // If we already validated for today, skip!
    if (lastValidated === todayStr) return;

    // We need to validate yesterday's performance to update streak & rewards
    const yesterdayStr = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return formatLocalYMD(d);
    })();

    // Find if user had active habits yesterday
    const activeYesterday = habitsData.filter(h => isHabitActiveOnDate(h, yesterdayStr));
    
    // Only check if they actually had active habits yesterday
    if (activeYesterday.length > 0) {
      const doneYesterday = activeYesterday.filter(h => h.completedBy?.[yesterdayStr]?.[currentUserProfile.uid] === true).length;
      const completionRate = doneYesterday / activeYesterday.length;

      // If they finished at least 50% of active habits, they maintain/increment streak and get reward
      if (completionRate >= 0.5) {
        // Increment streak & award coins and XP
        const newStreak = (currentUserProfile.streak || 0) + 1;
        const xpBonus = 50;
        const coinsBonus = 30;

        const nextXP = (currentUserProfile.xp || 0) + xpBonus;
        const nextCoins = (currentUserProfile.flowCoins || 0) + coinsBonus;
        const nextLevel = Math.floor(nextXP / 1000) + 1;

        updateUserProfileDocs(currentUserProfile.uid, {
          streak: newStreak,
          xp: nextXP,
          flowCoins: nextCoins,
          level: nextLevel
        });

        triggerToast(`🎉 Ofensiva Mantida! Ontem você completou ${doneYesterday}/${activeYesterday.length} hábitos. Bônus Diário: +${coinsBonus} Moedas (+${xpBonus} XP)! ⚡`);
        recordFeedEvent('habit_completed', `manteve uma linda ofensiva de hábitos de ontem (+${coinsBonus} Moedas de Bônus)! \`Ofensiva Atual: ${newStreak} dias\``);
      } else {
        // Did not complete enough, reset streak to 0
        updateUserProfileDocs(currentUserProfile.uid, {
          streak: 0
        });
        triggerToast("Sua ofensiva de hábitos foi reiniciada. Que tal recomeçar com tudo hoje? 💪🌱", true);
      }
    } else {
      // 0 active habits yesterday = free day, keep streak intact, but no bonus
      triggerToast("Ontem não houve hábitos agendados! Sua ofensiva continua protegida. 🛡️✨");
    }

    // Save validation state
    localStorage.setItem(`streak_val_${currentUserProfile.uid}`, todayStr);
  }, [currentUserProfile?.uid, habitsData, updateUserProfileDocs, recordFeedEvent]);

  // Sound/Confetti reward rules logic for completions
  const handleHabitCompletedReward = useCallback((gained: boolean, isSpiritual: boolean, title: string) => {
    if (!currentUserProfile) return;
    
    // Individual Reward values 
    const xpDiff = gained ? 10 + (isSpiritual ? 5 : 0) : -(10 + (isSpiritual ? 5 : 0));
    const coinsDiff = gained ? 10 : -10;

    const nextXP = Math.max(0, currentUserProfile.xp + xpDiff);
    const nextCoins = Math.max(0, currentUserProfile.flowCoins + coinsDiff);
    // Level formula: floor(XP / 1000) + 1
    const nextLevel = Math.floor(nextXP / 1000) + 1;

    updateUserProfileDocs(currentUserProfile.uid, {
      xp: nextXP,
      flowCoins: nextCoins,
      level: nextLevel
    });

    if (gained) {
      playCompletionSound();
      performVibe();
      recordFeedEvent('habit_completed', title, `+10 Moedas`);
      if (partnerProfile) {
        pushNotificationToUser(partnerProfile.uid, '🔥', `${currentUserProfile.name} concluiu o hábito: "${title}"`);
      }
    }
  }, [currentUserProfile, partnerProfile, updateUserProfileDocs, recordFeedEvent, pushNotificationToUser]);

  // Checkbox Habits Toggle Interaction
  const handleToggleHabit = useCallback((habitId: string, dateStr: string) => {
    const target = habitsData.find(h => h.id === habitId);
    if (!target || !currentUserProfile) return;

    const activeCompletions = target.completedBy?.[dateStr] || {};
    const isCompletedByMe = !!activeCompletions[currentUserProfile.uid];
    
    const nextCompletions = { ...activeCompletions };
    if (isCompletedByMe) {
      delete nextCompletions[currentUserProfile.uid];
    } else {
      nextCompletions[currentUserProfile.uid] = true;
    }

    const nextCompletedByNode = {
      ...(target.completedBy || {}),
      [dateStr]: nextCompletions
    };

    if (isGuestMode) {
      const nextList = habitsData.map(h => h.id === habitId ? { ...h, completedBy: nextCompletedByNode } : h);
      setHabitsData(nextList);
      saveLocalBackup({ habitsData: nextList });
    } else {
      update(ref(rtdb, `habits/${habitId}/completedBy`), {
        [dateStr]: nextCompletions
      });
    }

    // Trigger reward logic
    const wasJustCompleted = !isCompletedByMe;
    handleHabitCompletedReward(wasJustCompleted, target.tag === 'espiritual', target.title);

    // Couple complete reward rule trigger for shared habits
    if (wasJustCompleted && target.assignedTo === 'both' && partnerProfile) {
      const isCompletedByPartner = !!activeCompletions[partnerProfile.uid];
      if (isCompletedByPartner) {
        // Double match bonus! +20 XP to both members
        triggerConfetti();
        const nextXP_me = currentUserProfile.xp + 20;
        const nextXP_partner = partnerProfile.xp + 20;
        
        updateUserProfileDocs(currentUserProfile.uid, { xp: nextXP_me, level: Math.floor(nextXP_me / 1000) + 1 });
        updateUserProfileDocs(partnerProfile.uid, { xp: nextXP_partner, level: Math.floor(nextXP_partner / 1000) + 1 });

        recordFeedEvent('daily_challenge_completed', `🔥 DUPLA CONEXÃO: Ambos fizeram "${target.title}"!`, `Bônus: +20 XP`);
        pushNotificationToUser(partnerProfile.uid, '💑', `Cooperação Completa! Vocês dois concluíram o hábito "${target.title}" e ganharam +20 XP de bônus!`);
      }
    }
  }, [habitsData, currentUserProfile, partnerProfile, isGuestMode, handleHabitCompletedReward, updateUserProfileDocs, recordFeedEvent, pushNotificationToUser]);

  // Dynamic Energy Battery calculator
  const collectiveBatteryLevel = useMemo(() => {
    if (habitsData.length === 0) return 100;
    const todayStr = getToday();
    const activeToday = habitsData.filter(h => isHabitActiveOnDate(h, todayStr));
    if (activeToday.length === 0) return 100;

    let points = 0;
    let maxPoints = 0;

    activeToday.forEach(h => {
      if (h.assignedTo === 'both') {
        maxPoints += 2;
        if (currentUserProfile && h.completedBy?.[todayStr]?.[currentUserProfile.uid]) points += 1;
        if (partnerProfile && h.completedBy?.[todayStr]?.[partnerProfile.uid]) points += 1;
      } else {
        maxPoints += 1;
        const assignedUid = h.assignedTo;
        if (h.completedBy?.[todayStr]?.[assignedUid]) points += 1;
      }
    });

    return maxPoints > 0 ? Math.round((points / maxPoints) * 100) : 100;
  }, [habitsData, currentUserProfile, partnerProfile]);

  // Tasks Interaction
  const handleToggleTask = useCallback((taskId: string) => {
    const target = tasksData.find(t => t.id === taskId);
    if (!target || !currentUserProfile) return;

    const nextCompleted = !target.completed;
    const xpDiff = nextCompleted ? 15 : -15;
    const coinsDiff = nextCompleted ? 10 : -10;

    updateUserProfileDocs(currentUserProfile.uid, {
      xp: Math.max(0, currentUserProfile.xp + xpDiff),
      flowCoins: Math.max(0, currentUserProfile.flowCoins + coinsDiff),
      level: Math.floor(Math.max(0, currentUserProfile.xp + xpDiff) / 1000) + 1
    });

    if (isGuestMode) {
      const nextList = tasksData.map(t => t.id === taskId ? { ...t, completed: nextCompleted } : t);
      setTasksData(nextList);
      saveLocalBackup({ tasksData: nextList });
    } else {
      update(ref(rtdb, `tasks/${taskId}`), { completed: nextCompleted });
    }

    if (nextCompleted) {
      playCompletionSound();
      triggerConfetti();
      recordFeedEvent('task_completed', target.title, `+15 XP`);
      if (partnerProfile) {
        pushNotificationToUser(partnerProfile.uid, '✅', `${currentUserProfile.name} marcou a tarefa como feita: "${target.title}"`);
      }
    }
  }, [tasksData, currentUserProfile, partnerProfile, isGuestMode, updateUserProfileDocs, recordFeedEvent, pushNotificationToUser]);

  const handleTaskReactionSubmit = useCallback((taskId: string, reaction: string) => {
    const target = tasksData.find(t => t.id === taskId);
    if (!target || !currentUserProfile) return;
    
    recordFeedEvent('mood_changed', `reagiu com ${reaction} em: "${target.title}"`);
    if (partnerProfile) {
      pushNotificationToUser(partnerProfile.uid, reaction, `${currentUserProfile.name} enviou um ${reaction} para você na tarefa concluída!`);
    } else {
      triggerToast(`Você reagiu ${reaction} a esta tarefa.`);
    }
  }, [tasksData, currentUserProfile, partnerProfile, recordFeedEvent, pushNotificationToUser]);

  const handleHabitReactionSubmit = useCallback((habitId: string, dateStr: string, targetUid: string, reaction: string) => {
    const target = habitsData.find(h => h.id === habitId);
    if (!target || !currentUserProfile) return;

    const nextReactionsOnDate = {
      ...(target.reactions?.[dateStr] || {})
    };

    if (reaction === '') {
      delete nextReactionsOnDate[targetUid];
    } else {
      nextReactionsOnDate[targetUid] = reaction;
    }

    const nextReactionsNode = {
      ...(target.reactions || {}),
      [dateStr]: nextReactionsOnDate
    };

    if (isGuestMode) {
      const nextList = habitsData.map(h => h.id === habitId ? { ...h, reactions: nextReactionsNode } : h);
      setHabitsData(nextList);
      saveLocalBackup({ habitsData: nextList });
    } else {
      update(ref(rtdb, `habits/${habitId}/reactions`), {
        [dateStr]: nextReactionsOnDate
      });
    }

    if (reaction !== '') {
      recordFeedEvent('mood_changed', `reagiu com ${reaction} no hábito de: "${target.title}"`);
      if (partnerProfile) {
        pushNotificationToUser(partnerProfile.uid, reaction, `${currentUserProfile.name} reagiu com ${reaction} no seu hábito concluído: "${target.title}"!`);
      } else {
        triggerToast(`Você reagiu ${reaction} ao hábito.`);
      }
    }
  }, [habitsData, currentUserProfile, partnerProfile, isGuestMode, recordFeedEvent, pushNotificationToUser]);

  // CRUD tasks
  const handleSaveTask = useCallback((taskPartial: Partial<Task>) => {
    if (!currentUserProfile || !currentUserProfile.coupleId) return;
    const cid = currentUserProfile.coupleId;

    if (taskPartial.id) {
      // Edit
      if (isGuestMode) {
        const next = tasksData.map(t => t.id === taskPartial.id ? { ...t, ...taskPartial } as Task : t);
        setTasksData(next);
        saveLocalBackup({ tasksData: next });
      } else {
        update(ref(rtdb, `tasks/${taskPartial.id}`), taskPartial);
      }
      triggerToast('Tarefa atualizada!');
    } else {
      // Create
      const newId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
      const newTask: Task = {
        id: newId,
        title: taskPartial.title || 'Nova Tarefa',
        icon: taskPartial.icon || '📋',
        priority: taskPartial.priority || 'medium',
        assignedTo: taskPartial.assignedTo || 'both',
        dueDate: taskPartial.dueDate || null,
        completed: false,
        createdBy: currentUserProfile.uid,
        coupleId: cid,
        createdAt: Date.now()
      };

      if (isGuestMode) {
        const next = [...tasksData, newTask];
        setTasksData(next);
        saveLocalBackup({ tasksData: next });
      } else {
        set(ref(rtdb, `tasks/${newId}`), newTask);
      }

      recordFeedEvent('task_completed', `adicionou tarefa: "${newTask.title}"`);
      triggerToast('Tarefa criada no dever!');
    }
  }, [tasksData, currentUserProfile, isGuestMode, recordFeedEvent]);

  const handleDeleteTask = useCallback((taskId: string) => {
    if (!confirm('Deseja deletar esta responsabilidade do casal?')) return;
    if (isGuestMode) {
      const next = tasksData.filter(t => t.id !== taskId);
      setTasksData(next);
      saveLocalBackup({ tasksData: next });
    } else {
      remove(ref(rtdb, `tasks/${taskId}`));
    }
    triggerToast('Tarefa deletada.');
  }, [tasksData, isGuestMode]);

  // CRUD habits
  const handleSaveHabit = useCallback((habitPartial: Partial<Habit>) => {
    if (!currentUserProfile || !currentUserProfile.coupleId) return;
    const cid = currentUserProfile.coupleId;

    if (habitPartial.id) {
      // Edit
      if (isGuestMode) {
        const next = habitsData.map(h => h.id === habitPartial.id ? { ...h, ...habitPartial } as Habit : h);
        setHabitsData(next);
        saveLocalBackup({ habitsData: next });
      } else {
        update(ref(rtdb, `habits/${habitPartial.id}`), habitPartial);
      }
      triggerToast('Hábito editado com sucesso!');
    } else {
      // Create
      const newId = `hab_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
      const newHabit: Habit = {
        id: newId,
        title: habitPartial.title || 'Novo Hábito',
        icon: habitPartial.icon || '❤️',
        tag: habitPartial.tag || 'amor',
        coupleId: cid,
        createdBy: currentUserProfile.uid,
        assignedTo: habitPartial.assignedTo || 'both',
        frequency: habitPartial.frequency || { type: 'daily' },
        createdAt: Date.now(),
        order: habitsData.length
      };

      if (isGuestMode) {
        const next = [...habitsData, newHabit];
        setHabitsData(next);
        saveLocalBackup({ habitsData: next });
      } else {
        set(ref(rtdb, `habits/${newId}`), newHabit);
      }

      recordFeedEvent('habit_completed', `criou hábito: "${newHabit.title}"`);
      triggerToast('Novo Hábito agendado!');
    }
  }, [habitsData, currentUserProfile, isGuestMode, recordFeedEvent]);

  const handleDeleteHabit = useCallback((habitId: string) => {
    if (!confirm('Excluir este hábito do casal definitivamente?')) return;
    if (isGuestMode) {
      const next = habitsData.filter(h => h.id !== habitId);
      setHabitsData(next);
      saveLocalBackup({ habitsData: next });
    } else {
      remove(ref(rtdb, `habits/${habitId}`));
    }
    triggerToast('Hábito excluído.');
  }, [habitsData, isGuestMode]);

  const handleMoveHabitsIndex = useCallback((id: string, dir: 'up' | 'down') => {
    const list = [...habitsData].sort((a,b) => (a.order || 0) - (b.order || 0));
    const idx = list.findIndex(h => h.id === id);
    if (idx === -1) return;

    if (dir === 'up' && idx > 0) {
      [list[idx], list[idx - 1]] = [list[idx - 1], list[idx]];
    } else if (dir === 'down' && idx < list.length - 1) {
      [list[idx], list[idx + 1]] = [list[idx + 1], list[idx]];
    }

    const reordered = list.map((h, i) => ({ ...h, order: i }));
    setHabitsData(reordered);
    
    if (isGuestMode) {
      saveLocalBackup({ habitsData: reordered });
    } else {
      reordered.forEach(item => {
        update(ref(rtdb, `habits/${item.id}`), { order: item.order });
      });
    }
  }, [habitsData, isGuestMode]);

  // Troca de Recompensa (Gift care purchase)
  const handlePurchaseReward = (rewardId: string) => {
    const selected = rewardsData.find(r => r.id === rewardId);
    if (!selected || !currentUserProfile) return;

    if (currentUserProfile.flowCoins < selected.cost) {
      triggerToast(`Moedas insuficientes! Você precisa de ${selected.cost} FaithCoins.`, true);
      return;
    }

    // Deduct coins and unlock
    const nextCoins = currentUserProfile.flowCoins - selected.cost;
    const gainedXP = 30; // purchasing reward for partner grants XP to purchaser!
    const nextXP = currentUserProfile.xp + gainedXP;

    updateUserProfileDocs(currentUserProfile.uid, {
      flowCoins: nextCoins,
      xp: nextXP,
      level: Math.floor(nextXP / 1000) + 1
    });

    // Mark reward unlocked details
    const nextUnlocked = {
      unlockedAt: Date.now(),
      unlockedBy: currentUserProfile.uid,
      claimed: false
    };

    if (isGuestMode) {
      const nextList = rewardsData.map(r => r.id === rewardId ? { ...r, ...nextUnlocked } : r);
      setRewardsData(nextList);
      saveLocalBackup({ rewardsData: nextList });
    } else {
      update(ref(rtdb, `rewards/${currentUserProfile.coupleId}/${rewardId}`), nextUnlocked);
    }

    playCompletionSound();
    triggerConfetti();

    const forPartnerMsg = partnerProfile ? `para ${partnerProfile.name}` : '';
    recordFeedEvent('reward_unlocked', `🎁 presenteou e liberou a recompensa: "${selected.title}" ${forPartnerMsg}!`);
    
    if (partnerProfile) {
      pushNotificationToUser(partnerProfile.uid, '🎁', `AMOR SURPRESA! ${currentUserProfile.name} desbloqueou o prêmio "${selected.icon} ${selected.title}" para você! Exija no carinho.`);
    }

    triggerToast(`Desbloqueado! Você presenteou com "${selected.title}"! 💖`);
  };

  const handleClaimReward = (rewardId: string) => {
    if (!currentUserProfile || !currentUserProfile.coupleId) return;

    if (isGuestMode) {
      const nextList = rewardsData.map(r => r.id === rewardId ? { ...r, claimed: true } : r);
      setRewardsData(nextList);
      saveLocalBackup({ rewardsData: nextList });
    } else {
      update(ref(rtdb, `rewards/${currentUserProfile.coupleId}/${rewardId}`), { claimed: true });
    }

    recordFeedEvent('reward_unlocked', `marcou prêmio recebido como entregue/desfrutado! 🎉`);
    triggerToast('Recompensa desfrutada e resgatada! 🥰');
  };

  const handleEditRewardClick = (item: RewardStoreItem) => {
    if (!isJosiel) {
      triggerToast('Apenas o Josiel pode editar os mimos! 🤫', true);
      return;
    }
    setEditingReward(item);
    setNewRewTitle(item.title);
    setNewRewDesc(item.description);
    setNewRewCost(item.cost);
    setNewRewIcon(item.icon || '🎁');
    setShowCustomRewardModal(true);
  };

  const handleDeleteReward = (rewardId: string) => {
    if (!currentUserProfile) return;
    if (!isJosiel) {
      triggerToast('Apenas o Josiel pode remover mimos! 🤫', true);
      return;
    }
    
    if (confirm(`Tem certeza que deseja remover este mimo?`)) {
      if (isGuestMode) {
        const next = rewardsData.filter(r => r.id !== rewardId);
        setRewardsData(next);
        saveLocalBackup({ rewardsData: next });
      } else {
        remove(ref(rtdb, `rewards/${currentUserProfile.coupleId}/${rewardId}`));
      }
      triggerToast('Mimo removido com sucesso!');
    }
  };

  const handleCloseRewardModal = () => {
    setShowCustomRewardModal(false);
    setEditingReward(null);
    setNewRewTitle('');
    setNewRewDesc('');
    setNewRewCost(300);
    setNewRewIcon('🎁');
  };

  const handleOpenNewRewardModal = () => {
    if (!isJosiel) {
      triggerToast('Apenas o Josiel pode criar novos mimos! 🤫', true);
      return;
    }
    setEditingReward(null);
    setNewRewTitle('');
    setNewRewDesc('');
    setNewRewCost(300);
    setNewRewIcon('🎁');
    setShowCustomRewardModal(true);
  };

  const handleAddCustomRewardSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newRewTitle.trim() || !currentUserProfile) return;
    if (!isJosiel) {
      triggerToast('Apenas o Josiel pode criar ou modificar mimos! 🤫', true);
      return;
    }

    if (editingReward) {
      const updatedRew: RewardStoreItem = {
        ...editingReward,
        title: newRewTitle.trim(),
        description: newRewDesc.trim() || 'Sem descrição.',
        cost: Number(newRewCost) || 300,
        icon: newRewIcon
      };

      if (isGuestMode) {
        const next = rewardsData.map(r => r.id === editingReward.id ? updatedRew : r);
        setRewardsData(next);
        saveLocalBackup({ rewardsData: next });
      } else {
        set(ref(rtdb, `rewards/${currentUserProfile.coupleId}/${editingReward.id}`), updatedRew);
      }

      triggerToast(`Mimo "${newRewTitle}" atualizado com sucesso!`);
    } else {
      const newId = `rew_${Date.now()}`;
      const customRew: RewardStoreItem = {
        id: newId,
        title: newRewTitle.trim(),
        description: newRewDesc.trim() || 'Criada com carinho pelo casal.',
        cost: Number(newRewCost) || 300,
        icon: newRewIcon,
        coupleId: currentUserProfile.coupleId || 'guest',
        createdBy: currentUserProfile.uid,
        targetUserId: 'both'
      };

      if (isGuestMode) {
        const next = [...rewardsData, customRew];
        setRewardsData(next);
        saveLocalBackup({ rewardsData: next });
      } else {
        set(ref(rtdb, `rewards/${currentUserProfile.coupleId}/${newId}`), customRew);
      }

      triggerToast(`Loja de Afeto: "${newRewTitle}" adicionada com sucesso!`);
    }

    handleCloseRewardModal();
  };

  // Daily Challenge Connection Completer Check
  const todayChallenge = useMemo(() => getDailyChallenge(), []);
  const isChallengeCompletedToday = useMemo(() => {
    return couple?.dailyChallengeCompletedDate === getToday();
  }, [couple]);

  const handleToggleDailyChallenge = useCallback(() => {
    if (!currentUserProfile || !couple) return;
    const todayStr = getToday();
    const isCompleted = couple.dailyChallengeCompletedDate === todayStr;
    const nextDate = isCompleted ? "" : todayStr;
    
    // Reward/Deduct level XP (+30 XP for couple challenge!)
    const activeXPDiff = 30;
    const nextXP = Math.max(0, isCompleted ? currentUserProfile.xp - activeXPDiff : currentUserProfile.xp + activeXPDiff);
    
    updateUserProfileDocs(currentUserProfile.uid, {
      xp: nextXP,
      level: Math.floor(nextXP / 1000) + 1
    });

    if (isGuestMode) {
      const nextC = { ...couple, dailyChallengeCompletedDate: nextDate };
      setCouple(nextC);
      saveLocalBackup({ couple: nextC });
    } else {
      update(ref(rtdb, `couples/${couple.id}`), { dailyChallengeCompletedDate: nextDate });
    }

    if (!isCompleted) {
      playCompletionSound();
      triggerConfetti();
      performVibe();
      recordFeedEvent('daily_challenge_completed', `marcou o Desafio de Casal de Hoje: "${todayChallenge.title}" (+30 XP)!`);
      if (partnerProfile) {
        pushNotificationToUser(partnerProfile.uid, '💖', `${currentUserProfile.name} concluiu o Desafio de Casal de Hoje!`);
      }
    } else {
      triggerToast('Desafio de Casal desmarcado');
    }
  }, [currentUserProfile, couple, partnerProfile, isGuestMode, recordFeedEvent, pushNotificationToUser, updateUserProfileDocs, todayChallenge]);

  // Filter habits for current active simulated person and selected date
  const visibleHabits = useMemo(() => {
    if (!currentUserProfile) return [];
    const dateStr = formatLocalYMD(selectedDate);
    return habitsData.filter(h => {
      const assigned = h.assignedTo === 'both' || h.assignedTo === currentUserProfile.uid;
      return assigned && isHabitActiveOnDate(h, dateStr);
    }).sort((a,b) => (a.order || 0) - (b.order || 0));
  }, [habitsData, currentUserProfile, selectedDate]);

  // Notifications bell actions
  const handleMarkNotificationRead = (notifId: string) => {
    if (isGuestMode) {
      const next = notifications.map(n => n.id === notifId ? { ...n, read: true } : n);
      setNotifications(next);
      saveLocalBackup({ notifications: next });
    } else if (user) {
      update(ref(rtdb, `notifications/${user.uid}/${notifId}`), { read: true });
    }
  };

  const handleClearAllNotifications = () => {
    if (isGuestMode) {
      setNotifications([]);
      saveLocalBackup({ notifications: [] });
    } else if (user) {
      remove(ref(rtdb, `notifications/${user.uid}`));
    }
    triggerToast('Notificações limpas');
  };

  const handleUpdateCoupleName = useCallback((name: string) => {
    if (!couple) return;
    if (isGuestMode) {
      const nextC = { ...couple, relationshipName: name };
      setCouple(nextC);
      saveLocalBackup({ couple: nextC });
    } else {
      update(ref(rtdb, `couples/${couple.id}`), { relationshipName: name });
    }
  }, [couple, isGuestMode]);

  const handleUpdateCoupleAnniversary = useCallback((dateStr: string) => {
    if (!couple) return;
    if (isGuestMode) {
      const nextC = { ...couple, anniversaryDate: dateStr };
      setCouple(nextC);
      saveLocalBackup({ couple: nextC });
    } else {
      update(ref(rtdb, `couples/${couple.id}`), { anniversaryDate: dateStr });
    }
  }, [couple, isGuestMode]);

  const handleUpdateCoupleSetting = useCallback((key: string, value: any) => {
    if (!couple) return;
    if (isGuestMode) {
      const nextC = { ...couple, [key]: value };
      setCouple(nextC);
      saveLocalBackup({ couple: nextC });
    } else {
      update(ref(rtdb, `couples/${couple.id}`), { [key]: value });
    }
  }, [couple, isGuestMode]);

  // Image upload handler
  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !couple) return;

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          let width = image.width;
          let height = image.height;
          const MAX_SIZE = 300; 
          
          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
              height = (height / width) * MAX_SIZE;
              width = MAX_SIZE;
            } else {
              width = (width / height) * MAX_SIZE;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(image, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.5);
          
          if (isGuestMode) {
            const nextC = { ...couple, couplePhoto: compressed };
            setCouple(nextC);
            saveLocalBackup({ couple: nextC });
          } else {
            update(ref(rtdb, `couples/${couple.id}`), { couplePhoto: compressed });
          }
          triggerToast('Foto do casal atualizada com sucesso!');
        };
        image.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      triggerToast('Falha ao processar arquivo.', true);
    }
  };

  const unreadNotifsCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  // Quick activity logs layout for notifications count count
  const rankingLabel = useMemo(() => {
    if (!currentUserProfile || !partnerProfile) return '';
    if (currentUserProfile.xp === partnerProfile.xp) return 'Empate Técnico 🤝';
    return currentUserProfile.xp > partnerProfile.xp 
      ? `🥇 Você está liderando! (+${currentUserProfile.xp - partnerProfile.xp} XP)` 
      : `🥈 ${partnerProfile.name} está na liderança por ${partnerProfile.xp - currentUserProfile.xp} XP`;
  }, [currentUserProfile, partnerProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="text-4xl animate-bounce mb-3 select-none">💖</div>
        <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 w-1/2 animate-loading-bar rounded-full"></div>
        </div>
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mt-3">Carregando Conexão...</span>
      </div>
    );
  }

  // LOGIN & REGISTER GATE
  if (showHomeView && !user && !isGuestMode) {
    return (
      <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Lights backdrops */}
        <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-pink-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-md w-full bg-card/60 backdrop-blur-xl border border-primary/20 rounded-3xl p-6 shadow-2xl relative z-10 text-center space-y-6">
          <div className="space-y-2 select-none">
            <span className="text-4xl animate-pulse inline-block">💑</span>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-400 to-pink-500 bg-clip-text text-transparent">
              HabitFlow • Casal
            </h1>
            <p className="text-xs text-secondary leading-normal max-w-sm mx-auto">
              O sistema operacional completo para o casal planejar, cooperar nos deveres e evoluir lado a lado.
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4 text-left">
            {authErrorAlert && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium leading-relaxed">
                ⚠️ {authErrorAlert}
              </div>
            )}

            <div>
              <label className="text-[11px] text-secondary font-bold uppercase tracking-wider mb-1 block">Endereço de E-mail:</label>
              <input 
                type="email" 
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-secondary/10 border border-primary/25 text-primary text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 font-medium"
                placeholder="Ex: josiel@gmail.com"
                required
              />
            </div>

            <div>
              <label className="text-[11px] text-secondary font-bold uppercase tracking-wider mb-1 block">Senha Secreta:</label>
              <input 
                type="password" 
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-secondary/10 border border-primary/25 text-primary text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 font-medium"
                placeholder="Mínimo de 6 caracteres"
                required
              />
            </div>

            <button 
              type="submit"
              disabled={submittingAuth}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/15 cursor-pointer hover:brightness-110 active:scale-98 transition-all disabled:opacity-50"
            >
              {submittingAuth ? 'Verificando logs...' : isSignMode ? 'Criar Minha Conta ✨' : 'Entrar na Aliança 👋'}
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-primary/10"></div>
            <span className="flex-shrink mx-3 text-[10px] text-secondary uppercase font-bold tracking-widest leading-none">Ou prefira</span>
            <div className="flex-grow border-t border-primary/10"></div>
          </div>

          <div className="flex flex-col gap-2.5">
            <button 
              onClick={() => setIsSignMode(!isSignMode)}
              className="text-xs font-bold text-teal-400 hover:text-teal-300 bg-none border-0 block mx-auto cursor-pointer"
            >
              {isSignMode ? 'Já tem conta? Fazer Login' : 'Não tem conta? Registrar parceiros'}
            </button>

            <button 
              onClick={handleGuestEntry}
              className="w-full py-2.5 rounded-2xl bg-secondary/10 hover:bg-secondary/20 border border-primary/15 text-primary font-bold text-xs cursor-pointer transition-colors"
            >
              🔬 Explorar Modo Teste Local (Sem registro)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // WELCOME AND PAIRING INVITE CODE SCREEN
  if (currentUserProfile && !currentUserProfile.coupleId) {
    return (
      <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center p-4 relative font-sans text-white">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-pink-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-md w-full bg-card/70 border border-primary/20 backdrop-blur-xl rounded-3xl p-6 shadow-2xl relative z-1 p-6 space-y-6 text-center">
          <div className="space-y-1.5 select-none">
            <span className="text-3xl">🔗</span>
            <h2 className="text-xl font-extrabold text-primary tracking-tight">Vincular Conta de Casal</h2>
            <p className="text-xs text-secondary max-w-xs mx-auto leading-normal">
              Para integrar as rotinas, você precisa gerar um link de proximidade ou entrar no convite enviado pelo seu parceiro.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {!isWaitingPartnerLink ? (
              <motion.div 
                key="options"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-5"
              >
                {/* User Info Customizer before Linking */}
                <div className="bg-secondary/5 border border-primary/10 rounded-2xl p-4 text-left space-y-2.5">
                  <span className="text-[10px] text-teal-400 font-bold uppercase block tracking-wider">Identidade Própria</span>
                  <div className="flex gap-2 items-center">
                    <Smile className="w-5 h-5 text-emerald-400" />
                    <input 
                      type="text"
                      className="bg-transparent border-0 font-bold text-sm text-primary focus:outline-none w-full border-b border-primary/20 pb-0.5"
                      value={currentUserProfile.name}
                      onChange={e => {
                        updateUserProfileDocs(currentUserProfile.uid, { name: e.target.value });
                      }}
                      placeholder="Seu Nome Humano"
                    />
                  </div>
                  <span className="text-[9px] text-secondary leading-normal block">Configure como seu amor te verá no placar de pontuações de hábitos.</span>
                </div>

                <div className="bg-primary/5 p-4 border border-primary/10 rounded-2xl space-y-3.5 text-left">
                  <h3 className="text-xs font-bold text-primary tracking-wider uppercase leading-none block">Opção 1: Gerar Código</h3>
                  <p className="text-[11px] text-secondary leading-normal">Gere o código aleatório secreto e compartilhe com seu amor para sincronizar real-time.</p>
                  <button
                    onClick={handleCreateCoupleId}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-xs shadow-md shadow-emerald-500/10 cursor-pointer"
                  >
                    Gerar Código de Parceria ✨
                  </button>
                </div>

                <div className="text-[10px] font-extrabold uppercase tracking-widest text-secondary select-none">Ou se preferir</div>

                <div className="bg-primary/5 p-4 border border-primary/10 rounded-2xl space-y-3.5 text-left">
                  <h3 className="text-xs font-bold text-primary tracking-wider uppercase leading-none block">Opção 2: Entrar com Código</h3>
                  <p className="text-[11px] text-secondary leading-normal">Se o seu parceiro(a) já gerou, digite ou cole o código no campo abaixo:</p>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      maxLength={6}
                      value={joinCodeInput}
                      onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                      className="bg-secondary/15 uppercase font-black text-center text-sm font-mono tracking-widest text-primary focus:outline-none focus:border-pink-500 border border-primary/25 rounded-xl px-3 py-2 flex-grow"
                      placeholder="Ex: X9K2LP"
                    />
                    <button
                      onClick={handleJoinCouple}
                      className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-xs shadow-md"
                    >
                      Unir Casal 💑
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="waiting"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6 py-4"
              >
                <div className="space-y-2">
                  <span className="text-[10px] text-secondary font-bold block uppercase tracking-wide">CÓDIGO DE PARCERIA</span>
                  <div className="text-4xl font-extrabold tracking-widest font-mono text-emerald-400 select-all p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 inline-block font-mono">
                    {myCreatedInviteCode}
                  </div>
                </div>

                {/* Simulated Radar Scanner animation */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative w-11 h-11 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping"></div>
                    <div className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center text-white text-[9px] font-bold">✓</div>
                  </div>
                  <span className="text-xs text-emerald-400 font-bold">Aguardando parceiro vincular...</span>
                  <p className="text-[11px] text-secondary max-w-xs leading-normal">
                    Seu casal começará assim que seu parceiro(a) entrar no app e digitar o código <strong className="text-primary">{myCreatedInviteCode}</strong>.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      // Let them test guest account matching right inside sandbox preview
                      if (isGuestMode && couple) {
                        const updatedMembers = { ...couple.members, 'uid_zipora': true };
                        const updatedCouple = { ...couple, members: updatedMembers, relationshipName: 'Josiel ❤️ Zípora' };
                        setCouple(updatedCouple);
                        
                        const updatedPartner: UserProfile = {
                          uid: 'uid_zipora',
                          name: 'Zípora',
                          email: 'zipora@gmail.com',
                          photoURL: null,
                          coupleId: myCreatedInviteCode,
                          xp: 0,
                          level: 1,
                          streak: 0,
                          flowCoins: 300,
                          createdAt: Date.now(),
                          mood: '😊'
                        };
                        setPartnerProfile(updatedPartner);
                        saveLocalBackup({ couple: updatedCouple, partnerProfile: updatedPartner });
                        triggerToast('Simulação: Zípora juntou-se via código!');
                        setIsWaitingPartnerLink(false);
                      } else {
                        setIsWaitingPartnerLink(false);
                      }
                    }}
                    className="flex-1 py-2 bg-secondary/10 hover:bg-secondary/20 rounded-xl text-secondary text-xs font-bold"
                  >
                    {isGuestMode ? 'Simular Entrada Parceiro 💑' : 'Voltar / Cancelar'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-2">
            <button 
              onClick={handleSignOut}
              className="text-xs font-medium text-secondary/60 hover:text-red-400 flex items-center gap-1.5 mx-auto bg-none border-0"
            >
              <LogOut className="w-3.5 h-3.5" /> Sair da conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CORE APPLICATION DASHBOARD
  return (
    <div className="min-h-screen bg-[#070b13] text-white pb-24 relative overflow-x-hidden font-sans">
      {/* Light highlights backdrop */}
      <div className="absolute top-0 right-0 w-[450px] h-[300px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -top-12 left-0 w-[400px] h-[300px] bg-pink-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* FIXED TOP HEADER BAR */}
      <header className="sticky top-0 z-40 bg-[#070b13]/85 backdrop-blur-xl border-b border-primary/10 select-none">
        
        {/* Preview Sandbox Simulation Toolbar (Super handy for AI Studio iframe check) */}
        <div className="bg-amber-500/10 border-b border-amber-500/15 py-1 px-4 flex justify-between items-center text-[10.5px]">
          <div className="flex items-center gap-1.5 text-amber-500 font-bold font-sans">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>MODO SIMULADOR DO CASAL</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-secondary">Conectado como: <strong className="text-primary">{currentUserProfile?.name}</strong></span>
            {partnerProfile && (
              <button 
                onClick={handleToggleSimulationLogged}
                style={{ padding: '2px 8px' }}
                className="bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 text-amber-300 rounded-md font-bold transition-all shrink-0 cursor-pointer"
              >
                Alternar Papel 💑
              </button>
            )}
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between gap-2.5">
          {/* Couple profiles row info */}
          <div className="flex items-center gap-2">
            <div className="photo-circle border-pink-500/35 w-10 h-10 relative overflow-hidden flex-shrink-0 bg-gradient-to-tr from-pink-500 to-emerald-500">
              {couple?.couplePhoto ? (
                <img src={couple.couplePhoto} className="w-full h-full object-cover" alt="Casal" />
              ) : (
                <span className="text-lg select-none">💑</span>
              )}
            </div>

            <div className="min-w-0">
              <h1 className="text-xs font-bold text-primary truncate leading-none mb-1 font-serif">
                {couple?.relationshipName || 'HabitFlow Casal'}
              </h1>
              <span className="text-[10px] text-pink-400 font-extrabold flex items-center gap-1 font-sans">
                💖 Aliança de Amor
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Bell/Notification trigger */}
            <div className="relative">
              <button 
                onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-secondary border border-primary/20 backdrop-blur-md transition-all hover:bg-secondary/10 cursor-pointer ${
                  unreadNotifsCount > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : ''
                }`}
              >
                <Bell className={`w-4.5 h-4.5 ${unreadNotifsCount > 0 ? 'animate-bounce text-emerald-400' : ''}`} />
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px] font-extrabold ring-2 ring-[#070b13]">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>
              
              <AnimatePresence>
                {showNotificationsMenu && (
                  <NotificationPanel 
                    notifications={notifications} 
                    onMarkRead={handleMarkNotificationRead} 
                    onClearAll={handleClearAllNotifications}
                    onClose={() => setShowNotificationsMenu(false)} 
                    partnerProfile={partnerProfile}
                    currentUserProfile={currentUserProfile}
                    onSendNotification={pushNotificationToUser}
                    onRecordFeedEvent={recordFeedEvent}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Logout icon */}
            <button 
              onClick={handleSignOut}
              className="w-9 h-9 rounded-xl border border-primary/20 bg-secondary/5 hover:bg-red-950/20 hover:text-red-400 flex items-center justify-center text-secondary transition-colors cursor-pointer"
              title="Encerrar Sessão"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* COMPACT FLOANTING TOAST NOTIFICATIONS */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] max-w-sm w-[90%] pointer-events-none"
          >
            <div className={`p-4 rounded-2xl shadow-xl flex items-center gap-2 border text-xs font-semibold leading-relaxed tracking-wide backdrop-blur-xl ${
              toast.error 
                ? 'bg-red-500/10 border-red-500/30 text-red-500' 
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              <span>{toast.error ? '⚠️' : '✨'}</span>
              <span>{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-md mx-auto px-4 mt-4 space-y-4 font-sans">
        
        {/* COMPREHENSIVE STATS & INDIVIDUAL METRICS */}
        {nav !== 'habits' && currentUserProfile && (
          <div className="bg-gradient-to-br from-slate-900 via-slate-900/60 to-zinc-900/80 border border-primary/20 rounded-3xl p-4.5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>
            
            {/* Energy Systems battery bar */}
            {nav !== 'habits' && (
              <div className="flex justify-between items-center bg-secondary/5 p-2 rounded-2xl border border-primary/10 mb-4 font-sans select-none">
                <span className="text-[10.5px] text-rose-400 font-extrabold uppercase flex items-center gap-1 ml-1 tracking-wider">
                  <Zap className="w-3.5 h-3.5 text-yellow-400 fill-current animate-pulse shrink-0" />
                  Energia do Casal
                </span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-xs font-black text-amber-400">{collectiveBatteryLevel}%</span>
                  <div className="w-24 h-2.5 bg-slate-950 rounded-full border border-primary/15 overflow-hidden flex">
                    <div 
                      className="h-full bg-gradient-to-r from-yellow-400 via-emerald-400 to-teal-400 transition-all duration-500 rounded-full" 
                      style={{ width: `${collectiveBatteryLevel}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Profiles comparisons ranking banner */}
            <div className="grid grid-cols-2 gap-3 pb-3 divide-x divide-primary/15">
              {/* Me profile stat details */}
              <div className="flex flex-col text-left px-1.5 min-w-0">
                <div className="flex items-center gap-1.5 select-none mb-0.5">
                  <span className="text-emerald-400 font-extrabold text-[10px] bg-emerald-500/10 border border-emerald-500/15 px-1.5 py-0.2 rounded-md font-sans uppercase">VOCÊ</span>
                  <span className="text-[10.5px] font-bold text-primary truncate capitalize font-sans">{currentUserProfile.name}</span>
                </div>
                <div className="flex items-baseline gap-1.5 mt-0.5 leading-none">
                  <span className="text-xl font-black text-primary font-mono">{currentUserProfile.xp}</span>
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-sans">XP Total</span>
                </div>
                
                {/* FlowCoins Bank */}
                {nav !== 'habits' && (
                  <span className="text-[10.5px] text-yellow-400 font-bold flex items-center gap-1 mt-1 font-sans bg-yellow-500/10 px-2 py-0.5 rounded-md w-fit border border-yellow-500/10">
                    <Coins className="w-3.5 h-3.5 shrink-0" /> {currentUserProfile.flowCoins} Moedas
                  </span>
                )}
                
                {/* Streak details */}
                {nav !== 'habits' && (
                  <span className="text-[9px] text-orange-400 font-bold flex items-center gap-0.5 mt-1 select-none font-sans uppercase tracking-wider">
                    <Flame className="w-3 h-3 fill-current animate-pulse" /> {currentUserProfile.streak || 0} Dias Streak
                  </span>
                )}
              </div>

              {/* Partner profile space */}
              <div className="flex flex-col text-left pl-3.5 px-1.5 min-w-0">
                {partnerProfile ? (
                  <>
                    <div className="flex items-center gap-1.5 select-none mb-0.5">
                      <span className="text-pink-400 font-extrabold text-[10px] bg-pink-500/10 border border-pink-500/15 px-1.5 py-0.2 rounded-md font-sans uppercase">AMOR</span>
                      <span className="text-[10.5px] font-bold text-primary truncate capitalize font-sans">{partnerProfile.name}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-0.5 leading-none">
                      <span className="text-xl font-black text-primary font-mono">{partnerProfile.xp}</span>
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-sans">XP Total</span>
                    </div>
                    
                    {/* Partner FlowCoins Bank */}
                    {nav !== 'habits' && (
                      <span className="text-[10.5px] text-yellow-400 font-bold flex items-center gap-1 mt-1 font-sans bg-yellow-400/5 px-2 py-0.5 rounded-md w-fit">
                        <Coins className="w-3.5 h-3.5 shrink-0 text-yellow-400/70" /> {partnerProfile.flowCoins} Moedas
                      </span>
                    )}

                    {/* Streak details */}
                    {nav !== 'habits' && (
                      <span className="text-[9px] text-zinc-500 font-bold flex items-center gap-0.5 mt-1 font-sans uppercase tracking-wider">
                        <Flame className="w-3 h-3" /> {partnerProfile.streak || 0} Dias Streak
                      </span>
                    )}
                  </>
                ) : (
                  <div className="h-full flex flex-col justify-center items-start text-left select-none">
                    <span className="text-[10px] text-zinc-500 font-semibold mb-1 block uppercase">PARCEIRO</span>
                    <p className="text-[10px] text-secondary/60 leading-normal mb-1">Passou código?</p>
                    <span className="text-[10px] font-bold text-teal-400">Pendente ⏳</span>
                  </div>
                )}
              </div>
            </div>

            {/* Live Ranking label footer message */}
            {partnerProfile && nav !== 'habits' && (
              <div className="border-t border-primary/10 pt-2 flex justify-between items-center text-[10.5px] select-none font-sans">
                <span className="text-secondary tracking-wide">{rankingLabel}</span>
                <span className="text-[10px] font-bold bg-secondary/15 px-2 py-0.5 rounded-md text-primary font-sans lowercase">Metas Individuais</span>
              </div>
            )}
          </div>
        )}

        {/* BOTTOM ACTIVE TAB SWITCHE NAVIGATION TAB PANELS */}
        <AnimatePresence mode="wait">
          {nav === 'habits' && (
            <motion.div 
              key="habits"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="space-y-4"
            >
              {/* Devotional Card Quote of Today */}
              <DevotionalCard />

              {/* Weekly Calendar strips selection */}
              {currentUserProfile && (
                <WeekCalendar 
                  selectedDate={selectedDate} 
                  onSelect={setSelectedDate} 
                  habits={habitsData}
                  currentUserId={currentUserProfile.uid}
                />
              )}

              {currentUserProfile && (
                <DailyProgress 
                  habits={habitsData} 
                  date={selectedDate} 
                  currentUserId={currentUserProfile.uid}
                />
              )}

              {currentUserProfile && (
                <LiveSmartNotificationEngine
                  habits={habitsData}
                  tasks={tasksData}
                  currentUserProfile={currentUserProfile}
                  onPushNotification={pushNotificationToUser}
                  isGuestMode={isGuestMode}
                  onRecordFeedEvent={recordFeedEvent}
                />
              )}

              {/* Active list section for habits of simulated user */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-secondary leading-none">
                      Lista de Hábitos Próprios
                    </h4>
                    <span className="text-[10px] text-zinc-500">Filtrando o que você planejou para este dia</span>
                  </div>
                  
                  <button 
                    onClick={() => {
                      setEditingHabit(null);
                      setActiveHabitModal(true);
                    }}
                    className="p-1 px-3 border-0 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer hover:brightness-110 active:scale-97 transition-all shrink-0"
                  >
                    <Plus className="w-4 h-4 stroke-[3px]" /> Novo Hábito
                  </button>
                </div>

                <div className="space-y-2">
                  {currentUserProfile && visibleHabits.map((h, i) => (
                    <HabitCard 
                      key={h.id}
                      habit={h}
                      dateStr={formatLocalYMD(selectedDate)}
                      onToggle={handleToggleHabit}
                      onEdit={ha => {
                        setEditingHabit(ha);
                        setActiveHabitModal(true);
                      }}
                      onDelete={handleDeleteHabit}
                      onReact={handleHabitReactionSubmit}
                      onMoveUp={() => handleMoveHabitsIndex(h.id, 'up')}
                      onMoveDown={() => handleMoveHabitsIndex(h.id, 'down')}
                      isFirst={i === 0}
                      isLast={i === visibleHabits.length - 1}
                      currentUserId={currentUserProfile.uid}
                      names={membersNamesLookup}
                    />
                  ))}

                  {visibleHabits.length === 0 && (
                    <div className="text-center py-10 bg-card rounded-2xl border border-primary/20">
                      <span className="text-3xl block filter select-none mb-2">🌱</span>
                      <p className="text-xs text-primary font-bold">Nenhum hábito cadastrado aqui</p>
                      <p className="text-[10px] text-secondary mt-1 max-w-[280px] mx-auto leading-relaxed">
                        Toque em "Novo Hábito" para registrar sua cooperação espiritual ou amorosa no HabitFlow!
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Daily Couple Challenge Card (Placed at the bottom, minified to look smaller & harmonious) */}
              <div className="bg-gradient-to-br from-pink-950/15 via-slate-900/5 to-rose-950/10 border border-pink-500/15 rounded-xl p-3 shadow-md relative overflow-hidden backdrop-blur-md">
                <div className="absolute top-0 right-0 w-20 h-20 bg-pink-500/5 rounded-full blur-2xl pointer-events-none"></div>
                
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-1.5 text-pink-400 select-none">
                    <span className="text-sm">💖</span>
                    <span className="text-[10px] font-bold tracking-wider uppercase font-sans">Desafio de Casal de Hoje</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 font-mono select-none">Conexão & Carinho</span>
                </div>

                <div className="flex gap-2.5 items-start my-1 pb-1">
                  <span className="text-2xl bg-pink-500/10 rounded-lg p-1.5 flex items-center justify-center flex-shrink-0 select-none">
                    {todayChallenge.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-primary font-bold text-xs leading-snug">
                      {todayChallenge.title}
                    </h4>
                    <p className="text-secondary/80 text-[11px] mt-0.5 leading-normal">
                      {todayChallenge.description}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-pink-500/10 flex justify-between items-center gap-2 text-[9px] select-none">
                  <span className="text-pink-400/95 font-bold flex items-center gap-1 bg-pink-500/10 px-2 py-0.5 rounded-md">
                    💑 Recompensa: +30 XP
                  </span>
                  
                  <button
                    onClick={handleToggleDailyChallenge}
                    className={`py-1 px-3 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer border-0 ${
                      isChallengeCompletedToday
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0 shadow-md shadow-pink-500/10 active:scale-97'
                    }`}
                  >
                    {isChallengeCompletedToday ? (
                      <>
                        <Check className="w-3 h-3 stroke-[3px]" />
                        Concluido Hoje!
                      </>
                    ) : (
                      'Concluir Juntos ✨'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {nav === 'tasks' && (
            <motion.div 
              key="tasks"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="space-y-4"
            >
              {/* Header block with assignments and new buttons */}
              <div className="flex justify-between items-center pt-1 px-1 select-none">
                <div>
                  <h2 className="text-lg font-extrabold text-primary leading-none">
                    📋 Checklist de Deveres
                  </h2>
                  <span className="text-[10px] text-secondary">Ações coordenadas e cooperação diária</span>
                </div>
                
                <button 
                  onClick={() => {
                    setEditingTask(null);
                    setActiveTaskModal(true);
                  }}
                  className="bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 flex items-center gap-1.5 hover:scale-103 cursor-pointer transition-all"
                >
                  <Plus className="w-4.5 h-4.5 stroke-[3px]" /> Nova Tarefa
                </button>
              </div>

              {/* Dynamic segmented lists based on assignment values */}
              <div className="space-y-3">
                {[
                  { id: 'both', label: 'Cooperação Mútua 💑', icon: '💖' },
                  ...(currentUserProfile ? [{ id: currentUserProfile.uid, label: `Suas obrigações: ${currentUserProfile.name} 💙`, icon: '👤' }] : []),
                  ...(partnerProfile ? [{ id: partnerProfile.uid, label: `Responsabilidade de: ${partnerProfile.name} 💖`, icon: '👤' }] : [])
                ].map(group => {
                  const items = tasksData.filter(t => t.assignedTo === group.id);
                  const sorted = [...items].sort((a,b) => {
                    return (a.completed ? 1 : 0) - (b.completed ? 1 : 0);
                  });

                  return (
                    <div key={group.id} className="space-y-1.5 text-left font-sans">
                      <span className="text-[10.5px] font-bold text-secondary tracking-widest uppercase block pt-2 px-1 select-none font-sans">
                        {group.label} ({sorted.length})
                      </span>
                      
                      <div className="space-y-2 font-sans">
                        {sorted.map(t => (
                          <TaskCard 
                            key={t.id} 
                            task={t} 
                            onToggle={handleToggleTask} 
                            onEdit={ta => {
                              setEditingTask(ta);
                              setActiveTaskModal(true);
                            }} 
                            onDelete={handleDeleteTask} 
                            onReact={handleTaskReactionSubmit} 
                            currentUser={currentUserProfile?.uid || ''} 
                            names={membersNamesLookup} 
                          />
                        ))}
                        {sorted.length === 0 && (
                          <p className="text-[10.5px] text-secondary/60 italic px-2 py-3 bg-secondary/2 text-left rounded-xl border border-primary/5 select-none leading-normal">
                            Nenhum dever cadastrado sob esta responsabilidade.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* SHARED SPACE & REALTIME FEED LOGS & LOJA DE AFETOS SHOP */}
          {nav === 'couple' && (
            <motion.div 
              key="couple"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="space-y-4"
            >
              {/* Visual dashboard card */}
              <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900/40 to-pink-950/15 border border-primary/20 rounded-3xl p-5 text-center relative overflow-hidden shadow-xl select-none">
                <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full blur-2xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>

                <div className="w-16 h-16 mx-auto flex items-center justify-center bg-emerald-500/10 rounded-full border border-emerald-500/30 text-3xl mb-3 shadow-md">
                  💑
                </div>

                <h2 className="text-lg font-extrabold text-primary mb-1 tracking-tight">
                  Espaço Compartilhado
                </h2>
                
                <p className="text-[11px] text-secondary/80 mb-4 max-w-xs mx-auto px-2 leading-relaxed">
                  Consulte abaixo a linha de tempo das atividades ou gaste suas moedas para liberar mimos e carinhos físicos ao parceiro.
                </p>

                {currentUserProfile && (
                  <div className="bg-primary/20 backdrop-blur-md px-4 py-2.5 border border-primary/25 rounded-2xl grid grid-cols-2 gap-4 divide-x divide-primary/20">
                    <div className="text-center font-sans">
                      <span className="text-[9px] text-secondary font-bold block uppercase tracking-wider mb-0.5">Moedas de {currentUserProfile.name}</span>
                      <strong className="text-sm font-extrabold text-yellow-400 font-mono">🪙 {currentUserProfile.flowCoins} Moedas</strong>
                    </div>
                    <div className="text-center font-sans">
                      {partnerProfile ? (
                        <>
                          <span className="text-[9px] text-secondary font-bold block uppercase tracking-wider mb-0.5">Moedas de {partnerProfile.name}</span>
                          <strong className="text-sm font-extrabold text-zinc-400 font-mono">🪙 {partnerProfile.flowCoins} Moedas</strong>
                        </>
                      ) : (
                        <>
                          <span className="text-[9px] text-secondary font-bold block uppercase tracking-wider mb-0.5">Parceiro</span>
                          <strong className="text-xs font-semibold text-zinc-500">Aguardando...</strong>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* REWARD GIFT CARDS LOJA DE AFETOS */}
              <div className="bg-card p-4 rounded-3xl border border-primary/20 space-y-3 font-sans">
                <div className="flex items-center justify-between border-b border-primary/10 pb-2.5 select-none">
                  <div className="flex items-center gap-1.5 text-primary">
                    <Gift className="w-4 h-4 text-pink-400" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wide leading-none">Loja de Mimos & Afetos 🎁</h3>
                  </div>
                  
                  {isJosiel && (
                    <button 
                      onClick={handleOpenNewRewardModal}
                      className="p-1 px-2.5 border-0 bg-pink-500/10 text-pink-400 font-bold text-[10px] rounded-lg tracking-wider uppercase cursor-pointer hover:bg-pink-500/25 transition-all"
                    >
                      + Criar Mimo
                    </button>
                  )}
                </div>

                <div className="space-y-5 pt-1">
                  {(() => {
                    const sortedList = [...rewardsData].sort((a, b) => a.cost - b.cost);
                    const groups = [
                      { name: '🍬 Mimos Rápidos (Até 🪙500)', items: sortedList.filter(r => r.cost <= 500) },
                      { name: '🎬 Romance & Experiências (🪙501 - 🪙1500)', items: sortedList.filter(r => r.cost > 500 && r.cost <= 1500) },
                      { name: '🧹 Desejos Úteis & Diários (🪙1501 - 🪙3500)', items: sortedList.filter(r => r.cost > 1500 && r.cost <= 3500) },
                      { name: '👑 Gestos Supremos & Fugas (Acima de 🪙3500)', items: sortedList.filter(r => r.cost > 3500) }
                    ].filter(g => g.items.length > 0);

                    return groups.map(group => (
                      <div key={group.name} className="space-y-2.5 text-left">
                        <div className="flex items-center gap-2 px-1 select-none">
                          <div className="h-1 w-2 bg-pink-400 rounded-full" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{group.name}</span>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {group.items.map(item => {
                            const isUnlockedByMe = item.unlockedBy === currentUserProfile?.uid;
                            const isUnlockedByPartner = item.unlockedBy === partnerProfile?.uid;
                            const hasPurchased = !!item.unlockedAt;
                            const claimed = !!item.claimed;

                            // Calculate dynamic rarity border/badge
                            const isLendario = item.cost > 3500;
                            const isEpico = item.cost > 1500 && item.cost <= 3500;
                            const isRaro = item.cost > 500 && item.cost <= 1500;

                            const rarityTag = isLendario 
                              ? 'Lendário ✨' 
                              : isEpico 
                                ? 'Épico 🟣' 
                                : isRaro 
                                  ? 'Raro 🔵' 
                                  : 'Comum 🟢';

                            const rarityTagColor = isLendario
                              ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                              : isEpico
                                ? 'text-purple-400 bg-purple-500/10 border-purple-500/20'
                                : isRaro
                                  ? 'text-sky-400 bg-sky-500/10 border-sky-500/20'
                                  : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

                            const cardBg = hasPurchased
                              ? claimed
                                ? 'border-zinc-500/10 bg-zinc-900/10 opacity-60'
                                : isLendario 
                                  ? 'border-amber-500/40 bg-amber-500/5'
                                  : isEpico
                                    ? 'border-purple-500/35 bg-purple-500/5' 
                                    : 'border-pink-500/30 bg-pink-500/5'
                              : isLendario
                                ? 'border-amber-500/20 bg-[#1e1b1d]/40'
                                : isEpico
                                  ? 'border-purple-500/15 bg-[#171321]/30'
                                  : 'border-primary/10 bg-secondary/5 hover:border-primary/25';

                            return (
                              <div 
                                key={item.id} 
                                className={`p-4 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden ${cardBg}`}
                              >
                                <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                                  <span className="text-2xl bg-secondary/15 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-primary/10 select-none">
                                    {item.icon}
                                  </span>

                                  <div className="flex-1 min-w-0 text-left space-y-1">
                                    <div className="flex flex-wrap items-center gap-1.5 leading-none">
                                      <h4 className="text-xs font-black text-primary truncate leading-tight tracking-tight">
                                        {item.title}
                                      </h4>
                                      <span className={`text-[7.5px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${rarityTagColor} select-none`}>
                                        {rarityTag}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-zinc-400 leading-snug">
                                      {item.description}
                                    </p>

                                    {/* Purchase / Claim Badge Actions info */}
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                      {!hasPurchased ? (
                                        <span className="text-[10px] text-yellow-400 font-extrabold bg-yellow-500/10 px-2 py-0.5 rounded-lg border border-yellow-500/20 select-none flex items-center gap-1">
                                          🪙 {item.cost} moedas
                                        </span>
                                      ) : (
                                        <div className="flex flex-wrap items-center gap-1.5 select-none text-[9px]">
                                          <span className="bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2 py-0.5 rounded-lg font-bold uppercase tracking-wider font-sans">
                                            {isUnlockedByMe ? 'Presenteado por Você 🎁' : `Presente de ${membersNamesLookup[item.unlockedBy || '']}`}
                                          </span>
                                          {claimed && (
                                            <span className="bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 px-2 py-0.5 rounded-lg font-bold uppercase tracking-wider font-sans">
                                              Desfrutado!
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Actions button */}
                                <div className="shrink-0 select-none self-end sm:self-center flex items-center gap-2">
                                  {/* Edit / Delete control buttons */}
                                  {isJosiel && (
                                    <div className="flex items-center gap-1 mr-1">
                                      <button
                                        onClick={() => handleEditRewardClick(item)}
                                        className="p-1.5 border-0 bg-white/5 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl cursor-pointer transition-all flex items-center justify-center"
                                        title="Editar este mimo"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteReward(item.id)}
                                        className="p-1.5 border-0 bg-white/5 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 rounded-xl cursor-pointer transition-all flex items-center justify-center"
                                        title="Excluir este mimo"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}

                                  {!hasPurchased ? (
                                    <button
                                      onClick={() => handlePurchaseReward(item.id)}
                                      className="py-2 px-4 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-extrabold text-[11px] border-0 cursor-pointer shadow-md active:scale-95 transition-all text-center"
                                    >
                                      Presentear! 💖
                                    </button>
                                  ) : !claimed ? (
                                    <button
                                      onClick={() => handleClaimReward(item.id)}
                                      className="py-1.5 px-3.5 rounded-2xl bg-zinc-800 hover:bg-emerald-500 text-primary hover:text-white font-black text-[10px] border border-primary/20 cursor-pointer transition-all"
                                      title="Marcar como desfrutado na vida real"
                                    >
                                      Resgatar 🥰
                                    </button>
                                  ) : (
                                    <span className="text-xl font-bold text-emerald-400 select-none pr-2">✓</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* REALTIME FEED OF RECENT COUPLE EVENTS */}
              <div className="bg-card p-4 rounded-3xl border border-primary/20 space-y-3 font-sans">
                <div className="flex items-center gap-1.5 text-primary border-b border-primary/10 pb-2.5 select-none">
                  <Activity className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-wider leading-none">Linha do Tempo Real-time Ticker</h3>
                </div>

                <div className="space-y-3.5 max-h-[250px] overflow-y-auto">
                  {feedEvents.length === 0 ? (
                    <p className="text-secondary text-xs text-center py-6 italic font-medium select-none">
                      Ações sincronizadas aparecerão aqui conforme o casal marcar objetivos! 🕊️
                    </p>
                  ) : (
                    feedEvents.map(log => (
                      <div key={log.id} className="flex gap-2.5 items-start text-left">
                        <span className="text-sm bg-secondary/10 border border-primary/5 rounded-xl w-7.5 h-7.5 flex items-center justify-center shrink-0 select-none">
                          {log.type === 'habit_completed' ? '🔥' : log.type === 'task_completed' ? '📋' : log.type === 'reward_unlocked' ? '🎁' : '💖'}
                        </span>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-secondary leading-tight mt-0.5">
                            <strong className="text-primary font-bold">{log.userName}</strong> {log.detailTitle}
                          </p>
                          {log.extraInfo && (
                            <span className="text-[10px] text-pink-400 font-bold block mt-0.5">{log.extraInfo}</span>
                          )}
                          <span className="text-[9px] text-zinc-500 font-mono block mt-1">
                            {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* APP LEVEL CONFIGURATIONS & MOOD & NAMES FIELDS */}
          {nav === 'settings' && currentUserProfile && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="space-y-4"
            >
              <SettingsPanel
                currentUserProfile={currentUserProfile}
                partnerProfile={partnerProfile}
                couple={couple}
                theme={theme}
                isGuestMode={isGuestMode}
                onUpdateProfile={updateUserProfileDocs}
                onUpdateCoupleName={handleUpdateCoupleName}
                onUpdateCoupleAnniversary={handleUpdateCoupleAnniversary}
                onUpdateCoupleSetting={handleUpdateCoupleSetting}
                onChangeTheme={(nextTheme) => {
                  setTheme(nextTheme);
                  if (isGuestMode) {
                    if (couple) {
                      const nextC = { ...couple, settings: { ...couple.settings, theme: nextTheme } };
                      setCouple(nextC);
                      saveLocalBackup({ couple: nextC, theme: nextTheme });
                    }
                  } else if (currentUserProfile?.coupleId) {
                    update(ref(rtdb, `couples/${currentUserProfile.coupleId}/settings`), { theme: nextTheme });
                  }
                }}
                onRecordFeedEvent={recordFeedEvent}
                triggerToast={triggerToast}
              />
            </motion.div>
          )}

          {nav === 'stats' && currentUserProfile && (
            <motion.div
              key="stats"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="space-y-4"
            >
              <StatsPanel
                habits={habitsData}
                tasks={tasksData}
                currentUserProfile={currentUserProfile}
                partnerProfile={partnerProfile}
                couple={couple}
                names={membersNamesLookup}
                rewards={rewardsData}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FIXED BOTTOM MENU NAVIGATION ROW */}
      <nav className="bottom-nav select-none font-sans">
        {[
          { id: 'habits', icon: '🔥', label: 'Metas' },
          { id: 'tasks', icon: '📋', label: 'Deveres' },
          { id: 'couple', icon: '❤️', label: 'Casal' },
          { id: 'stats', icon: '📈', label: 'Painel' },
          { id: 'settings', icon: '⚙️', label: 'Ajustes' }
        ].map(item => (
          <button 
            key={item.id} 
            onClick={() => setNav(item.id as any)} 
            className={`bottom-nav-item border-0 cursor-pointer ${
              nav === item.id ? 'bottom-nav-active' : 'text-secondary hover:text-primary'
            }`}
          >
            <span className="text-lg leading-none select-none">{item.icon}</span>
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* MODALS SECTION */}
      
      {/* Habit Creation modal popup */}
      {currentUserProfile && (
        <HabitFormModal 
          isOpen={activeHabitModal} 
          onClose={() => {
            setActiveHabitModal(false);
            setEditingHabit(null);
          }} 
          onSave={handleSaveHabit} 
          initial={editingHabit} 
          categories={['amor', 'comunicação', 'espiritual', 'saúde', 'relacionamento']} 
          names={membersNamesLookup}
        />
      )}

      {/* Task Creation modal popup */}
      {currentUserProfile && (
        <TaskFormModal 
          isOpen={activeTaskModal} 
          onClose={() => {
            setActiveTaskModal(false);
            setEditingTask(null);
          }} 
          onSave={handleSaveTask} 
          initial={editingTask} 
          names={membersNamesLookup} 
          activePerson={currentUserProfile.uid} 
        />
      )}

      {/* Intelligent Voice Assistant Coach Modal Overlay */}
      <AnimatePresence>
        {showVoiceAssistant && (
          <VoiceAssistantCoach
            onClose={() => setShowVoiceAssistant(false)}
            currentUserProfile={currentUserProfile}
            onSaveHabit={handleSaveHabit}
            onSaveTask={handleSaveTask}
            triggerToast={triggerToast}
            onRecordFeedEvent={recordFeedEvent}
            habits={habitsData}
            tasks={tasksData}
          />
        )}
      </AnimatePresence>

      {/* Custom Reward Store item creator modal */}
      <AnimatePresence>
        {showCustomRewardModal && (
          <div 
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200] p-4 backdrop-blur-sm animate-fade-in text-left font-sans text-white"
            onClick={handleCloseRewardModal}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-primary/30 p-5 rounded-3xl max-w-sm w-full shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <span className="text-secondary text-[11px] font-bold uppercase tracking-widest block mb-1">Moeda de Carinho</span>
              <h3 className="text-md font-extrabold text-primary mb-4 block">
                {editingReward ? 'Editar Mimo' : 'Adicionar Mimo Personalizado'}
              </h3>
 
              <form onSubmit={handleAddCustomRewardSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-secondary font-bold mb-1 block">Emoji de Ícone:</label>
                  <div className="grid grid-cols-6 gap-2 p-1 bg-secondary/5 rounded-xl border border-primary/15">
                    {['🎁','🍬','🍕','💆','🍷','☕','🏃','🎟️','🎫','🍿','🍦','🛍️'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewRewIcon(emoji)}
                        className={`text-xl p-1 text-center rounded-lg cursor-pointer ${
                          newRewIcon === emoji ? 'bg-pink-500 text-white' : ''
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
 
                <div>
                  <label className="text-xs text-secondary font-bold mb-1.5 block">Título do Mimo:</label>
                  <input
                    type="text"
                    required
                    value={newRewTitle}
                    onChange={e => setNewRewTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-primary/20 rounded-xl text-primary text-xs font-bold"
                    placeholder="Ex: Café da Manhã na Cama"
                  />
                </div>
 
                <div>
                  <label className="text-xs text-secondary font-bold mb-1.5 block">Descrição do Agrado:</label>
                  <textarea
                    value={newRewDesc}
                    onChange={e => setNewRewDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-primary/20 rounded-xl text-primary text-xs"
                    placeholder="Garante ser servido com muito amor e carinho."
                  />
                </div>
 
                <div>
                  <label className="text-xs text-secondary font-bold mb-1.5 block">Custo (FlowCoins):</label>
                  <input
                    type="number"
                    min={50}
                    max={10000}
                    value={newRewCost}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '') {
                        setNewRewCost('');
                      } else {
                        const num = parseInt(val, 10);
                        setNewRewCost(isNaN(num) ? '' : num);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-primary/20 rounded-xl text-primary text-xs font-mono font-bold"
                  />
                </div>
 
                <div className="flex gap-2 pt-2 select-none">
                  <button
                    type="button"
                    onClick={handleCloseRewardModal}
                    className="flex-1 py-2 bg-secondary/10 text-secondary hover:bg-secondary/20 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-bold text-xs"
                  >
                    {editingReward ? 'Salvar Alterações 💾' : 'Adicionar Mimo 🎁'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Sparkly AI Chat Button (FAB) */}
      {currentUserProfile && (
        <motion.button
          onClick={() => { performVibe(); setShowVoiceAssistant(true); }}
          initial={{ scale: 0, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 15, delay: 0.8 }}
          whileHover={{ scale: 1.1, rotate: 3 }}
          whileTap={{ scale: 0.9 }}
          className="fixed bottom-22 right-4 z-[110] flex items-center gap-2 px-3.5 py-3.5 sm:px-4 bg-gradient-to-tr from-indigo-500 via-purple-600 to-rose-500 hover:from-indigo-600 hover:to-rose-600 text-white rounded-full shadow-[0_4px_25px_rgba(99,102,241,0.5)] border border-white/20 cursor-pointer backdrop-blur-md select-none group focus:outline-none transition-all"
          title="Bate-papo IA Sintonia"
        >
          {/* Glowing pulse ring */}
          <span className="absolute inset-0 bg-gradient-to-tr from-indigo-500 via-purple-600 to-rose-500 rounded-full animate-ping opacity-25 group-hover:opacity-40 transition-opacity"></span>

          <div className="relative flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <Sparkles className="w-2.5 h-2.5 text-yellow-200 absolute -top-1 -right-1 animate-pulse" />
          </div>
          
          <span className="text-[11px] font-black tracking-wider uppercase hidden sm:inline-block pl-0.5 pr-1 font-sans">
            Conversar com IA
          </span>
          
          {/* Alert badge indicator */}
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
          </span>
        </motion.button>
      )}
    </div>
  );
}
