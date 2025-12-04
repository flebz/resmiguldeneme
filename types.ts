export type ThemeType = 'crystal' | 'dark' | 'neon';

export interface DailyStats {
  date: string; // ISO YYYY-MM-DD
  count: number;
  goal: number;
  completed: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  condition: (stats: AppState) => boolean;
}

export interface UserProfile {
  name: string;
  avatar: string; // Emoji or URL
  startDate: string; // ISO Date of first use
}

export interface Settings {
  soundEnabled: boolean;
  hapticEnabled: boolean;
  theme: ThemeType;
  customGoal: number | null; // If null, use auto algorithm
  funMode: boolean;
}

export interface AppState {
  currentDate: string;
  todayCount: number;
  history: DailyStats[];
  streak: number;
  totalCount: number;
  user: UserProfile;
  settings: Settings;
  achievements: Achievement[];
}

export const THEMES = {
  crystal: {
    bg: 'bg-white',
    text: 'text-[#1A1A1A]',
    secondaryText: 'text-[#6F6F6F]',
    primary: 'bg-[#246BFD]',
    accent: 'text-[#246BFD]',
    card: 'bg-white border border-[#EDEDED] shadow-[0_3px_12px_rgba(0,0,0,0.06)]',
    button: 'bg-[#246BFD] text-white shadow-[0_6px_15px_rgba(36,107,253,0.25)]',
    progressBarTrack: 'bg-[#EDEDED]',
    progressBarFill: 'bg-gradient-to-r from-[#246BFD] to-[#4FD3C4]',
    nav: 'bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]',
    navActive: 'text-[#246BFD] bg-[#246BFD]/5',
    navInactive: 'text-[#C5C5C5]'
  },
  dark: {
    bg: 'bg-slate-900',
    text: 'text-slate-100',
    secondaryText: 'text-slate-400',
    primary: 'bg-blue-600',
    accent: 'text-blue-400',
    card: 'bg-slate-800/50 border border-slate-700',
    button: 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/50 text-white',
    progressBarTrack: 'bg-slate-800',
    progressBarFill: 'bg-blue-500',
    nav: 'bg-slate-900 border-t border-slate-800',
    navActive: 'text-blue-400 bg-blue-500/10',
    navInactive: 'text-slate-600'
  },
  neon: {
    bg: 'bg-black',
    text: 'text-pink-50',
    secondaryText: 'text-pink-200/50',
    primary: 'bg-fuchsia-600',
    accent: 'text-cyan-400',
    card: 'bg-gray-900/80 border border-fuchsia-500/30',
    button: 'bg-gradient-to-r from-fuchsia-600 to-purple-600 shadow-[0_0_20px_rgba(192,38,211,0.6)] text-white',
    progressBarTrack: 'bg-gray-800',
    progressBarFill: 'bg-gradient-to-r from-fuchsia-500 to-cyan-500',
    nav: 'bg-black border-t border-fuchsia-900',
    navActive: 'text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]',
    navInactive: 'text-fuchsia-900'
  }
};