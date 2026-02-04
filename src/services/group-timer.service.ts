import { Injectable, signal, effect, computed } from '@angular/core';

export type Phase = 'prep' | 'work' | 'post';

export interface SingleInterval {
  id: string;
  name: string;
  prepDuration: number; // seconds
  workDuration: number; // seconds
  postDuration: number; // seconds
}

export interface GroupTimerConfig {
  id: string;
  name: string;
  intervals: SingleInterval[];
}

export interface RunningState {
  groupId: string;
  intervalIndex: number; // Which interval in the list
  phase: Phase;
  remainingTime: number; // seconds in current phase
  totalPhaseDuration: number; // Total duration of the current phase for progress calc
  isRunning: boolean;
  totalSets: number;
}

@Injectable({
  providedIn: 'root'
})
export class GroupTimerService {
  groups = signal<GroupTimerConfig[]>([]);
  activeState = signal<RunningState | null>(null);

  private intervalId: any;
  private audioCtx: AudioContext | null = null;

  constructor() {
    const saved = localStorage.getItem('groupTimers');
    if (saved) {
      try {
        this.groups.set(JSON.parse(saved));
      } catch (e) { console.error(e); }
    }

    effect(() => {
      localStorage.setItem('groupTimers', JSON.stringify(this.groups()));
    });
  }

  // --- CRUD ---

  addGroup(group: GroupTimerConfig) {
    this.groups.update(g => [...g, group]);
  }

  updateGroup(group: GroupTimerConfig) {
    this.groups.update(g => g.map(x => x.id === group.id ? group : x));
  }

  deleteGroup(id: string) {
    this.groups.update(g => g.filter(x => x.id !== id));
    if (this.activeState()?.groupId === id) {
      this.reset();
    }
  }

  // --- Control ---

  startGroup(groupId: string) {
    const group = this.groups().find(g => g.id === groupId);
    if (!group || group.intervals.length === 0) return;

    // Initialize state
    const firstInterval = group.intervals[0];
    let startPhase: Phase = 'prep';
    let duration = firstInterval.prepDuration;

    // Handle edge case where prep is 0
    if (duration === 0) {
        startPhase = 'work';
        duration = firstInterval.workDuration;
        if (duration === 0) {
            startPhase = 'post';
            duration = firstInterval.postDuration;
        }
    }

    this.activeState.set({
      groupId,
      intervalIndex: 0,
      phase: startPhase,
      remainingTime: duration,
      totalPhaseDuration: duration,
      isRunning: true,
      totalSets: group.intervals.length
    });

    this.startTicker();
  }

  togglePause() {
    const s = this.activeState();
    if (!s) return;
    
    if (s.isRunning) {
      clearInterval(this.intervalId);
      this.activeState.set({ ...s, isRunning: false });
    } else {
      this.activeState.set({ ...s, isRunning: true });
      this.startTicker();
    }
  }

  reset() {
    clearInterval(this.intervalId);
    this.activeState.set(null);
  }

  skipPhase() {
    const s = this.activeState();
    if (!s) return;
    this.nextPhase(s, true); // force skip without sound
  }

  // --- Logic ---

  private startTicker() {
    clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      const s = this.activeState();
      if (!s || !s.isRunning) return;

      // Play per-second tick
      if (s.remainingTime > 0) {
          this.playTick(s.phase, s.remainingTime);
      }

      if (s.remainingTime > 1) {
        this.activeState.set({ ...s, remainingTime: s.remainingTime - 1 });
      } else {
        // Timer hits 0 (Transition)
        this.activeState.set({ ...s, remainingTime: 0 });
        this.handlePhaseEnd(s);
      }
    }, 1000);
  }

  private handlePhaseEnd(s: RunningState) {
    // Determine sound type before switching
    const isIntervalEnd = s.phase === 'post';
    this.playPhaseEndSound(isIntervalEnd);

    // Immediate transition
    this.nextPhase(s, false);
  }

  private nextPhase(s: RunningState, silent: boolean) {
    const group = this.groups().find(g => g.id === s.groupId);
    if (!group) return this.reset();

    const currentInterval = group.intervals[s.intervalIndex];
    let nextPhase: Phase = s.phase;
    let nextIndex = s.intervalIndex;
    let nextDuration = 0;

    // Transition Logic
    if (s.phase === 'prep') {
        nextPhase = 'work';
        nextDuration = currentInterval.workDuration;
    } else if (s.phase === 'work') {
        nextPhase = 'post';
        nextDuration = currentInterval.postDuration;
    } else {
        // Post finished, go to next interval
        nextIndex++;
        if (nextIndex >= group.intervals.length) {
            // Finished whole group
            this.reset();
            return;
        }
        const nextInt = group.intervals[nextIndex];
        nextPhase = 'prep';
        nextDuration = nextInt.prepDuration;
    }

    // Handle 0-duration skips recursively
    if (nextDuration === 0) {
        const tempState = { ...s, phase: nextPhase, intervalIndex: nextIndex };
        if (nextIndex >= group.intervals.length) {
            this.reset();
            return;
        }
        this.nextPhase(tempState, true); 
        return;
    }

    this.activeState.set({
        ...s,
        intervalIndex: nextIndex,
        phase: nextPhase,
        remainingTime: nextDuration,
        totalPhaseDuration: nextDuration,
        isRunning: true
    });
  }

  // --- Audio ---

  private ensureAudioContext() {
    const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    if (!this.audioCtx) this.audioCtx = new AudioContext();
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
  }

  private playTick(phase: Phase, timeLeft: number) {
    this.ensureAudioContext();
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;

    // Distinct tones for phases
    if (phase === 'prep') {
        if (timeLeft <= 3) {
            this.beep(now, 1046.50, 0.1); // C6
        } else {
            this.beep(now, 880, 0.05); // A5
        }
    } else if (phase === 'work') {
        if (timeLeft <= 3) {
            this.beep(now, 880, 0.1); // A5
        } else {
            this.beep(now, 440, 0.05); // A4
        }
    } else if (phase === 'post') {
        if (timeLeft <= 3) {
             this.beep(now, 659.25, 0.1); // E5
        } else {
             this.beep(now, 329.63, 0.05); // E4
        }
    }
  }

  private playPhaseEndSound(isIntervalEnd: boolean) {
    this.ensureAudioContext();
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    
    // "Go" or "Next" Signal
    this.beep(now, 1200, 0.1); 
    
    if (isIntervalEnd) {
        this.beep(now + 0.15, 800, 0.4); 
    } else {
        this.beep(now + 0.15, 1200, 0.2);
    }
  }

  private beep(startTime: number, freq: number, duration: number) {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}