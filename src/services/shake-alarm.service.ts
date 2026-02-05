import { Injectable, signal, effect, computed } from '@angular/core';

export interface ShakeAlarmConfig {
  id: string;
  name: string;
  totalDuration: number; // Seconds
  shakePoints: number[]; // Seconds from start
}

export interface ShakeRuntime {
  instanceId: string; // Unique ID for this specific run instance
  runIndex: number;   // 1-based index to distinguish concurrent runs
  config: ShakeAlarmConfig;
  startTime: number;
  elapsedTime: number; // Seconds
  remainingTime: number;
  nextPointIndex: number;
  isRinging: boolean;
  isRunning: boolean;
}

@Injectable({ providedIn: 'root' })
export class ShakeAlarmService {
  alarms = signal<ShakeAlarmConfig[]>([]);
  activeStates = signal<ShakeRuntime[]>([]); 
  
  // Helper to find if any alarm is currently ringing for the overlay
  ringingAlarm = computed(() => this.activeStates().find(s => s.isRinging));

  private intervalId: any;
  private audioCtx: AudioContext | null = null;
  private soundInterval: any;

  constructor() {
    const saved = localStorage.getItem('shakeAlarms');
    if (saved) {
      try { this.alarms.set(JSON.parse(saved)); } catch(e) {}
    }
    effect(() => localStorage.setItem('shakeAlarms', JSON.stringify(this.alarms())));
  }

  addAlarm(alarm: ShakeAlarmConfig) {
    this.alarms.update(v => [...v, alarm]);
  }
  
  updateAlarm(alarm: ShakeAlarmConfig) {
     this.alarms.update(v => v.map(a => a.id === alarm.id ? alarm : a));
  }

  deleteAlarm(configId: string) {
    this.alarms.update(v => v.filter(a => a.id !== configId));
    // Stop all instances of this alarm config
    this.activeStates.update(states => states.filter(s => s.config.id !== configId));
    this.checkStopTicker();
  }

  start(configId: string) {
    const alarm = this.alarms().find(a => a.id === configId);
    if (!alarm) return;

    // Calculate run index for this config
    const existingInstances = this.activeStates().filter(s => s.config.id === configId);
    const runIndex = existingInstances.length + 1;

    // Sort points ensure sequential triggering
    const sortedPoints = [...alarm.shakePoints].sort((a,b) => a - b);
    
    const newRuntime: ShakeRuntime = {
      instanceId: crypto.randomUUID(),
      runIndex: runIndex,
      config: { ...alarm, shakePoints: sortedPoints },
      startTime: Date.now(),
      elapsedTime: 0,
      remainingTime: alarm.totalDuration,
      nextPointIndex: 0,
      isRinging: false,
      isRunning: true
    };

    this.activeStates.update(states => [...states, newRuntime]);
    this.ensureTicker();
  }

  stop(instanceId: string) {
    this.activeStates.update(states => states.filter(s => s.instanceId !== instanceId));
    this.checkStopTicker();
  }
  
  confirmShake(instanceId: string) {
    // Check if the alarm to confirm is actually finished (remainingTime 0)
    // If so, we remove it. If not, we just stop ringing.
    const state = this.activeStates().find(s => s.instanceId === instanceId);
    if (!state) return;

    if (state.remainingTime <= 0) {
        // It was the finish alarm
        this.stop(instanceId);
    } else {
        // It was an intermediate shake point
        this.activeStates.update(states => states.map(s => {
            if (s.instanceId === instanceId) {
                return { ...s, isRinging: false };
            }
            return s;
        }));
    }
    
    // Stop sound if no alarms are ringing anymore
    if (!this.activeStates().some(s => s.isRinging)) {
       this.stopSound();
    }
  }
  
  initAudio() {
    if (!this.audioCtx) {
       const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
       if (AudioContext) {
           this.audioCtx = new AudioContext();
       }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
    }
  }

  private ensureTicker() {
      if (!this.intervalId) {
          this.intervalId = setInterval(() => this.tick(), 1000);
      }
  }
  
  private checkStopTicker() {
      if (this.activeStates().length === 0) {
          if (this.intervalId) {
              clearInterval(this.intervalId);
              this.intervalId = null;
          }
          this.stopSound();
      }
  }

  private tick() {
       const states = this.activeStates();
       if (states.length === 0) {
           this.checkStopTicker();
           return;
       }
       
       let hasRinging = false;
       const finishedInstanceIds: string[] = [];

       const updatedStates = states.map(s => {
           // If already ringing (e.g. paused at finish or shake point), it counts towards ringing status
           if (s.isRinging) {
               hasRinging = true;
               // If it's paused or finished, we just return it as is
               if (!s.isRunning) return s;
           }
           
           if (!s.isRunning) return s;

           const elapsed = s.elapsedTime + 1;
           const remaining = s.config.totalDuration - elapsed;
           
           let nextIdx = s.nextPointIndex;
           let ringing = s.isRinging;
           
           // Check if we passed any shake points
           while (nextIdx < s.config.shakePoints.length && elapsed >= s.config.shakePoints[nextIdx]) {
              ringing = true;
              nextIdx++;
           }

           // Check for Finish
           // Explicitly type running as boolean to prevent TS inference error (Type 'false' is not assignable to type 'true')
           let running: boolean = s.isRunning;
           if (remaining <= 0) {
               ringing = true;
               running = false; // Stop running
           }
           
           if (ringing) hasRinging = true;

           // We only automatically remove if something goes wrong or we implement auto-dismiss?
           // No, we want to ring at 0. So we keep it. 
           // We handled the "Finish Ring" by setting ringing=true and running=false when remaining <= 0.
           
           return {
              ...s,
              elapsedTime: elapsed,
              remainingTime: remaining <= 0 ? 0 : remaining,
              nextPointIndex: nextIdx,
              isRinging: ringing,
              isRunning: running
           };
       });
       
       this.activeStates.set(updatedStates);
       
       if (hasRinging) {
           this.startSound();
       } else {
           // We might want to stop sound if no one is ringing, 
           // but confirmShake handles explicit stop. 
           // However, if we went from ringing to not ringing (rare in shake logic), we should stop.
           // Let's rely on confirmShake.
       }
  }

  private startSound() {
      this.initAudio();
      
      if (this.soundInterval) return;
      
      const playTone = () => {
         if (!this.audioCtx) return;
         const now = this.audioCtx.currentTime;
         
         const osc = this.audioCtx.createOscillator();
         const gain = this.audioCtx.createGain();
         osc.connect(gain);
         gain.connect(this.audioCtx.destination);
         
         // Warning tone
         osc.type = 'sawtooth';
         osc.frequency.setValueAtTime(400, now);
         osc.frequency.linearRampToValueAtTime(600, now + 0.3);
         
         gain.gain.setValueAtTime(0.3, now);
         gain.gain.linearRampToValueAtTime(0, now + 0.5);
         
         osc.start(now);
         osc.stop(now + 0.5);
      };

      playTone();
      this.soundInterval = setInterval(playTone, 1000);
  }

  private stopSound() {
      if (this.soundInterval) {
          clearInterval(this.soundInterval);
          this.soundInterval = null;
      }
  }
}
