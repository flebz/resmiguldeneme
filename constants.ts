import { Achievement, AppState } from './types';

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
    id: 'night_owl',
    title: 'Gece Resmigülü',
    description: 'Gece yarısından sonra Resmigül ekle.',
    icon: '🦉',
    unlocked: false,
    condition: () => {
      const h = new Date().getHours();
      return h >= 0 && h < 5;
    }
  }
];

export const SOUND_CLICK_B64 = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"; // Placeholder

// Helper to get formatted date
export const getTodayISO = () => new Date().toISOString().split('T')[0];

export const DEFAULT_STATE: AppState = {
  currentDate: getTodayISO(),
  todayCount: 0,
  history: [],
  streak: 0,
  totalCount: 0,
  user: {
    name: 'Misafir',
    avatar: '✨',
    startDate: getTodayISO()
  },
  settings: {
    soundEnabled: true,
    hapticEnabled: true,
    theme: 'crystal',
    customGoal: null,
    funMode: false
  },
  achievements: INITIAL_ACHIEVEMENTS
};