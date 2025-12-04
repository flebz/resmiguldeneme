import { Achievement, AppState, ShopItem, Quest } from './types';

export const MOTIVATIONAL_QUOTES = [
  "Her Resmigül, seni hedefine bir adım daha yaklaştırır.",
  "Bugünkü Resmigül performansın harika gidiyor.",
  "Damla damla birikir, koca bir Resmigül denizi olur.",
  "Başarı, her gün tekrarlanan küçük Resmigül adımlarıdır.",
  "Kendine inan, Resmigül sayacın seninle.",
  "Asla pes etme, her dokunuş bir ilerlemedir.",
  "Sabır en büyük erdemdir, Resmigül ile güçlen.",
  "Yolun sonu aydınlık, saymaya devam et.",
  "Disiplin, Resmigül hedefleriyle başarı arasındaki köprüdür.",
  "Bugün, geleceğin en parlak Resmigül günü."
];

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_step',
    title: 'Resmigül Başlangıcı',
    description: 'İlk günlük hedefini tamamla.',
    icon: '🌱',
    unlocked: false,
    condition: (state: AppState) => state.history.some(d => d.completed)
  },
  {
    id: 'streak_3',
    title: 'Resmigül Serisi',
    description: '3 gün üst üste hedefe ulaş.',
    icon: '🔥',
    unlocked: false,
    condition: (state: AppState) => state.streak >= 3
  },
  {
    id: 'streak_7',
    title: 'Efsane Resmigül Haftası',
    description: '7 günlük seri yap.',
    icon: '👑',
    unlocked: false,
    condition: (state: AppState) => state.streak >= 7
  },
  {
    id: 'total_1000',
    title: '1000’lik Resmigülcü',
    description: 'Toplam 1000 Resmigül sayısına ulaş.',
    icon: '💎',
    unlocked: false,
    condition: (state: AppState) => state.totalCount >= 1000
  },
  {
    id: 'level_5',
    title: 'Yükselen Yıldız',
    description: '5. Seviyeye ulaş.',
    icon: '⭐',
    unlocked: false,
    condition: (state: AppState) => state.user.level >= 5
  }
];

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'boost_2x_15s',
    type: 'multiplier',
    name: '2x Hızlandırıcı',
    description: '15 saniye boyunca her dokunuş 2 sayılır.',
    price: 50,
    value: 2,
    duration: 15,
    icon: '⚡'
  },
  {
    id: 'boost_3x_30s',
    type: 'multiplier',
    name: '3x Süper Güç',
    description: '30 saniye boyunca her dokunuş 3 sayılır.',
    price: 150,
    value: 3,
    duration: 30,
    icon: '🚀'
  },
  {
    id: 'boost_5x_60s',
    type: 'multiplier',
    name: '5x Mega Güç',
    description: '1 dakika boyunca her dokunuş 5 sayılır.',
    price: 400,
    value: 5,
    duration: 60,
    icon: '💎'
  },
  {
    id: 'auto_1_20s',
    type: 'autotap',
    name: 'Otomatik Zikir',
    description: '20 saniye boyunca her saniye +1 ekler.',
    price: 100,
    value: 1,
    duration: 20,
    icon: '🤖'
  }
];

export const DAILY_QUESTS: Quest[] = [
  {
    id: 'tap_200',
    description: 'Bugün 200 kez dokun',
    target: 200,
    current: 0,
    reward: 50,
    completed: false,
    type: 'tap_count'
  },
  {
    id: 'buy_1',
    description: 'Mağazadan 1 ürün al',
    target: 1,
    current: 0,
    reward: 30,
    completed: false,
    type: 'buy_item'
  }
];

export const SOUND_CLICK_B64 = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"; // Placeholder

export const getTodayISO = () => new Date().toISOString().split('T')[0];

export const DEFAULT_STATE: AppState = {
  currentDate: getTodayISO(),
  todayCount: 0,
  history: [],
  streak: 0,
  totalCount: 0,
  balance: 0,
  user: {
    name: 'Misafir',
    avatar: '✨',
    startDate: getTodayISO(),
    level: 1,
    xp: 0,
    maxXp: 100
  },
  settings: {
    soundEnabled: true,
    hapticEnabled: true,
    theme: 'crystal',
    customGoal: null,
    funMode: false
  },
  achievements: INITIAL_ACHIEVEMENTS,
  activeEffects: [],
  quests: DAILY_QUESTS,
  lastDailyReward: null,
  dailyRewardStreak: 0
};