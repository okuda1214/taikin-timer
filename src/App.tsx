import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  Calendar, 
  Coffee, 
  Bell, 
  Volume2, 
  VolumeX,
  Settings, 
  Plus, 
  Minus, 
  Trash2, 
  AlertCircle,
  HelpCircle,
  History,
  CheckCircle2,
  CalendarDays,
  FileText
} from 'lucide-react';
import { WorkLog, TimerState } from './types';

// Default standard duration is 8 hours and 30 minutes (510 minutes = 30600 seconds)
const DEFAULT_DURATION_SECONDS = 8 * 3600 + 30 * 60; 

export default function App() {
  // Current real-time clock
  const [now, setNow] = useState<Date>(new Date());

  // Web Notification Permission State
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Input fields for Custom Check-in time (Retroactive check-in)
  const [customCheckInTime, setCustomCheckInTime] = useState<string>('');
  const [showRetroactiveInput, setShowRetroactiveInput] = useState<boolean>(false);

  // Sound and notice states
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [isNotificationEnabled, setIsNotificationEnabled] = useState<boolean>(true);
  const [soundTested, setSoundTested] = useState<boolean>(false);

  // Quick settings duration (in minutes)
  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState<number>(510); // 8h30m = 510m

  // Timer configuration
  const [timer, setTimer] = useState<TimerState>(() => {
    const saved = localStorage.getItem('work_timer_state_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // If it was active, ensure TS is preserved or restored
        return parsed as TimerState;
      } catch (e) {
        // Fallback
      }
    }
    return {
      isActive: false,
      startTime: null,
      targetTime: null,
      pausedTimeRemaining: null,
      isPaused: false,
      totalDurationSeconds: DEFAULT_DURATION_SECONDS
    };
  });

  // History Work Logs
  const [logs, setLogs] = useState<WorkLog[]>(() => {
    const saved = localStorage.getItem('work_timer_logs_v1');
    if (saved) {
      try {
        return JSON.parse(saved) as WorkLog[];
      } catch (e) {
        // Fallback
      }
    }
    return [];
  });

  const [notificationShown, setNotificationShown] = useState<boolean>(false);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState<boolean>(false);
  const [notificationErrorMsg, setNotificationErrorMsg] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState<string>('');

  // Audio Synth Chime
  const playBeautifulChime = () => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      const ctx = new AudioContextClass();
      const nowTime = ctx.currentTime;
      
      // Luxurious clean arpeggio chime (C5 -> E5 -> G5 -> C6)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, nowTime);
        
        const noteStart = nowTime + index * 0.12;
        const duration = 1.4;
        
        gain.gain.setValueAtTime(0, nowTime);
        gain.gain.linearRampToValueAtTime(0.18, noteStart + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(noteStart);
        osc.stop(noteStart + duration);
      });
      setSoundTested(true);
      setTimeout(() => setSoundTested(false), 2000);
    } catch (e) {
      console.error("Audio Context failed to play chime:", e);
    }
  };

  // Loop the alarm sound when isAlarmPlaying is true
  useEffect(() => {
    let alarmInterval: ReturnType<typeof setInterval> | null = null;
    if (isAlarmPlaying && isSoundEnabled) {
      // Play immediately
      playBeautifulChime();
      // Repeat every 3.5 seconds
      alarmInterval = setInterval(() => {
        playBeautifulChime();
      }, 3500);
    }
    return () => {
      if (alarmInterval) {
        clearInterval(alarmInterval);
      }
    };
  }, [isAlarmPlaying, isSoundEnabled]);

  // Sync Timer State to LocalStorage on Change
  useEffect(() => {
    localStorage.setItem('work_timer_state_v1', JSON.stringify(timer));
  }, [timer]);

  // Sync Logs to LocalStorage on Change
  useEffect(() => {
    localStorage.setItem('work_timer_logs_v1', JSON.stringify(logs));
  }, [logs]);

  // Handle active clock ticks
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync Notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Request notifications
  const requestNotificationPermission = async () => {
    setNotificationErrorMsg(null);
    if ('Notification' in window) {
      try {
        // Check if application is running inside an iframe (such as AI Studio preview pane)
        const isIframe = window.self !== window.top;
        if (isIframe) {
          setNotificationErrorMsg('プレビュー画面（iFrame内）では、ブラウザのセキュリティ制限によって通知の許可ポップアップが表示できません。画面右上の「別タブで開く」ボタン等をクリックし、新しいタブ（別ウィンドウ）で開いた状態でもう一度「通知を許可」ボタンをお試しください。');
          return;
        }

        const result = await Notification.requestPermission();
        setNotificationPermission(result);
        
        if (result === 'denied') {
          setNotificationErrorMsg('ブラウザの設定で通知が「ブロック（拒否）」されています。アドレスバーの「鍵マーク」や「サイト設定」から通知のブロックを解除し、再度お試しください。');
        }
      } catch (e) {
        console.error("Notification permission error", e);
        setNotificationErrorMsg('通知の許可リクエスト中にエラーが発生しました。右上の「別タブで開く」から新しいタブで開いてご確認ください。');
      }
    } else {
      setNotificationErrorMsg('お使いのブラウザ、または現在の接続環境（非セキュアな環境など）は、ブラウザ通知（Desktop Notification）に対応していません。');
    }
  };

  // Remaining seconds calculation
  let remainingSeconds = 0;
  if (timer.isActive) {
    if (timer.isPaused) {
      remainingSeconds = timer.pausedTimeRemaining || 0;
    } else if (timer.targetTime) {
      remainingSeconds = Math.max(0, Math.ceil((timer.targetTime - now.getTime()) / 1000));
    }
  }

  // Auto trigger completion alert / notification once timer hits 0
  useEffect(() => {
    if (timer.isActive && !timer.isPaused && remainingSeconds === 0 && !notificationShown) {
      triggerCompletionEffects();
    }
  }, [timer.isActive, timer.isPaused, remainingSeconds, notificationShown]);

  // Reset notificationShown state if session turns inactive
  useEffect(() => {
    if (!timer.isActive) {
      setNotificationShown(false);
    }
  }, [timer.isActive]);

  const triggerCompletionEffects = () => {
    setNotificationShown(true);
    
    // Play looping audio
    if (isSoundEnabled) {
      setIsAlarmPlaying(true);
    }

    // Trigger Notification
    if (isNotificationEnabled && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('退勤時間になりました！', {
          body: `設定した ${formatDurationText(timer.totalDurationSeconds)} のカウントダウンが完了しました。本日もお疲れ様でした！`,
          icon: '/favicon.ico',
          requireInteraction: true
        });
      } catch (e) {
        console.error("Failed to showcase browser notification", e);
      }
    }
  };

  // Convert seconds to format (e.g. 8h30m -> "8時間30分")
  function formatDurationText(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (m === 0) return `${h}時間`;
    return `${h}時間${m}分`;
  }

  // Format Date to Japanese Weekday
  const formatJapaneseDate = (dt: Date): string => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    const dow = ['日', '月', '火', '水', '木', '金', '土'][dt.getDay()];
    return `${y}年${m}月${d}日(${dow})`;
  };

  // Format generic timestamps
  const formatTimeHHMMSS = (dt: Date | number): string => {
    const d = typeof dt === 'number' ? new Date(dt) : dt;
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const formatTimeHHMM = (dt: Date | number): string => {
    const d = typeof dt === 'number' ? new Date(dt) : dt;
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  // Format remaining seconds into HH:MM:SS
  const formatCountdown = (totalSecs: number): { hours: string; mins: string; secs: string } => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return {
      hours: String(h).padStart(2, '0'),
      mins: String(m).padStart(2, '0'),
      secs: String(s).padStart(2, '0'),
    };
  };

  // START / CHECK-IN TRIGGER
  const handleCheckIn = (customTimeStr?: string) => {
    const checkInDate = new Date();
    
    // Support retro start time if provided
    if (customTimeStr) {
      const [hh, mm] = customTimeStr.split(':').map(Number);
      if (!isNaN(hh) && !isNaN(mm) && hh >= 0 && hh < 24 && mm >= 0 && mm < 60) {
        checkInDate.setHours(hh);
        checkInDate.setMinutes(mm);
        checkInDate.setSeconds(0);
        checkInDate.setMilliseconds(0);
      }
    }

    const durationSecs = selectedDurationMinutes * 60;
    const startTimeStamp = checkInDate.getTime();
    const targetTimeStamp = startTimeStamp + (durationSecs * 1000);

    const newTimer: TimerState = {
      isActive: true,
      startTime: startTimeStamp,
      targetTime: targetTimeStamp,
      pausedTimeRemaining: null,
      isPaused: false,
      totalDurationSeconds: durationSecs
    };

    setTimer(newTimer);
    setNotificationShown(false);
    setShowRetroactiveInput(false);
    setIsAlarmPlaying(false);

    // Add entry to history log safely (active state)
    const newLog: WorkLog = {
      id: 'log_' + Date.now(),
      date: `${checkInDate.getFullYear()}-${String(checkInDate.getMonth() + 1).padStart(2, '0')}-${String(checkInDate.getDate()).padStart(2, '0')}`,
      checkInTime: formatTimeHHMMSS(checkInDate),
      targetTime: formatTimeHHMMSS(new Date(targetTimeStamp)),
      durationMinutes: selectedDurationMinutes,
      status: 'active'
    };

    setLogs(prev => [newLog, ...prev.filter(l => l.status !== 'active')]);
  };

  // TOGGLE PAUSE (Break starts or resumes)
  const handleTogglePause = () => {
    if (!timer.isActive || timer.startTime === null || timer.targetTime === null) return;

    if (!timer.isPaused) {
      // Pause it! Keep remaining seconds safe
      const rem = Math.max(0, Math.ceil((timer.targetTime - now.getTime()) / 1000));
      setTimer(prev => ({
        ...prev,
        isPaused: true,
        pausedTimeRemaining: rem
      }));
    } else {
      // Resume it! Calculate new target time from remaining seconds
      const rem = timer.pausedTimeRemaining || 0;
      const newTarget = Date.now() + (rem * 1000);
      setTimer(prev => ({
        ...prev,
        isPaused: false,
        targetTime: newTarget,
        pausedTimeRemaining: null
      }));

      // Update current log's target
      setLogs(prev => prev.map(l => {
        if (l.status === 'active') {
          return {
            ...l,
            targetTime: formatTimeHHMMSS(new Date(newTarget))
          };
        }
        return l;
      }));
    }
  };

  // ADJUST TARGET TIME (e.g. prolonging rest, or adjusting hours)
  const adjustTargetTime = (minutesDiff: number) => {
    if (!timer.isActive || timer.startTime === null || timer.targetTime === null) return;

    if (timer.isPaused) {
      const currentRem = timer.pausedTimeRemaining || 0;
      const newRem = Math.max(0, currentRem + (minutesDiff * 60));
      setTimer(prev => ({
        ...prev,
        pausedTimeRemaining: newRem,
        totalDurationSeconds: Math.max(60, prev.totalDurationSeconds + (minutesDiff * 60))
      }));
    } else {
      const newTarget = timer.targetTime + (minutesDiff * 60 * 1000);
      setTimer(prev => ({
        ...prev,
        targetTime: newTarget,
        totalDurationSeconds: Math.max(60, prev.totalDurationSeconds + (minutesDiff * 60))
      }));

      // Update current active log Target Time
      setLogs(prev => prev.map(l => {
        if (l.status === 'active') {
          return {
            ...l,
            targetTime: formatTimeHHMMSS(new Date(newTarget)),
            durationMinutes: Math.max(1, l.durationMinutes + minutesDiff)
          };
        }
        return l;
      }));
    }
  };

  // CHECK-OUT (Success finish)
  const handleCheckOut = () => {
    if (!timer.isActive || timer.startTime === null) return;

    const checkOutDate = new Date();
    const checkOutStr = formatTimeHHMMSS(checkOutDate);

    setLogs(prev => prev.map(l => {
      if (l.status === 'active') {
        return {
          ...l,
          actualCheckOutTime: checkOutStr,
          status: 'completed'
        };
      }
      return l;
    }));

    // Reset TimerState
    setTimer({
      isActive: false,
      startTime: null,
      targetTime: null,
      pausedTimeRemaining: null,
      isPaused: false,
      totalDurationSeconds: timer.totalDurationSeconds
    });
    setIsAlarmPlaying(false);
  };

  // CANCEL TIMER session (Discard current)
  const handleCancelTimer = () => {
    if (window.confirm('現在のタイマーを破棄してリセットしますか？')) {
      setLogs(prev => prev.map(l => {
        if (l.status === 'active') {
          return {
            ...l,
            status: 'canceled'
          };
        }
        return l;
      }));

      setTimer({
        isActive: false,
        startTime: null,
        targetTime: null,
        pausedTimeRemaining: null,
        isPaused: false,
        totalDurationSeconds: timer.totalDurationSeconds
      });
      setIsAlarmPlaying(false);
    }
  };

  // DELETE LOG Entry
  const handleDeleteLog = (id: string) => {
    if (window.confirm('この履歴を削除しますか？')) {
      setLogs(prev => prev.filter(l => l.id !== id));
    }
  };

  // CLEAR ALL LOGS
  const handleClearAllLogs = () => {
    if (window.confirm('今までのすべての勤怠履歴を消去しますか？')) {
      setLogs([]);
    }
  };

  // NOTE EDITING handlers
  const startEditingNote = (id: string, text?: string) => {
    setEditingNoteId(id);
    setTempNoteText(text || '');
  };

  const saveEditedNote = (id: string) => {
    setLogs(prev => prev.map(l => {
      if (l.id === id) {
        return { ...l, notes: tempNoteText };
      }
      return l;
    }));
    setEditingNoteId(null);
    setTempNoteText('');
  };

  // Duration Options list
  const durationPresets = [
    { label: '8時間30分 (通常)', mins: 510 },
    { label: '8時間00分', mins: 480 },
    { label: '9時間00分', mins: 540 },
    { label: '9時間30分 (残業1h)', mins: 570 },
  ];

  // Calculate elapsed progress percentage
  const totalSecs = timer.totalDurationSeconds || DEFAULT_DURATION_SECONDS;
  const elapsedSecs = Math.max(0, totalSecs - remainingSeconds);
  const progressPercent = timer.isActive ? Math.min(100, (elapsedSecs / totalSecs) * 100) : 0;

  // Render variables
  const cd = formatCountdown(remainingSeconds);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex flex-col justify-between">
      
      {/* Top Header Grid */}
      <header className="border-b border-slate-200/80 bg-white/75 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-600 text-white rounded-xl shadow-md shadow-sky-100 flex items-center justify-center">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                退勤目安タイマー <span className="text-xs bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-medium">8.5h 対応</span>
              </h1>
              <p className="text-xs text-slate-500">出勤から8時間30分自動カウントダウン</p>
            </div>
          </div>

          {/* Current Real Time Clock visual */}
          <div className="flex items-center gap-3 bg-slate-100/80 px-4 py-2 rounded-2xl border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-xs font-semibold text-slate-500 font-mono tracking-wider">現在時刻</span>
            <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
              {formatTimeHHMMSS(now)}
            </span>
          </div>

        </div>
      </header>

      {/* Active Alarm looping alert banner */}
      <AnimatePresence>
        {isAlarmPlaying && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gradient-to-r from-rose-500 to-amber-500 text-white font-medium overflow-hidden border-b border-rose-600/20"
          >
            <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div className="flex items-center gap-3">
                <span className="p-1 px-2.5 bg-white/20 rounded-md text-xs font-black uppercase tracking-wider animate-pulse flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                  Ringing
                </span>
                <span className="text-sm font-bold tracking-wide">
                  ⏰ 退勤時間になりました！アラーム音を繰り返し再生しています。
                </span>
              </div>
              <div className="flex gap-2 min-w-fit mt-1 sm:mt-0">
                <button
                  onClick={() => setIsAlarmPlaying(false)}
                  className="bg-white hover:bg-slate-100 text-rose-600 font-bold text-xs px-4 py-2 rounded-xl transition shadow-md active:scale-95 flex items-center gap-1 cursor-pointer"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  アラーム停止 (Stop Sound)
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto px-4 py-8 flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Active Timer Panel / Action Card */}
        <section className="lg:col-span-7 flex flex-col gap-6" id="timer-left-panel">
          
          <AnimatePresence mode="wait">
            {!timer.isActive ? (
              
              /* == IDLE STATE CARD == */
              <motion.div 
                key="idle-card"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden flex flex-col justify-between"
              >
                {/* Background soft glow accent */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-sky-50 rounded-full blur-3xl opacity-60"></div>
                
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-sm font-semibold text-sky-600 bg-sky-50 px-3 py-1 rounded-full">
                      タイマー未セット
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {formatJapaneseDate(now)}
                    </span>
                  </div>

                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
                    おはようございます！
                  </h2>
                  <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                    作業開始時に「出勤する」ボタンを押すと、自動的に次のスケジュールが算出されます。
                  </p>

                  {/* Preset Duration Workday Selection */}
                  <div className="bg-slate-50/80 border border-slate-200 p-4 rounded-2xl mb-6">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                      勤務時間（デフォルト：8.5時間）
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {durationPresets.map((preset) => (
                        <button
                          key={preset.mins}
                          onClick={() => setSelectedDurationMinutes(preset.mins)}
                          className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all ${
                            selectedDurationMinutes === preset.mins
                              ? 'bg-sky-600 border-sky-600 text-white shadow-sm shadow-sky-100'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Simple Customizer Slider */}
                    <div className="mt-4 pt-3 border-t border-slate-200/60">
                      <div className="flex justify-between items-center text-xs text-slate-500 mb-1.5">
                        <span>カスタム時間調整</span>
                        <span className="font-bold text-sky-600 font-mono">
                          {Math.floor(selectedDurationMinutes / 60)}時間{selectedDurationMinutes % 60}分
                        </span>
                      </div>
                      <input 
                        type="range" 
                        min="60" 
                        max="720" 
                        step="15" 
                        value={selectedDurationMinutes}
                        onChange={(e) => setSelectedDurationMinutes(Number(e.target.value))}
                        className="w-full accent-sky-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Retroactive / Custom Time Option */}
                  {showRetroactiveInput ? (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-slate-50 border border-slate-200 p-4 rounded-2xl mb-6 flex flex-col gap-3"
                    >
                      <span className="text-xs font-bold text-slate-600 block">時間を遡って出勤時間を設定：</span>
                      <div className="flex gap-2 items-center">
                        <input
                          type="time"
                          value={customCheckInTime}
                          onChange={(e) => setCustomCheckInTime(e.target.value)}
                          className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 flex-grow"
                        />
                        <button
                          onClick={() => {
                            if (customCheckInTime) {
                              handleCheckIn(customCheckInTime);
                            } else {
                              alert('有効な時間を設定してください。');
                            }
                          }}
                          className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition"
                        >
                          確定チェックイン
                        </button>
                        <button
                          onClick={() => setShowRetroactiveInput(false)}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold px-3 py-2.5 rounded-xl transition"
                        >
                          閉じる
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        ※数分前に出勤していて、ボタンを押し忘れた場合に便利です。
                      </span>
                    </motion.div>
                  ) : (
                    <div className="text-center mb-6">
                      <button
                        onClick={() => {
                          // set default to current hours/minutes
                          const d = new Date();
                          setCustomCheckInTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
                          setShowRetroactiveInput(true);
                        }}
                        className="text-xs text-sky-600 hover:text-sky-850 underline font-medium inline-flex items-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        出勤時間を指定してチェックイン (押し忘れなど)
                      </button>
                    </div>
                  )}
                </div>

                {/* Massive Primary Check In Button */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCheckIn()}
                  className="w-full bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white py-5 px-6 rounded-2xl shadow-lg ring-4 ring-sky-500/10 font-bold text-lg tracking-wide transition duration-150 flex items-center justify-center gap-3 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-white" />
                  出勤チェックイン（タイマー起動）
                </motion.button>

              </motion.div>

            ) : (
              
              /* == ACTIVE COUNTDOWN STATE CARD == */
              <motion.div 
                key="active-card"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-sky-100 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden"
              >
                
                {/* Visual Status Ribbons */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex gap-2">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      timer.isPaused 
                        ? 'bg-amber-100 text-amber-700 font-medium' 
                        : remainingSeconds === 0 
                          ? 'bg-rose-100 text-rose-700 font-medium animate-bounce' 
                          : 'bg-emerald-100 text-emerald-800 font-medium'
                    }`}>
                      {timer.isPaused ? '休憩中' : remainingSeconds === 0 ? '退勤時間到達🎉' : '出勤カウント中'}
                    </span>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                      設定目安：{formatDurationText(timer.totalDurationSeconds)}
                    </span>
                  </div>
                  
                  <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                    {formatJapaneseDate(now)}
                  </span>
                </div>

                {/* Countdown Large Layout */}
                <div className="text-center py-4 flex flex-col items-center">
                  
                  <p className="text-sm font-semibold text-slate-400 mb-2">
                    {remainingSeconds === 0 ? '本日もお疲れ様でした！' : '退勤まであと'}
                  </p>

                  {/* Main Time Visual Frame */}
                  <div className="flex items-end justify-center font-mono text-slate-900 mb-1.5 tracking-tight">
                    <span className="text-5xl sm:text-7xl font-bold tabular-nums tracking-tighter text-sky-950">
                      {cd.hours}
                    </span>
                    <span className="text-3xl sm:text-5xl text-sky-400 px-1 font-sans font-medium">:</span>
                    <span className="text-5xl sm:text-7xl font-bold tabular-nums tracking-tighter text-sky-950">
                      {cd.mins}
                    </span>
                    <span className="text-3xl sm:text-5xl text-sky-400 px-1 font-sans font-medium">:</span>
                    <span className="text-3xl sm:text-4xl text-slate-400 pb-1 font-bold tracking-normal tabular-nums ml-1">
                      {cd.secs}
                    </span>
                  </div>

                  {/* Linear Progress Bar with subtle glows */}
                  <div className="w-full mt-6 mb-8 bg-slate-100 border border-slate-200 rounded-full h-4 relative overflow-hidden">
                    <motion.div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        remainingSeconds === 0 
                          ? 'bg-emerald-500' 
                          : timer.isPaused 
                            ? 'bg-amber-400' 
                            : 'bg-gradient-to-r from-sky-500 to-sky-600'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] font-extrabold text-slate-600 bg-white/90 px-2 py-0.2 rounded-full shadow-sm border border-slate-100 font-mono">
                        {Math.floor(progressPercent)}% 経過
                      </span>
                    </div>
                  </div>

                  {/* Target Time & Source Time display */}
                  <div className="grid grid-cols-2 gap-4 w-full text-slate-700 border-t border-b border-slate-100 py-4 mb-6">
                    <div className="border-r border-slate-100 flex flex-col items-center">
                      <span className="text-xs text-slate-400 mb-1">出勤した時間</span>
                      <span className="text-lg font-bold font-mono text-slate-800">
                        {timer.startTime ? formatTimeHHMM(timer.startTime) : '--:--'}
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-sky-600 font-semibold mb-1">⌚ 退勤目安時刻</span>
                      <span className="text-lg font-extrabold font-mono text-sky-700">
                        {timer.targetTime ? formatTimeHHMM(timer.targetTime) : '--:--'}
                      </span>
                    </div>
                  </div>

                  {/* Fine Adjustment Section */}
                  <div className="flex items-center gap-1.5 mb-6 justify-center bg-slate-50 p-2 rounded-2xl w-full max-w-sm border border-slate-200/65">
                    <span className="text-xs text-slate-500 font-medium ml-2">目標調整:</span>
                    <button 
                      onClick={() => adjustTargetTime(10)} 
                      className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1"
                      title="10分追加"
                    >
                      <Plus className="w-3 h-3 text-sky-600" />
                      10分
                    </button>
                    <button 
                      onClick={() => adjustTargetTime(30)} 
                      className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1"
                      title="30分追加"
                    >
                      <Plus className="w-3 h-3 text-sky-600" />
                      30分
                    </button>
                    <button 
                      onClick={() => adjustTargetTime(-10)} 
                      className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1"
                      title="10分短縮"
                    >
                      <Minus className="w-3 h-3 text-amber-600" />
                      10分
                    </button>
                  </div>

                  {/* Control Button Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                    
                    {/* Pause break toggle */}
                    <button
                      onClick={handleTogglePause}
                      className={`py-3.5 px-4 rounded-xl border font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        timer.isPaused
                          ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-100'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      {timer.isPaused ? (
                        <>
                          <Play className="w-4 h-4 fill-white" />
                          休憩終了
                        </>
                      ) : (
                        <>
                          <Coffee className="w-4 h-4 text-amber-500" />
                          休憩(一時停止)
                        </>
                      )}
                    </button>

                    {/* Quick Finish Clockout */}
                    <button
                      onClick={handleCheckOut}
                      className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-3.5 px-4 rounded-xl shadow-md font-bold text-sm tracking-wide transition flex items-center justify-center gap-2 cursor-pointer col-span-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      退勤完了！
                    </button>

                    {/* Reset button */}
                    <button
                      onClick={handleCancelTimer}
                      className="bg-slate-50 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-slate-200 text-slate-600 py-3.5 px-4 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      取り消す
                    </button>

                    {/* Audio tested alert preview trigger */}
                    <button
                      onClick={playBeautifulChime}
                      className="bg-slate-50 hover:bg-slate-150 border border-slate-200 text-slate-600 py-3.5 px-4 rounded-xl font-semibold text-xs transition flex flex-col items-center justify-center leading-tight cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-sky-600 mb-0.5" />
                      アラームテスト
                    </button>

                  </div>

                </div>

              </motion.div>
            )}
          </AnimatePresence>

          {/* Tips / Instructions Box */}
          <div className="bg-sky-50/80 border border-sky-100/80 rounded-2xl p-5 flex gap-3 text-sm text-sky-950">
            <AlertCircle className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div className="flex-grow">
              <h4 className="font-bold mb-1">退勤タイマーの使い方</h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-sky-900/90 pl-1 leading-relaxed">
                <li>出勤時に「出勤ボタン」を押すと、<strong>8時間30分後</strong>が自動算出されます。</li>
                <li>休憩や外出時には一時停止ボタンをご活用ください。</li>
                <li>「目標調整」ボタンでその日の業務調整（残業や長めの休憩）を簡単に追加・削減できます。</li>
                <li>ブラウザを一時的に閉じても、裏側で計測が維持されます！</li>
              </ul>
            </div>
          </div>

        </section>

        {/* Right Column: Attendance Statistics & Log History */}
        <section className="lg:col-span-5 flex flex-col gap-6" id="timer-right-panel">
          
          {/* Notifications config & permissions */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Bell className="w-4 h-4 text-sky-600" />
              通知・デバイス設定
            </h3>

            <div className="space-y-3.5">
              
              {/* Web Notification Permission controller */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs">
                    <p className="font-bold text-slate-800">デスクトップ通知</p>
                    <p className="text-slate-500">時間になったら画面上に通知を送ります</p>
                  </div>
                  {notificationPermission !== 'granted' ? (
                    <button
                      onClick={requestNotificationPermission}
                      className="bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg transition shrink-0 cursor-pointer"
                    >
                      通知を許可
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg shrink-0">
                      有効
                    </span>
                  )}
                </div>

                {/* Info Tip about iframe restriction */}
                {notificationPermission !== 'granted' && (
                  <p className="text-[10px] text-slate-400 bg-slate-50 border border-dashed border-slate-200 p-2 rounded-lg leading-relaxed">
                    ⚠️ <strong>[プレビュー時の注意]</strong> 右側のプレビュー枠（iFrame内）ではダイアログがブロックされます。動作を試す場合は、画面右上の<strong>「別タブで開く」</strong>ボタンをクリックし、新しいタブで開いた画面でお試しください。
                  </p>
                )}

                {/* Error / Alert feedback */}
                {notificationErrorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-xl leading-relaxed flex gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{notificationErrorMsg}</span>
                  </motion.div>
                )}
              </div>

              {/* Bell Sounds toggle */}
              <div className="flex items-center justify-between p-2">
                <div className="text-xs">
                  <p className="font-bold text-slate-850">メロディ通知音</p>
                  <p className="text-slate-450 text-[10px]">時間経過時に心地よいオリジナルチャイムを再生</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={isSoundEnabled}
                  onChange={(e) => setIsSoundEnabled(e.target.checked)}
                  className="w-4 h-4 text-sky-600 border-slate-300 rounded focus:ring-sky-500"
                />
              </div>

              {/* Sound Test Status feedback */}
              {soundTested && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  className="p-2 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg text-center"
                >
                  🎵 チャイム音が正常に再生されました！
                </motion.div>
              )}

            </div>
          </div>

          {/* History Work Logs Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex-grow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-850 flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-500" />
                  最近の勤怠記録
                </h3>
                {logs.length > 0 && (
                  <button
                    onClick={handleClearAllLogs}
                    className="text-[10px] text-slate-400 hover:text-rose-500 transition font-semibold"
                  >
                    履歴クリア
                  </button>
                )}
              </div>

              {/* Log List View */}
              <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                {logs.length === 0 ? (
                  <div className="py-8 text-center flex flex-col items-center justify-center">
                    <CalendarDays className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-xs text-slate-400">出勤記録がありません。</p>
                    <p className="text-[10px] text-slate-400">チェックインして作業を終了すると自動保存されます。</p>
                  </div>
                ) : (
                  logs.map((log) => {
                    const isEditing = editingNoteId === log.id;
                    return (
                      <div 
                        key={log.id} 
                        className={`text-xs p-3.5 rounded-2xl border transition-all ${
                          log.status === 'active' 
                            ? 'bg-sky-50/50 border-sky-200 ring-2 ring-sky-100'
                            : log.status === 'canceled'
                              ? 'bg-slate-50 border-slate-200 opacity-60'
                              : 'bg-white border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-800">{log.date}</span>
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              log.status === 'active'
                                ? 'bg-sky-100 text-sky-700 animate-pulse'
                                : log.status === 'canceled'
                                  ? 'bg-slate-100 text-slate-500'
                                  : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {log.status === 'active' ? '計測中' : log.status === 'canceled' ? '取消' : '完了'}
                            </span>
                            <button
                              onClick={() => handleDeleteLog(log.id)}
                              className="text-slate-400 hover:text-rose-500 p-0.5 transition"
                              title="記録の削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Working Details */}
                        <div className="grid grid-cols-3 gap-2 font-mono text-slate-600 mb-2 pt-1 border-t border-slate-100/60 text-[11px]">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-sans">出勤</span>
                            <span className="font-bold text-slate-750">{log.checkInTime.slice(0, 5)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-sans">目安</span>
                            <span className="font-bold text-sky-600">{log.targetTime.slice(0, 5)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-sans">退勤</span>
                            <span className="font-bold text-emerald-600">
                              {log.actualCheckOutTime ? log.actualCheckOutTime.slice(0, 5) : log.status === 'active' ? '中' : '--:--'}
                            </span>
                          </div>
                        </div>

                        {/* Notes Input / Preview Accordion */}
                        <div className="mt-2 bg-slate-100/50 p-2 rounded-xl border border-slate-200/40">
                          {isEditing ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={tempNoteText}
                                onChange={(e) => setTempNoteText(e.target.value)}
                                placeholder="作業メモ（例: リモート、直行等）"
                                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-sky-500 flex-grow"
                              />
                              <button
                                onClick={() => saveEditedNote(log.id)}
                                className="bg-sky-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-sky-700 transition"
                              >
                                保存
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-slate-500 text-[10px] italic truncate flex-grow">
                                {log.notes || 'メモ未登録（案件など）'}
                              </span>
                              <button
                                onClick={() => startEditingNote(log.id, log.notes)}
                                className="text-sky-600 hover:text-sky-850 text-[10px] font-semibold hover:underline"
                              >
                                {log.notes ? '編集' : '+ メモ'}
                              </button>
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Total count footer log */}
            {logs.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center bg-slate-50 -mx-5 -mb-5 px-5 py-3 rounded-b-3xl">
                <span>登録件数: <strong>{logs.length}</strong> 件</span>
                <span className="text-sky-600 font-semibold">本日もお疲れ様でした。</span>
              </div>
            )}

          </div>

        </section>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 mt-12 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© 2026 退勤タイマー. All Rights Reserved. (Work 8h 30m Automatic Set)</p>
          <div className="flex gap-4">
            <span className="hover:text-sky-500 transition cursor-help flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" />
              ローカル保存対応
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
