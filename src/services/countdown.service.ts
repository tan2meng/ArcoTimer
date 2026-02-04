import { Injectable, signal, computed, effect } from '@angular/core';

export interface TimerInstance {
  id: string;
  label: string;
  totalTime: number; // Seconds
  remainingTime: number; // Seconds
  status: 'running' | 'paused' | 'finished';
  originalDuration: number; 
}

export interface RecentTimer {
  id: string;
  duration: number; 
  timestamp: number; 
}

@Injectable({
  providedIn: 'root'
})
export class CountdownService {
  // Input Selection State
  selectedHours = signal(0);
  selectedMinutes = signal(5); 
  selectedSeconds = signal(0);
  
  // Data Stores
  activeTimers = signal<TimerInstance[]>([]);
  recentTimers = signal<RecentTimer[]>([]);
  
  // Computed
  hasFinishedTimers = computed(() => this.activeTimers().some(t => t.status === 'finished'));
  
  private intervalId: any;
  private audioCtx: AudioContext | null = null;
  private oscillator: any = null; 
  private soundTimeout: any;

  constructor() {
    this.loadRecents();
    
    // Global ticker
    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);

    effect(() => {
        localStorage.setItem('recentTimers', JSON.stringify(this.recentTimers()));
    });
  }

  private loadRecents() {
      const saved = localStorage.getItem('recentTimers');
      if (saved) {
          try {
              this.recentTimers.set(JSON.parse(saved));
          } catch(e) {
              console.error(e);
          }
      }
  }

  addTimer(durationSeconds: number, label?: string) {
    if (durationSeconds <= 0) return;

    const newTimer: TimerInstance = {
      id: crypto.randomUUID(),
      label: label || 'Timer',
      totalTime: durationSeconds,
      remainingTime: durationSeconds,
      status: 'running',
      originalDuration: durationSeconds
    };
    this.activeTimers.update(timers => [newTimer, ...timers]);

    // Add to History
    this.recentTimers.update(recents => {
        const existingIndex = recents.findIndex(r => r.duration === durationSeconds);
        let updated = [...recents];
        if (existingIndex > -1) {
            updated.splice(existingIndex, 1);
        }
        updated.unshift({
            id: crypto.randomUUID(),
            duration: durationSeconds,
            timestamp: Date.now()
        });
        return updated.slice(0, 20);
    });
  }

  togglePause(id: string) {
    this.activeTimers.update(timers => timers.map(t => {
        if (t.id === id) {
            return { ...t, status: t.status === 'running' ? 'paused' : 'running' };
        }
        return t;
    }));
  }

  deleteTimer(id: string) {
    this.activeTimers.update(timers => timers.filter(t => t.id !== id));
    this.checkAudioState();
  }
  
  deleteRecent(id: string) {
      this.recentTimers.update(timers => timers.filter(t => t.id !== id));
  }

  resetTimer(id: string) {
    this.activeTimers.update(timers => timers.map(t => {
        if (t.id === id) {
            return { ...t, remainingTime: t.originalDuration, status: 'paused' };
        }
        return t;
    }));
    this.checkAudioState();
  }

  stopAllFinished() {
      this.activeTimers.update(timers => timers.filter(t => t.status !== 'finished'));
      this.checkAudioState();
  }

  // --- Core Logic ---

  private tick() {
    let playedSound = false;
    
    this.activeTimers.update(timers => {
       return timers.map(t => {
           if (t.status === 'running') {
               if (t.remainingTime > 0) {
                   return { ...t, remainingTime: t.remainingTime - 1 };
               } else {
                   playedSound = true;
                   return { ...t, status: 'finished' };
               }
           }
           return t;
       });
    });

    if (playedSound || this.hasFinishedTimers()) {
        this.ensureSoundPlaying();
    }
  }

  // --- Sound Logic ---

  private ensureSoundPlaying() {
      if (!this.oscillator) {
          this.startAlarmSound();
      }
  }

  private checkAudioState() {
      if (!this.hasFinishedTimers()) {
          this.stopSound();
      }
  }

  private startAlarmSound() {
    this.stopSound(); 
    
    const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    this.audioCtx = new AudioContext();
    
    const playPulse = () => {
        if (!this.audioCtx) return;
        
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        
        osc.type = 'square'; 
        osc.frequency.setValueAtTime(880, now); 
        
        // Double Beep
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.setValueAtTime(0.1, now + 0.1);
        gain.gain.setValueAtTime(0, now + 0.1);
        
        gain.gain.setValueAtTime(0.1, now + 0.2);
        gain.gain.setValueAtTime(0.1, now + 0.3);
        gain.gain.setValueAtTime(0, now + 0.3);
        
        osc.start(now);
        osc.stop(now + 0.4);
    };

    playPulse();
    this.oscillator = setInterval(playPulse, 1000) as any;

    this.soundTimeout = setTimeout(() => {
        this.stopSound();
    }, 900000);
  }

  private stopSound() {
    if (this.oscillator) {
        clearInterval(this.oscillator as any);
        this.oscillator = null;
    }
    if (this.soundTimeout) {
        clearTimeout(this.soundTimeout);
        this.soundTimeout = null;
    }
    if (this.audioCtx) {
        this.audioCtx.close();
        this.audioCtx = null;
    }
  }
}