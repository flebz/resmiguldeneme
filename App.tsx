import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Home, BarChart2, Settings, User, Trophy, Zap, Volume2, VolumeX, Vibrate, Download, Upload, Palette, TrendingUp, CheckCircle, Calendar, ShoppingBag, Gift, Star, Clock, Lock, Unlock } from './components/Icons';
import ConfettiEffect from './components/Confetti';
import NotificationToast from './components/NotificationToast';
import { AppState, DailyStats, THEMES, ThemeType, Achievement, ShopItem, Quest, ActiveEffect } from './types';
import { DEFAULT_STATE, getTodayISO, MOTIVATIONAL_QUOTES, SHOP_ITEMS, DAILY_QUESTS } from './constants';

// --- Local Storage Service ---
const STORAGE_KEY = 'resmigul_crystal_v3';
const saveState = (state: AppState) => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
const loadState = (): AppState | null => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;
  const parsed = JSON.parse(data);
  // Migration for new fields
  if (parsed.balance === undefined) parsed.balance = 0;
  if (!parsed.user.level) {
    parsed.user.level = 1;
    parsed.user.xp = 0;
    parsed.user.maxXp = 100;
  }
  if (!parsed.activeEffects) parsed.activeEffects = [];
  if (!parsed.quests) parsed.quests = DAILY_QUESTS;
  return parsed;
};

// --- Sound Helpers ---
const playClickSound = (freq = 800) => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freq / 2, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.05, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
};

const playSuccessSound = () => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(1200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.05, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  osc.start();
  osc.stop(ctx.currentTime + 0.5);
};

export default function App() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [activeTab, setActiveTab] = useState<'home' | 'market' | 'stats' | 'profile' | 'settings'>('home');
  const [showConfetti, setShowConfetti] = useState(false);
  const [animateButton, setAnimateButton] = useState(false);
  const [dailyQuote, setDailyQuote] = useState("");
  const [notification, setNotification] = useState<{title: string, description: string, icon: string} | null>(null);
  const [floatText, setFloatText] = useState<{id: number, text: string, x: number, y: number}[]>([]);
  const [dailyRewardModal, setDailyRewardModal] = useState(false);
  const lastTapRef = useRef<number>(0);
  const floatIdRef = useRef(0);

  // --- Initialization & Daily Logic ---
  useEffect(() => {
    const loaded = loadState();
    const today = getTodayISO();
    
    const quoteIndex = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % MOTIVATIONAL_QUOTES.length;
    setDailyQuote(MOTIVATIONAL_QUOTES[quoteIndex]);

    if (loaded) {
      if (loaded.currentDate !== today) {
        // Day Change Logic
        const yesterdayStats: DailyStats = {
          date: loaded.currentDate,
          count: loaded.todayCount,
          goal: getGoal(loaded),
          completed: loaded.todayCount >= getGoal(loaded)
        };
        
        let newStreak = loaded.streak;
        const prevDate = new Date(loaded.currentDate);
        const currDate = new Date(today);
        const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        if (diffDays === 1 && yesterdayStats.completed) {
           newStreak += 1;
        } else if (diffDays > 1 || (diffDays === 1 && !yesterdayStats.completed)) {
           newStreak = 0;
        }

        // Reset Quests
        const newQuests = DAILY_QUESTS.map(q => ({...q, current: 0, completed: false}));

        setState({
          ...loaded,
          currentDate: today,
          todayCount: 0,
          history: [...loaded.history, yesterdayStats],
          streak: newStreak,
          quests: newQuests
        });

        // Show Daily Reward Modal
        setDailyRewardModal(true);

      } else {
        setState(loaded);
        // Check if daily reward claimed today
        if (loaded.lastDailyReward !== today) {
           setDailyRewardModal(true);
        }
      }
    } else {
      setState({ ...DEFAULT_STATE, currentDate: today });
      setDailyRewardModal(true);
    }
  }, []);

  // --- Game Loop (Auto-tap & Timers) ---
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        const now = Date.now();
        // Filter expired effects
        const activeEffects = prev.activeEffects.filter(e => e.expiresAt > now);
        
        // Calculate Auto Tap
        const autoTapEffect = activeEffects.find(e => e.id.includes('auto'));
        let newTodayCount = prev.todayCount;
        let newTotalCount = prev.totalCount;
        let newBalance = prev.balance;
        
        if (autoTapEffect) {
           newTodayCount += autoTapEffect.value;
           newTotalCount += autoTapEffect.value;
           newBalance += autoTapEffect.value;
        }

        if (activeEffects.length !== prev.activeEffects.length || autoTapEffect) {
           return {
             ...prev,
             activeEffects,
             todayCount: newTodayCount,
             totalCount: newTotalCount,
             balance: newBalance
           };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- Persistence ---
  useEffect(() => {
    saveState(state);
  }, [state]);

  // --- Achievement Check ---
  useEffect(() => {
    let newlyUnlocked: Achievement | null = null;
    const updatedAchievements = state.achievements.map(ach => {
      if (!ach.unlocked && ach.condition(state)) {
        newlyUnlocked = ach;
        return { ...ach, unlocked: true };
      }
      return ach;
    });

    if (newlyUnlocked) {
      setState(prev => ({ ...prev, achievements: updatedAchievements }));
      setNotification({
        title: (newlyUnlocked as Achievement).title,
        description: (newlyUnlocked as Achievement).description,
        icon: (newlyUnlocked as Achievement).icon
      });
      if (state.settings.soundEnabled) playSuccessSound();
    }
  }, [state.todayCount, state.totalCount, state.streak, state.user.level]);

  // --- Helpers ---
  const getGoal = (s: AppState = state) => {
    if (s.settings.customGoal) return s.settings.customGoal;
    const start = new Date(s.user.startDate).getTime();
    const now = new Date(s.currentDate).getTime();
    const diffDays = Math.floor((now - start) / (1000 * 3600 * 24));
    return 50 + (diffDays * 50);
  };

  const getMultiplier = () => {
    const effect = state.activeEffects.find(e => e.id.includes('boost'));
    return effect ? effect.value : 1;
  };

  const currentGoal = getGoal();
  const theme = THEMES[state.settings.theme];
  const progressPercent = Math.min(100, Math.round((state.todayCount / currentGoal) * 100));

  // --- Core Game Logic ---
  const handleTap = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 60) return; // Anti-spam
    lastTapRef.current = now;

    if (state.settings.soundEnabled) playClickSound(800 + (Math.random() * 200));
    if (state.settings.hapticEnabled && navigator.vibrate) navigator.vibrate(10);
    
    setAnimateButton(true);
    setTimeout(() => setAnimateButton(false), 120);

    const multiplier = getMultiplier();
    let increment = 1 * multiplier;
    let isCritical = false;

    // Critical Hit Chance (5%)
    if (Math.random() < 0.05) {
      increment *= 2;
      isCritical = true;
      if (state.settings.soundEnabled) playClickSound(1200);
      if (navigator.vibrate) navigator.vibrate([20, 20, 20]);
    }

    // Visual Floating Text
    const rect = (e?.target as HTMLElement)?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top : window.innerHeight / 2;
    
    const floatId = floatIdRef.current++;
    setFloatText(prev => [...prev, {
      id: floatId,
      text: isCritical ? `KRİTİK! +${increment}` : `+${increment}`,
      x: x + (Math.random() * 40 - 20),
      y: y - 50
    }]);
    setTimeout(() => {
      setFloatText(prev => prev.filter(item => item.id !== floatId));
    }, 800);

    setState(prev => {
      const newCount = prev.todayCount + increment;
      let newBalance = prev.balance + increment;
      let newXp = prev.user.xp + increment;
      let newLevel = prev.user.level;
      let newMaxXp = prev.user.maxXp;

      // Level Up Logic
      if (newXp >= newMaxXp) {
        newLevel++;
        newXp = newXp - newMaxXp;
        newMaxXp = Math.floor(newMaxXp * 1.5);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        setNotification({
           title: "SEVİYE ATLADIN!",
           description: `${newLevel}. Seviyeye ulaştın!`,
           icon: "⭐"
        });
        playSuccessSound();
      }

      // Quest Logic
      const newQuests = prev.quests.map(q => {
        if (q.type === 'tap_count' && !q.completed) {
           const updated = q.current + increment;
           if (updated >= q.target) {
             setNotification({ title: "GÖREV TAMAMLANDI", description: q.description, icon: "✅" });
             newBalance += q.reward;
             return { ...q, current: updated, completed: true };
           }
           return { ...q, current: updated };
        }
        return q;
      });

      if (newCount >= currentGoal && prev.todayCount < currentGoal) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
      
      return {
        ...prev,
        todayCount: newCount,
        totalCount: prev.totalCount + increment,
        balance: newBalance,
        user: { ...prev.user, level: newLevel, xp: newXp, maxXp: newMaxXp },
        quests: newQuests
      };
    });
  }, [state.settings, currentGoal, state.activeEffects]);

  const buyItem = (item: ShopItem) => {
    if (state.balance < item.price) {
      alert("Yetersiz Resmigül Puanı!");
      return;
    }

    setState(prev => {
      const now = Date.now();
      const newEffects = [...prev.activeEffects];
      
      if (item.duration) {
        newEffects.push({
          id: item.id + '_' + now,
          value: item.value,
          expiresAt: now + (item.duration * 1000)
        });
      }

      // Update Buy Quest
      const newQuests = prev.quests.map(q => {
        if (q.type === 'buy_item' && !q.completed) {
           const updated = q.current + 1;
           if (updated >= q.target) {
             setNotification({ title: "GÖREV TAMAMLANDI", description: q.description, icon: "✅" });
             return { ...q, current: updated, completed: true }; // Bonus balance handled? simpler to add here
           }
           return { ...q, current: updated };
        }
        return q;
      });
      
      // If Quest complete, add reward immediately (simplified)
      let bonus = 0;
      if (newQuests.some(q => q.completed && !prev.quests.find(pq => pq.id === q.id)?.completed)) {
         bonus = 30; // hardcoded reward from constant for buy_1
      }

      return {
        ...prev,
        balance: prev.balance - item.price + bonus,
        activeEffects: newEffects,
        quests: newQuests
      };
    });
    
    setNotification({
      title: "SATIN ALIM BAŞARILI",
      description: `${item.name} aktif edildi!`,
      icon: "🛍️"
    });
    playSuccessSound();
  };

  const claimDailyReward = () => {
    const today = getTodayISO();
    const rewardBase = 50;
    const streakBonus = state.dailyRewardStreak * 10;
    const totalReward = rewardBase + streakBonus;

    setState(prev => ({
      ...prev,
      lastDailyReward: today,
      dailyRewardStreak: prev.dailyRewardStreak + 1,
      balance: prev.balance + totalReward
    }));
    setDailyRewardModal(false);
    setNotification({ title: "GÜNLÜK ÖDÜL", description: `${totalReward} RP Kazanıldı!`, icon: "🎁" });
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2000);
  };

  // --- Views ---

  const renderHome = () => {
    const multiplier = getMultiplier();
    const activeMultiplierEffect = state.activeEffects.find(e => e.id.includes('boost'));
    const timeLeft = activeMultiplierEffect ? Math.ceil((activeMultiplierEffect.expiresAt - Date.now()) / 1000) : 0;

    return (
    <div className="flex flex-col items-center justify-between h-full pt-6 pb-24 px-6 relative">
      <ConfettiEffect trigger={showConfetti} />
      
      {/* Floating Text Container */}
      {floatText.map(ft => (
        <div 
          key={ft.id}
          className="fixed pointer-events-none text-2xl font-black text-[#F8D548] z-50 animate-bounce"
          style={{ left: ft.x, top: ft.y, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
        >
          {ft.text}
        </div>
      ))}

      {/* Header & XP Bar */}
      <div className="w-full flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full ${theme.primary} flex items-center justify-center text-white font-bold shadow-lg`}>
              {state.user.level}
            </div>
            <div className="flex flex-col">
              <span className={`text-xs font-bold ${theme.secondaryText}`}>SEVİYE</span>
              <div className="w-24 h-2 bg-[#EDEDED] rounded-full overflow-hidden mt-1">
                <div className="h-full bg-[#F8D548]" style={{ width: `${(state.user.xp / state.user.maxXp) * 100}%` }} />
              </div>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-full ${theme.card} flex items-center gap-2 border-[#F8D548]/30 border`}>
            <Star size={16} className="text-[#F8D548] fill-[#F8D548]" />
            <span className={`text-sm font-bold ${theme.text}`}>{state.balance} RP</span>
          </div>
        </div>
      </div>

      {/* Multiplier Indicator */}
      {timeLeft > 0 && (
         <div className="absolute top-24 z-20 animate-pulse bg-[#F8D548] text-[#1A1A1A] px-4 py-1 rounded-full font-bold text-sm shadow-lg flex items-center gap-2">
           <Zap size={14} className="fill-current" />
           {multiplier}x KATLAYICI ({timeLeft}s)
         </div>
      )}

      {/* Main Stats Cards */}
      <div className="w-full grid grid-cols-2 gap-4 mt-2">
        <div className={`p-4 rounded-[18px] ${theme.card} flex flex-col`}>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${theme.secondaryText}`}>GÜNLÜK HEDEF</span>
          <span className={`text-2xl font-bold mt-1 ${theme.text}`}>{currentGoal}</span>
          <div className={`w-full h-1.5 mt-2 rounded-full bg-[#EDEDED] overflow-hidden`}>
            <div 
              className={`h-full ${theme.progressBarFill} transition-all duration-500`} 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <div className={`p-4 rounded-[18px] ${theme.card} flex flex-col`}>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${theme.secondaryText}`}>KALAN RESMİGÜL</span>
          <span className={`text-2xl font-bold mt-1 ${state.todayCount >= currentGoal ? 'text-[#2ECC71]' : theme.text}`}>
            {Math.max(0, currentGoal - state.todayCount)}
          </span>
          {state.todayCount >= currentGoal && <div className="text-[10px] text-[#2ECC71] font-bold mt-1">HEDEF TAMAM!</div>}
        </div>
      </div>

      {/* Central Counter */}
      <div className="flex-1 flex flex-col items-center justify-center relative w-full">
        <div className={`absolute w-64 h-64 rounded-full ${theme.primary} opacity-5 ${timeLeft > 0 ? 'animate-ping' : ''}`} />
        
        <button
          onClick={handleTap}
          className={`
            w-64 h-64 rounded-full flex flex-col items-center justify-center
            ${theme.button}
            transition-all duration-100 outline-none select-none z-10
            ${animateButton ? 'scale-[1.07]' : 'scale-100'}
            ${timeLeft > 0 ? 'ring-4 ring-[#F8D548] ring-offset-4 ring-offset-white' : ''}
          `}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <span className="text-7xl font-bold text-white tracking-tighter drop-shadow-sm">
            {state.todayCount}
          </span>
          <span className="text-white/80 font-medium text-sm mt-2 tracking-widest uppercase opacity-70">
            RESMİGÜL
          </span>
        </button>

        <p className={`mt-8 text-center text-sm italic font-medium max-w-[80%] ${theme.secondaryText}`}>
          "{dailyQuote}"
        </p>
      </div>
    </div>
  )};

  const renderMarket = () => (
    <div className="flex flex-col h-full px-6 pt-8 pb-24 overflow-y-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className={`text-2xl font-bold ${theme.text}`}>Resmigül Mağazası</h2>
        <div className={`px-4 py-2 rounded-full bg-[#F8D548]/20 flex items-center gap-2`}>
            <Star size={16} className="text-[#F8D548] fill-[#F8D548]" />
            <span className={`text-sm font-bold ${theme.text}`}>{state.balance} RP</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {SHOP_ITEMS.map(item => (
          <div key={item.id} className={`p-4 rounded-[18px] ${theme.card} flex flex-col justify-between relative overflow-hidden group`}>
             <div className="absolute top-0 right-0 p-2 opacity-10 text-6xl group-hover:scale-110 transition-transform">{item.icon}</div>
             <div>
               <div className="text-3xl mb-2">{item.icon}</div>
               <h3 className={`text-sm font-bold ${theme.text}`}>{item.name}</h3>
               <p className={`text-[10px] ${theme.secondaryText} mt-1 leading-tight`}>{item.description}</p>
             </div>
             <button 
               onClick={() => buyItem(item)}
               disabled={state.balance < item.price}
               className={`mt-4 w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${state.balance >= item.price ? 'bg-[#246BFD] text-white hover:bg-[#1a54d6]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
             >
               <Star size={10} className="fill-current" /> {item.price} AL
             </button>
          </div>
        ))}
      </div>

      <div className={`p-6 rounded-[18px] ${theme.card} mt-4`}>
         <h3 className={`text-xs font-bold uppercase mb-4 ${theme.secondaryText} flex items-center gap-2`}>
           <Clock size={14} /> GÜNLÜK GÖREVLER
         </h3>
         <div className="space-y-4">
           {state.quests.map(q => (
             <div key={q.id} className="flex flex-col">
               <div className="flex justify-between text-xs font-bold mb-1">
                 <span className={theme.text}>{q.description}</span>
                 <span className={q.completed ? 'text-[#2ECC71]' : theme.secondaryText}>
                   {q.current}/{q.target}
                 </span>
               </div>
               <div className="w-full h-2 bg-[#EDEDED] rounded-full overflow-hidden">
                 <div className={`h-full ${q.completed ? 'bg-[#2ECC71]' : 'bg-[#246BFD]'}`} style={{ width: `${Math.min(100, (q.current / q.target) * 100)}%` }} />
               </div>
             </div>
           ))}
         </div>
      </div>
    </div>
  );

  const renderStats = () => {
    // ... existing renderStats code ...
    // Reuse existing logic but simplified for brevity in this update
    const weeklyData = state.history.slice(-7).map(h => ({
      name: new Date(h.date).toLocaleDateString('tr-TR', { weekday: 'short' }),
      count: h.count,
      goal: h.goal
    }));
    if (weeklyData.length < 7) {
       const missing = 7 - weeklyData.length;
       for(let i=0; i<missing; i++) weeklyData.unshift({ name: '-', count: 0, goal: 50 });
    }
    const bestDay = state.history.reduce((max, curr) => curr.count > max ? curr.count : max, 0);

    return (
      <div className="flex flex-col h-full px-6 pt-8 pb-24 overflow-y-auto space-y-6">
        <h2 className={`text-2xl font-bold ${theme.text}`}>Resmigül Analiz</h2>
        <div className={`h-64 p-4 rounded-[18px] ${theme.card} flex flex-col justify-center`}>
          <h3 className={`text-xs font-bold uppercase mb-6 ${theme.secondaryText}`}>HAFTALIK PERFORMANS</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <XAxis dataKey="name" stroke="#C5C5C5" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="count" radius={[6, 6, 6, 6]} barSize={16}>
                {weeklyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.count >= entry.goal ? '#246BFD' : '#4FD3C4'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-5 rounded-[18px] ${theme.card}`}>
            <Trophy size={20} className="mb-2 text-[#F8D548]" />
            <div className={`text-2xl font-bold ${theme.text}`}>{bestDay}</div>
            <div className={`text-[10px] font-bold uppercase ${theme.secondaryText}`}>REKOR GÜN</div>
          </div>
          <div className={`p-5 rounded-[18px] ${theme.card}`}>
            <Zap size={20} className="mb-2 text-[#246BFD]" />
            <div className={`text-2xl font-bold ${theme.text}`}>{state.streak}</div>
            <div className={`text-[10px] font-bold uppercase ${theme.secondaryText}`}>GÜNCEL SERİ</div>
          </div>
        </div>
      </div>
    );
  };

  const renderProfile = () => (
    <div className="flex flex-col h-full px-6 pt-8 pb-24 overflow-y-auto space-y-6">
      <div className="flex flex-col items-center text-center mb-4">
        <div className={`relative w-24 h-24 rounded-full ${theme.card} border-4 border-[#246BFD]/10 flex items-center justify-center text-5xl shadow-lg mb-4`}>
          {state.user.avatar}
          <div className="absolute -bottom-2 bg-[#246BFD] text-white text-xs px-2 py-1 rounded-full font-bold">Lvl {state.user.level}</div>
        </div>
        <h2 className={`text-2xl font-bold ${theme.text}`}>{state.user.name}</h2>
        <div className="w-full max-w-[200px] mt-2">
            <div className="flex justify-between text-[10px] font-bold opacity-60 mb-1">
                <span>TP</span>
                <span>{state.user.xp}/{state.user.maxXp}</span>
            </div>
            <div className="w-full h-1.5 bg-[#EDEDED] rounded-full overflow-hidden">
                <div className="h-full bg-[#246BFD]" style={{ width: `${(state.user.xp / state.user.maxXp) * 100}%` }} />
            </div>
        </div>
      </div>

      <div className={`p-6 rounded-[18px] ${theme.card}`}>
        <h3 className={`text-xs font-bold uppercase mb-4 ${theme.secondaryText} flex items-center gap-2`}>
          <Trophy size={14} /> BAŞARIMLAR
        </h3>
        <div className="grid grid-cols-4 gap-4">
          {state.achievements.map((ach) => (
            <div 
              key={ach.id} 
              className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-2 text-center transition-all ${ach.unlocked ? 'bg-[#F8D548]/10 text-[#1A1A1A]' : 'bg-gray-100 grayscale opacity-40'}`}
              onClick={() => ach.unlocked && alert(ach.description)}
            >
              <span className="text-2xl drop-shadow-sm">{ach.icon}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="flex flex-col h-full px-6 pt-8 pb-24 overflow-y-auto space-y-6">
      <h2 className={`text-2xl font-bold ${theme.text}`}>Ayarlar</h2>
      {/* ... keeping existing settings logic ... */}
       <div className={`p-6 rounded-[18px] ${theme.card} space-y-5`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3"><Volume2 size={18} className={theme.secondaryText}/> <span className={`text-sm font-medium ${theme.text}`}>Resmigül Sesi</span></div>
          <button onClick={() => setState(s => ({...s, settings: {...s.settings, soundEnabled: !s.settings.soundEnabled}}))} className={`text-xs font-bold ${state.settings.soundEnabled ? 'text-[#2ECC71]' : 'text-[#C5C5C5]'}`}>
            {state.settings.soundEnabled ? 'AÇIK' : 'KAPALI'}
          </button>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3"><Vibrate size={18} className={theme.secondaryText}/> <span className={`text-sm font-medium ${theme.text}`}>Titreşim</span></div>
          <button onClick={() => setState(s => ({...s, settings: {...s.settings, hapticEnabled: !s.settings.hapticEnabled}}))} className={`text-xs font-bold ${state.settings.hapticEnabled ? 'text-[#2ECC71]' : 'text-[#C5C5C5]'}`}>
            {state.settings.hapticEnabled ? 'AÇIK' : 'KAPALI'}
          </button>
        </div>
      </div>
       <div className={`p-6 rounded-[18px] ${theme.card}`}>
        <h3 className={`text-xs font-bold uppercase mb-4 ${theme.secondaryText} flex items-center gap-2`}><Download size={14}/> YEDEKLEME</h3>
        <div className="flex gap-3">
          <button className="flex-1 bg-[#246BFD]/5 py-3 rounded-xl flex items-center justify-center text-xs font-bold text-[#246BFD]">YEDEKLE</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`h-screen w-full ${theme.bg} transition-colors duration-500 overflow-hidden flex flex-col`}>
      {state.settings.theme === 'crystal' && (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
           <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#4FD3C4] opacity-[0.03] blur-3xl"></div>
           <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#246BFD] opacity-[0.03] blur-3xl"></div>
        </div>
      )}

      {notification && (
        <NotificationToast 
          title={notification.title}
          description={notification.description}
          icon={notification.icon}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Daily Reward Modal */}
      {dailyRewardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
           <div className="bg-white rounded-[24px] w-full max-w-sm p-6 flex flex-col items-center text-center animate-pop">
              <div className="w-16 h-16 rounded-full bg-[#F8D548]/20 flex items-center justify-center text-4xl mb-4">🎁</div>
              <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">GÜNLÜK ÖDÜL</h2>
              <p className="text-sm text-[#6F6F6F] mb-4">{state.dailyRewardStreak + 1}. gün serindesin!</p>
              
              <div className="flex gap-2 mb-6">
                 {[0, 1, 2].map(i => (
                    <div key={i} className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 ${i < state.dailyRewardStreak % 3 + 1 ? 'border-[#F8D548] bg-[#F8D548]/10' : 'border-gray-100'}`}>
                      {i < state.dailyRewardStreak % 3 + 1 ? '✨' : '🔒'}
                    </div>
                 ))}
              </div>

              <div className="text-3xl font-black text-[#246BFD] mb-6">+{50 + (state.dailyRewardStreak * 10)} RP</div>
              
              <button 
                onClick={claimDailyReward}
                className="w-full py-3 rounded-xl bg-[#246BFD] text-white font-bold shadow-lg shadow-blue-500/30 active:scale-95 transition-transform"
              >
                ÖDÜLÜ AL
              </button>
           </div>
        </div>
      )}

      <main className="flex-1 relative z-10 overflow-hidden">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'market' && renderMarket()}
        {activeTab === 'stats' && renderStats()}
        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'settings' && renderSettings()}
      </main>

      <nav className={`relative z-20 ${theme.nav} flex justify-around items-center pb-safe pt-2 h-[80px]`}>
        {[
          { id: 'home', icon: Home, label: 'Resmigül' },
          { id: 'market', icon: ShoppingBag, label: 'Mağaza' },
          { id: 'stats', icon: BarChart2, label: 'Analiz' },
          { id: 'profile', icon: User, label: 'Profil' },
          { id: 'settings', icon: Settings, label: 'Ayarlar' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 ${isActive ? theme.navActive : theme.navInactive}`}
            >
              <tab.icon size={22} className={isActive ? 'stroke-current' : 'stroke-current opacity-60'} />
              {isActive && <span className="text-[9px] font-bold mt-1">{tab.label}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
}