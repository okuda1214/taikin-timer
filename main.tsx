export interface WorkLog {
  id: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // HH:MM:SS
  targetTime: string; // HH:MM:SS
  actualCheckOutTime?: string; // HH:MM:SS
  durationMinutes: number; // the set duration target (default 510 minutes = 8h30m)
  notes?: string;
  status: 'active' | 'completed' | 'canceled';
}

export interface TimerState {
  isActive: boolean;
  startTime: number | null; // epoch timestamp
  targetTime: number | null; // epoch timestamp
  pausedTimeRemaining: number | null; // in seconds
  isPaused: boolean;
  totalDurationSeconds: number; // customizable, default 30600 (8h30m)
}
