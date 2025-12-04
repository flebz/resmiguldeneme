import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Home, BarChart2, Settings, User, Trophy, Zap, Volume2, VolumeX, Vibrate, Download, Upload, Palette, TrendingUp, CheckCircle, Calendar } from './components/Icons';
import ConfettiEffect from './components/Confetti';
import NotificationToast from './components/NotificationToast';
import { AppState, DailyStats, THEMES, ThemeType, Achievement } from './types';
import { DEFAULT_STATE, getTodayISO, MOTIVATIONAL_QUOTES } from './constants';

// --- Local Storage Service ---
const STORAGE_KEY = 'resmigul_crystal_v2';
const saveState = (state: AppState) => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
const loadState = (): AppState | null => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : null;
};

// --- Sound Helper ---
const playClickSound = () => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.05, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
};

// --- Notification Sound Helper ---
const playSuccessSound = () => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  // High pitched "Ding"
  osc.frequency.setValueAtTime(1200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.1);
  
  gain.gain.setValueAtTime(0.05, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  
  osc.type = 'sine';
  osc.start();
  osc.stop(ctx.currentTime + 0.5);
};

export default function App() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [activeTab, setActiveTab] = useState<'home' | 'stats' | 'profile' | 'settings'>('home');
  const [showConfetti, setShowConfetti] = useState(false);
  const [animateButton, setAnimateButton] = useState(false);
  const [dailyQuote, setDailyQuote] = useState("");
  const [notification, setNotification] = useState<Achievement | null>(null);
  const lastTapRef = useRef<number>(0);

  // --- Initialization & Daily Logic ---
  useEffect(() => {
    const loaded = loadState();
    const today = getTodayISO();
    
    // Pick quote based on date hash
    const quoteIndex = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % MOTIVATIONAL_QUOTES.length;
    setDailyQuote(MOTIVATIONAL_QUOTES[quoteIndex]);

    if (loaded) {
      // Check for day change
      if (loaded.currentDate !== today) {
        // Archive yesterday
        const yesterdayStats: DailyStats = {
          date: loaded.currentDate,
          count: loaded.todayCount,
          goal: getGoal(loaded),
          completed: loaded.todayCount >= getGoal(loaded)
        };
        
        // Update Streak
        let newStreak = loaded.streak;
        
        const prevDate = new Date(loaded.currentDate);
        const currDate = new Date(today);
        const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        if (diffDays === 1 && yesterdayStats.completed) {
           newStreak += 1;
        } else if (diffDays > 1) {
           newStreak = 0;
        } else if (diffDays === 1 && !yesterdayStats.completed) {
           newStreak = 0;
        }

        setState({
          ...loaded,
          currentDate: today,
          todayCount: 0,
          history: [...loaded.history, yesterdayStats],
          streak: newStreak
        });
      } else {
        setState(loaded);
      }
    } else {
      setState({ ...DEFAULT_STATE, currentDate: today });
    }
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
      setNotification(newlyUnlocked);
      if (state.settings.soundEnabled) playSuccessSound();
      if (state.settings.hapticEnabled && navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
  }, [state.todayCount, state.totalCount, state.streak]);

  const getGoal = (s: AppState = state) => {
    if (s.settings.customGoal) return s.settings.customGoal;
    const start = new Date(s.user.startDate).getTime();
    const now = new Date(s.currentDate).getTime();
    const diffDays = Math.floor((now - start) / (1000 * 3600 * 24));
    return 50 + (diffDays * 50);
  };

  const currentGoal = getGoal();
  const theme = THEMES[state.settings.theme];
  const progressPercent = Math.min(100, Math.round((state.todayCount / currentGoal) * 100));

  // --- Actions ---
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 80) return; // Anti-spam
    lastTapRef.current = now;

    if (state.settings.soundEnabled) playClickSound();
    if (state.settings.hapticEnabled && navigator.vibrate) navigator.vibrate(15);
    
    setAnimateButton(true);
    setTimeout(() => setAnimateButton(false), 150);

    let increment = 1;
    let isBonus = false;
    // Fun Mode: Random +3 or +5
    if (state.settings.funMode && Math.random() < 0.08) {
      increment = Math.random() < 0.5 ? 3 : 5;
      isBonus = true;
    }

    setState(prev => {
      const newCount = prev.todayCount + increment;
      if (newCount >= currentGoal && prev.todayCount < currentGoal) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
      return {
        ...prev,
        todayCount: newCount,
        totalCount: prev.totalCount + increment
      };
    });
  }, [state.settings, currentGoal]);

  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "resmigul_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.currentDate && parsed.history) {
          setState(parsed);
          alert("Resmigül verileri başarıyla yüklendi!");
        }
      } catch (err) {
        alert("Dosya formatı hatalı.");
      }
    };
    reader.readAsText(file);
  };

  // --- Views ---

  const renderHome = () => (
    <div className="flex flex-col items-center justify-between h-full pt-6 pb-24 px-6 relative">
      <ConfettiEffect trigger={showConfetti} />
      
      {/* Header */}
      <div className="w-full flex justify-between items-center">
        <div>
          <h1 className={`text-xl font-bold ${theme.text}`}>Resmigül</h1>
          <p className={`text-xs font-medium ${theme.secondaryText}`}>
            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className={`px-4 py-2 rounded-full ${theme.card} flex items-center gap-2`}>
          <Zap size={16} className="text-[#F8D548] fill-[#F8D548]" />
          <span className={`text-sm font-bold ${theme.text}`}>{state.streak}</span>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="w-full grid grid-cols-2 gap-4 mt-6">
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
        {/* Ripple/Glow behind */}
        <div className={`absolute w-64 h-64 rounded-full ${theme.primary} opacity-5 animate-pulse`} />
        
        <button
          onClick={handleTap}
          className={`
            w-64 h-64 rounded-full flex flex-col items-center justify-center
            ${theme.button}
            transition-all duration-100 outline-none select-none z-10
            ${animateButton ? 'scale-[1.07]' : 'scale-100'}
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

      {/* Bottom Total */}
      <div className={`w-full p-4 rounded-[18px] ${theme.card} flex justify-between items-center`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${theme.primary} bg-opacity-10`}>
            <TrendingUp size={20} className={theme.accent} />
          </div>
          <div className="flex flex-col">
            <span className={`text-[10px] font-bold uppercase ${theme.secondaryText}`}>TOPLAM RESMİGÜL</span>
            <span className={`text-lg font-bold ${theme.text}`}>{state.totalCount.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStats = () => {
    const weeklyData = state.history.slice(-7).map(h => ({
      name: new Date(h.date).toLocaleDateString('tr-TR', { weekday: 'short' }),
      count: h.count,
      goal: h.goal
    }));

    if (weeklyData.length < 7) {
       const missing = 7 - weeklyData.length;
       for(let i=0; i<missing; i++) {
         weeklyData.unshift({ name: '-', count: 0, goal: 50 });
       }
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
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
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
            <Calendar size={20} className="mb-2 text-[#246BFD]" />
            <div className={`text-2xl font-bold ${theme.text}`}>{state.history.length}</div>
            <div className={`text-[10px] font-bold uppercase ${theme.secondaryText}`}>GÜN KAYITLI</div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className={`text-xs font-bold uppercase ${theme.secondaryText}`}>GEÇMİŞ KAYITLAR</h3>
          {state.history.slice().reverse().map((day, i) => (
            <div key={i} className={`flex justify-between items-center p-4 rounded-[18px] ${theme.card}`}>
              <div className="flex items-center gap-4">
                <div className={`w-2.5 h-2.5 rounded-full ${day.completed ? 'bg-[#2ECC71]' : 'bg-[#F8D548]'}`} />
                <div>
                  <p className={`text-sm font-bold ${theme.text}`}>{day.date}</p>
                  <p className={`text-[10px] ${theme.secondaryText}`}>Hedef: {day.goal}</p>
                </div>
              </div>
              <span className={`font-mono font-bold text-lg ${theme.accent}`}>{day.count}</span>
            </div>
          ))}
          {state.history.length === 0 && <p className="text-center opacity-40 text-sm">Veri bulunamadı.</p>}
        </div>
      </div>
    );
  };

  const renderProfile = () => (
    <div className="flex flex-col h-full px-6 pt-8 pb-24 overflow-y-auto space-y-6">
      <div className="flex flex-col items-center text-center mb-4">
        <div className={`w-24 h-24 rounded-full ${theme.card} border-4 border-[#246BFD]/10 flex items-center justify-center text-5xl shadow-lg mb-4`}>
          {state.user.avatar}
        </div>
        <h2 className={`text-2xl font-bold ${theme.text}`}>{state.user.name}</h2>
        <p className={`text-xs font-bold uppercase tracking-wide ${theme.secondaryText} mt-1`}>
          KATILIM: {state.user.startDate}
        </p>
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

      <div className="space-y-4">
         <div className={`p-4 rounded-[18px] ${theme.card}`}>
            <label className={`text-[10px] font-bold uppercase ${theme.secondaryText} block mb-2`}>KULLANICI ADI</label>
            <input 
              type="text" 
              value={state.user.name} 
              onChange={(e) => setState({...state, user: {...state.user, name: e.target.value}})}
              className={`w-full bg-transparent border-b border-[#EDEDED] py-2 text-lg font-bold ${theme.text} outline-none focus:border-[#246BFD] transition-colors`} 
            />
         </div>
         <button className={`w-full py-4 rounded-[18px] border border-dashed border-[#C5C5C5] text-[#C5C5C5] font-bold text-sm flex items-center justify-center gap-2`}>
           <User size={16} /> GOOGLE İLE SENKRONİZE ET (YAKINDA)
         </button>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="flex flex-col h-full px-6 pt-8 pb-24 overflow-y-auto space-y-6">
      <h2 className={`text-2xl font-bold ${theme.text}`}>Ayarlar</h2>
      
      <div className={`p-6 rounded-[18px] ${theme.card}`}>
        <h3 className={`text-xs font-bold uppercase mb-4 ${theme.secondaryText} flex items-center gap-2`}><Palette size={14}/> GÖRÜNÜM</h3>
        <div className="flex gap-2">
          {(['crystal', 'dark', 'neon'] as ThemeType[]).map((t) => (
            <button
              key={t}
              onClick={() => setState(s => ({...s, settings: {...s.settings, theme: t}}))}
              className={`flex-1 py-3 rounded-xl text-xs font-bold capitalize transition-all border ${state.settings.theme === t ? 'border-[#246BFD] bg-[#246BFD]/5 text-[#246BFD]' : 'border-transparent bg-gray-50 text-gray-400'}`}
            >
              {t === 'crystal' ? 'Kristal' : t}
            </button>
          ))}
        </div>
      </div>

      <div className={`p-6 rounded-[18px] ${theme.card}`}>
        <h3 className={`text-xs font-bold uppercase mb-4 ${theme.secondaryText} flex items-center gap-2`}><TrendingUp size={14}/> GÜNLÜK HEDEF</h3>
        <div className="flex items-center justify-between mb-4">
          <span className={`text-sm font-medium ${theme.text}`}>Otomatik Hedef ({currentGoal})</span>
          <button 
             className={`w-12 h-6 rounded-full p-1 transition-colors ${state.settings.customGoal === null ? 'bg-[#2ECC71]' : 'bg-[#C5C5C5]'}`}
             onClick={() => setState(s => ({...s, settings: {...s.settings, customGoal: s.settings.customGoal === null ? 100 : null}}))}
          >
            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${state.settings.customGoal === null ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
        {state.settings.customGoal !== null && (
          <input 
            type="number" 
            value={state.settings.customGoal} 
            onChange={(e) => setState(s => ({...s, settings: {...s.settings, customGoal: parseInt(e.target.value) || 0}}))}
            className={`w-full p-3 rounded-xl bg-gray-50 text-[#1A1A1A] font-bold outline-none border border-transparent focus:border-[#246BFD]`}
            placeholder="Özel hedef girin"
          />
        )}
      </div>

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
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3"><Zap size={18} className={theme.secondaryText}/> <span className={`text-sm font-medium ${theme.text}`}>Eğlence Modu</span></div>
          <button onClick={() => setState(s => ({...s, settings: {...s.settings, funMode: !s.settings.funMode}}))} className={`text-xs font-bold ${state.settings.funMode ? 'text-[#2ECC71]' : 'text-[#C5C5C5]'}`}>
            {state.settings.funMode ? 'AÇIK' : 'KAPALI'}
          </button>
        </div>
      </div>

      <div className={`p-6 rounded-[18px] ${theme.card}`}>
        <h3 className={`text-xs font-bold uppercase mb-4 ${theme.secondaryText} flex items-center gap-2`}><Download size={14}/> YEDEKLEME</h3>
        <div className="flex gap-3">
          <button onClick={exportData} className="flex-1 bg-[#246BFD]/5 hover:bg-[#246BFD]/10 py-3 rounded-xl flex items-center justify-center text-xs font-bold text-[#246BFD] transition-colors">
            <Download size={14} className="mr-2" /> İNDİR
          </button>
          <label className="flex-1 bg-[#246BFD]/5 hover:bg-[#246BFD]/10 py-3 rounded-xl flex items-center justify-center text-xs font-bold text-[#246BFD] transition-colors cursor-pointer">
            <Upload size={14} className="mr-2" /> YÜKLE
            <input type="file" onChange={importData} accept=".json" className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`h-screen w-full ${theme.bg} transition-colors duration-500 overflow-hidden flex flex-col`}>
      {/* Background decorations for Crystal Theme */}
      {state.settings.theme === 'crystal' && (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
           <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#4FD3C4] opacity-[0.03] blur-3xl"></div>
           <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#246BFD] opacity-[0.03] blur-3xl"></div>
        </div>
      )}

      {/* Achievement Notification Overlay */}
      {notification && (
        <NotificationToast 
          title={notification.title}
          description={notification.description}
          icon={notification.icon}
          onClose={() => setNotification(null)}
        />
      )}

      <main className="flex-1 relative z-10 overflow-hidden">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'stats' && renderStats()}
        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'settings' && renderSettings()}
      </main>

      <nav className={`relative z-20 ${theme.nav} flex justify-around items-center pb-safe pt-2 h-[80px]`}>
        {[
          { id: 'home', icon: Home, label: 'Resmigül' },
          { id: 'stats', icon: BarChart2, label: 'Analiz' },
          { id: 'profile', icon: User, label: 'Profil' },
          { id: 'settings', icon: Settings, label: 'Ayarlar' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all duration-300 ${isActive ? theme.navActive : theme.navInactive}`}
            >
              <tab.icon size={24} className={isActive ? 'stroke-current' : 'stroke-current opacity-60'} />
              {isActive && <span className="text-[10px] font-bold mt-1">{tab.label}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
}