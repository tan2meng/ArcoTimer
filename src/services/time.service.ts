import { Injectable, signal, effect } from '@angular/core';

export type IntervalUnit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
export type TaskType = 'shake' | 'math' | 'stroop' | 'step';

export interface LoopTimerConfig {
  id: string;
  name: string;
  enabled: boolean;
  startTime: string; // ISO String
  intervalValue: number;
  intervalUnit: IntervalUnit;
  allowedDaysOfWeek: number[]; // 0 (Sun) - 6 (Sat)
  activeHoursEnabled: boolean;
  activeTimeStart: string; // "HH:mm"
  activeTimeEnd: string; // "HH:mm"
  nextFireTime?: number; 
  timesFired?: number;
}

export interface AlarmConfig {
  id: string;
  time: string; // "HH:mm"
  enabled: boolean;
  repeatDays: number[]; // 0-6. Empty = One time.
  label: string;
  snoozeEnabled: boolean;
  snoozeDuration: number; // minutes
  tasks: TaskType[]; // New property for task list
  
  // Internal State
  nextFireTime?: number;
  isSnoozing?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TimeService {
  now = signal(new Date());
  
  // Stores
  loopTimers = signal<LoopTimerConfig[]>([]);
  alarms = signal<AlarmConfig[]>([]);
  
  // Ringing State
  activeLoopAlarms = signal<string[]>([]); 
  activeStandardAlarms = signal<string[]>([]); 

  private audioCtx: AudioContext | null = null;
  private soundInterval: any = null;
  private soundTimeout: any = null;

  constructor() {
    this.loadData();
    
    // Main clock tick
    setInterval(() => {
      this.now.set(new Date());
      this.checkLoopTimers();
      this.checkStandardAlarms();
    }, 1000);

    // Save effects
    effect(() => localStorage.setItem('loopTimers', JSON.stringify(this.loopTimers())));
    effect(() => localStorage.setItem('alarms', JSON.stringify(this.alarms())));
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

  private loadData() {
    try {
      const loops = localStorage.getItem('loopTimers');
      if (loops) {
         const parsed = JSON.parse(loops);
         this.loopTimers.set(parsed.map((t: LoopTimerConfig) => {
             // Re-calc next fire if stale
             if (!t.nextFireTime || t.nextFireTime < Date.now()) {
                 t.nextFireTime = this.calculateNextLoopFire(new Date(t.startTime).getTime(), t.intervalValue, t.intervalUnit, Date.now());
             }
             if (t.timesFired === undefined) t.timesFired = 0;
             return t;
         }));
      }

      const alarms = localStorage.getItem('alarms');
      if (alarms) {
          const parsed = JSON.parse(alarms);
          this.alarms.set(parsed.map((a: AlarmConfig) => {
              // Recalculate next fire on load to be safe
              a.nextFireTime = this.calculateNextAlarmFire(a);
              a.isSnoozing = false; // Reset snooze on reload
              // Ensure tasks array exists for migration
              if (!a.tasks) a.tasks = [];
              return a;
          }));
      }
    } catch (e) { console.error('Load failed', e); }
  }

  // --- Loop Timer Logic ---

  addLoopTimer(timer: LoopTimerConfig) {
    if (!timer.nextFireTime) {
        timer.nextFireTime = this.calculateNextLoopFire(new Date(timer.startTime).getTime(), timer.intervalValue, timer.intervalUnit, Date.now());
    }
    timer.timesFired = 0;
    this.loopTimers.update(t => [...t, timer]);
  }

  updateLoopTimer(timer: LoopTimerConfig) {
    // When updating, if nextFireTime is missing (common from edit form), recalculate it
    if (!timer.nextFireTime) {
         timer.nextFireTime = this.calculateNextLoopFire(new Date(timer.startTime).getTime(), timer.intervalValue, timer.intervalUnit, Date.now());
    }
    this.loopTimers.update(t => t.map(x => x.id === timer.id ? { ...timer, timesFired: x.timesFired } : x));
  }

  deleteLoopTimer(id: string) {
    this.loopTimers.update(t => t.filter(x => x.id !== id));
  }

  toggleLoopTimer(id: string) {
    this.loopTimers.update(timers => timers.map(t => {
      if (t.id === id) {
        const enabled = !t.enabled;
        
        if (enabled) {
           const now = new Date();
           const startTime = now.toISOString();
           const nextFireTime = this.calculateNextLoopFire(now.getTime(), t.intervalValue, t.intervalUnit, now.getTime());
           
           return { 
             ...t, 
             enabled: true, 
             startTime, 
             nextFireTime, 
             timesFired: 0 
           };
        } else {
           return { 
             ...t, 
             enabled: false, 
             timesFired: 0, 
             nextFireTime: undefined 
           };
        }
      }
      return t;
    }));
  }

  // --- Standard Alarm Logic ---

  addAlarm(alarm: AlarmConfig) {
      alarm.nextFireTime = this.calculateNextAlarmFire(alarm);
      this.alarms.update(a => [...a, alarm]);
  }

  updateAlarm(alarm: AlarmConfig) {
      alarm.nextFireTime = this.calculateNextAlarmFire(alarm);
      this.alarms.update(a => a.map(x => x.id === alarm.id ? alarm : x));
  }

  deleteAlarm(id: string) {
      this.alarms.update(a => a.filter(x => x.id !== id));
      this.stopAlarm(id);
  }

  toggleAlarm(id: string) {
      this.alarms.update(alarms => alarms.map(a => {
          if (a.id === id) {
              const enabled = !a.enabled;
              const nextFireTime = enabled ? this.calculateNextAlarmFire(a) : undefined;
              return { ...a, enabled, nextFireTime, isSnoozing: false };
          }
          return a;
      }));
  }

  snoozeAlarm(id: string) {
      this.activeStandardAlarms.update(ids => ids.filter(i => i !== id));
      this.checkSoundState();

      this.alarms.update(alarms => alarms.map(a => {
          if (a.id === id) {
              const snoozeMs = (a.snoozeDuration || 9) * 60 * 1000;
              return { ...a, nextFireTime: Date.now() + snoozeMs, isSnoozing: true };
          }
          return a;
      }));
  }

  stopAlarm(id: string) {
    this.activeLoopAlarms.update(ids => ids.filter(i => i !== id));
    this.activeStandardAlarms.update(ids => ids.filter(i => i !== id));
    this.checkSoundState();
    
    this.alarms.update(alarms => alarms.map(a => {
        if (a.id === id) {
             const isSnoozing = false;
             let enabled = a.enabled;
             let nextFireTime = a.nextFireTime;

             if (a.repeatDays.length === 0) {
                 enabled = false;
                 nextFireTime = undefined;
             } else {
                 nextFireTime = this.calculateNextAlarmFire(a);
             }
             return { ...a, enabled, nextFireTime, isSnoozing };
        }
        return a;
    }));
  }

  // --- Calculation Helpers ---

  private calculateNextLoopFire(baseTime: number, val: number, unit: IntervalUnit, targetNow: number): number {
    let nextDate = new Date(baseTime);
    if (nextDate.getTime() > targetNow) return nextDate.getTime();

    while (nextDate.getTime() <= targetNow) {
        switch (unit) {
            case 'second': nextDate.setSeconds(nextDate.getSeconds() + val); break;
            case 'minute': nextDate.setMinutes(nextDate.getMinutes() + val); break;
            case 'hour': nextDate.setHours(nextDate.getHours() + val); break;
            case 'day': nextDate.setDate(nextDate.getDate() + val); break;
            case 'week': nextDate.setDate(nextDate.getDate() + (val * 7)); break;
            case 'month': nextDate.setMonth(nextDate.getMonth() + val); break;
            case 'year': nextDate.setFullYear(nextDate.getFullYear() + val); break;
        }
    }
    return nextDate.getTime();
  }

  private calculateNextAlarmFire(alarm: AlarmConfig): number {
      const now = new Date();
      const [h, m] = alarm.time.split(':').map(Number);
      
      const candidate = new Date();
      candidate.setHours(h, m, 0, 0);

      if (candidate.getTime() <= now.getTime()) {
          candidate.setDate(candidate.getDate() + 1);
      }

      if (alarm.repeatDays.length === 0) {
          return candidate.getTime();
      }

      while (!alarm.repeatDays.includes(candidate.getDay())) {
          candidate.setDate(candidate.getDate() + 1);
      }
      
      return candidate.getTime();
  }

  // --- Check Loops ---

  private checkLoopTimers() {
    const nowTime = this.now().getTime();
    const currentTimers = this.loopTimers();
    let hasUpdates = false;

    const updatedTimers = currentTimers.map(timer => {
      if (!timer.enabled || !timer.nextFireTime) return timer;

      if (nowTime >= timer.nextFireTime) {
        const constraintsMet = this.checkConstraints(this.now(), timer);
        let newTimesFired = timer.timesFired || 0;

        if (constraintsMet) {
          this.triggerLoopAlarm(timer.id);
          newTimesFired++;
        }

        const nextTime = this.calculateNextLoopFire(timer.nextFireTime, timer.intervalValue, timer.intervalUnit, nowTime);
        hasUpdates = true;
        return { ...timer, nextFireTime: nextTime, timesFired: newTimesFired };
      }
      return timer;
    });

    if (hasUpdates) this.loopTimers.set(updatedTimers);
  }

  public checkConstraints(now: Date, timer: LoopTimerConfig): boolean {
    if (timer.allowedDaysOfWeek && timer.allowedDaysOfWeek.length > 0) {
      if (!timer.allowedDaysOfWeek.includes(now.getDay())) return false;
    }
    if (timer.activeHoursEnabled && timer.activeTimeStart && timer.activeTimeEnd) {
      const curM = now.getHours() * 60 + now.getMinutes();
      const [sH, sM] = timer.activeTimeStart.split(':').map(Number);
      const startM = sH * 60 + sM;
      const [eH, eM] = timer.activeTimeEnd.split(':').map(Number);
      const endM = eH * 60 + eM;
      
      if (endM < startM) { 
         if (curM < startM && curM > endM) return false;
      } else {
         if (curM < startM || curM > endM) return false;
      }
    }
    return true;
  }

  // --- Check Standard Alarms ---

  private checkStandardAlarms() {
      const nowTime = this.now().getTime();
      const alarms = this.alarms();
      
      alarms.forEach(a => {
          if (a.enabled && a.nextFireTime && nowTime >= a.nextFireTime) {
              if (!this.activeStandardAlarms().includes(a.id)) {
                  this.triggerStandardAlarm(a.id);
              }
          }
      });
  }

  // --- Audio / Trigger ---

  private triggerLoopAlarm(id: string) {
      this.activeLoopAlarms.update(ids => [...new Set([...ids, id])]);
      this.startAudioLoop('loop');
  }

  private triggerStandardAlarm(id: string) {
      this.activeStandardAlarms.update(ids => [...ids, id]);
      this.startAudioLoop('alarm');
  }

  private checkSoundState() {
      if (this.activeLoopAlarms().length === 0 && this.activeStandardAlarms().length === 0) {
          this.stopSoundLoop();
      }
  }

  private startAudioLoop(type: 'loop' | 'alarm') {
      if (!this.soundInterval) {
          const fn = () => {
              if (this.activeStandardAlarms().length > 0) {
                  this.playStandardTone();
              } else {
                  this.playLoopTone();
              }
          };
          fn();
          this.soundInterval = setInterval(fn, 2500);
          
          this.soundTimeout = setTimeout(() => {
              this.activeLoopAlarms.set([]);
              this.activeStandardAlarms.set([]);
              this.stopSoundLoop();
          }, 15 * 60 * 1000); 
      }
  }

  private stopSoundLoop() {
      if (this.soundInterval) {
          clearInterval(this.soundInterval);
          this.soundInterval = null;
      }
      if (this.soundTimeout) {
          clearTimeout(this.soundTimeout);
          this.soundTimeout = null;
      }
  }

  // --- Tones ---

  private playLoopTone() {
    this.initAudio();
    if (!this.audioCtx) return;
    try {
        const now = this.audioCtx.currentTime;
        const osc1 = this.audioCtx.createOscillator();
        const gain1 = this.audioCtx.createGain();
        osc1.connect(gain1);
        gain1.connect(this.audioCtx.destination);
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, now);
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.4, now + 0.05);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc1.start(now);
        osc1.stop(now + 0.5);

        const osc2 = this.audioCtx.createOscillator();
        const gain2 = this.audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(this.audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(523.25, now + 0.5);
        gain2.gain.setValueAtTime(0, now + 0.5);
        gain2.gain.linearRampToValueAtTime(0.4, now + 0.55);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        osc2.start(now + 0.5);
        osc2.stop(now + 1.5);
    } catch(e) {}
  }

  private playStandardTone() {
    this.initAudio();
    if (!this.audioCtx) return;
    try {
        const now = this.audioCtx.currentTime;
        const createPulse = (t: number, freq: number) => {
             const osc = this.audioCtx!.createOscillator();
             const gain = this.audioCtx!.createGain();
             osc.connect(gain);
             gain.connect(this.audioCtx!.destination);
             osc.type = 'triangle';
             osc.frequency.value = freq;
             gain.gain.setValueAtTime(0, t);
             gain.gain.linearRampToValueAtTime(0.5, t + 0.05);
             gain.gain.setValueAtTime(0, t + 0.15);
             osc.start(t);
             osc.stop(t + 0.2);
        };

        createPulse(now, 880);
        createPulse(now + 0.2, 880);
        createPulse(now + 0.4, 880);
        
        createPulse(now + 1.0, 700);
        createPulse(now + 1.2, 700);
    } catch(e) {}
  }
}
