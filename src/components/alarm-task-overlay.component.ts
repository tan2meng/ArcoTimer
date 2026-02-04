import { Component, inject, input, output, signal, effect, computed, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimeService, AlarmConfig, TaskType } from '../services/time.service';
import { LocalizationService } from '../services/localization.service';

@Component({
  selector: 'app-alarm-task-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[10000] bg-white dark:bg-[#1C1C1C] flex flex-col font-sans">
      
      <!-- Top Bar Info -->
      <div class="p-6 text-center border-b border-gray-100 dark:border-gray-800">
         <h1 class="text-3xl font-bold text-td-text-primary dark:text-white mb-2">{{ currentTime }}</h1>
         <div class="text-sm text-td-text-secondary dark:text-gray-400">
             {{ alarm()?.label }} • {{ tasksQueue().length - currentTaskIndex() }} {{ ls.t().tasksRemaining }}
         </div>
      </div>

      <!-- Main Task Area -->
      <div class="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
         
         @switch (currentTask()) {
             <!-- SHAKE TASK -->
             @case ('shake') {
                 <div class="flex flex-col items-center">
                    <div class="w-48 h-48 rounded-full border-8 border-gray-100 dark:border-gray-800 flex items-center justify-center relative mb-8">
                       <!-- Progress Circle -->
                       <svg class="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                           <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" class="text-td-brand transition-all duration-200"
                                   stroke-width="8" stroke-linecap="round"
                                   [attr.stroke-dasharray]="289"
                                   [attr.stroke-dashoffset]="289 * (1 - shakeProgress())" />
                       </svg>
                       <svg class="w-20 h-20 text-td-brand animate-wiggle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                       </svg>
                    </div>
                    <h2 class="text-2xl font-bold text-center mb-2 dark:text-white">{{ ls.t().taskShakeInstr }}</h2>
                    <p class="text-gray-500">{{ Math.ceil(20 * (1 - shakeProgress())) }}s</p>
                    
                    <!-- Fallback for Web -->
                    <button (click)="simulateShake()" class="mt-8 text-xs text-gray-300 dark:text-gray-700 underline">Simulate Shake (Dev)</button>
                 </div>
             }

             <!-- MATH TASK -->
             @case ('math') {
                 <div class="w-full max-w-xs flex flex-col items-center">
                    <div class="text-sm uppercase tracking-widest text-gray-400 mb-4">{{ ls.t().taskMathInstr }} ({{ mathCorrectCount() }}/5)</div>
                    <div class="text-5xl font-mono font-bold mb-8 dark:text-white">{{ mathProblem() }}</div>
                    
                    <div class="w-full bg-gray-100 dark:bg-white/5 rounded-ant p-4 mb-4 text-center text-3xl font-mono min-h-[4rem] flex items-center justify-center dark:text-white">
                        {{ mathInput() }}<span class="animate-pulse">|</span>
                    </div>

                    <div class="grid grid-cols-3 gap-3 w-full">
                       @for (n of [1,2,3,4,5,6,7,8,9]; track n) {
                          <button (click)="typeMath(n)" class="h-16 rounded-ant bg-white dark:bg-white/10 shadow-sm border border-gray-200 dark:border-gray-700 text-2xl font-bold active:scale-95 dark:text-white">{{ n }}</button>
                       }
                       <button (click)="backspaceMath()" class="h-16 rounded-ant bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 flex items-center justify-center active:scale-95">DEL</button>
                       <button (click)="typeMath(0)" class="h-16 rounded-ant bg-white dark:bg-white/10 shadow-sm border border-gray-200 dark:border-gray-700 text-2xl font-bold active:scale-95 dark:text-white">0</button>
                       <button (click)="submitMath()" class="h-16 rounded-ant bg-td-brand text-white text-xl font-bold active:scale-95">OK</button>
                    </div>
                 </div>
             }

             <!-- STROOP TASK -->
             @case ('stroop') {
                 <div class="flex flex-col items-center w-full">
                     <div class="text-sm uppercase tracking-widest text-gray-400 mb-8">{{ ls.t().taskStroopInstr }} ({{ stroopCount() }}/7)</div>
                     
                     <div class="text-6xl font-black mb-16 tracking-wider" [style.color]="stroopColor">
                         {{ stroopWord }}
                     </div>

                     <div class="grid grid-cols-2 gap-4 w-full max-w-sm px-4">
                         <button (click)="checkStroop('red')" class="h-20 bg-red-500 rounded-ant text-white font-bold text-lg shadow-lg active:scale-95">Red</button>
                         <button (click)="checkStroop('blue')" class="h-20 bg-blue-500 rounded-ant text-white font-bold text-lg shadow-lg active:scale-95">Blue</button>
                         <button (click)="checkStroop('green')" class="h-20 bg-green-500 rounded-ant text-white font-bold text-lg shadow-lg active:scale-95">Green</button>
                         <button (click)="checkStroop('yellow')" class="h-20 bg-yellow-400 rounded-ant text-white font-bold text-lg shadow-lg active:scale-95">Yellow</button>
                     </div>
                 </div>
             }

             <!-- STEP TASK -->
             @case ('step') {
                 <div class="flex flex-col items-center">
                    <div class="w-48 h-48 rounded-full border-8 border-gray-100 dark:border-gray-800 flex items-center justify-center relative mb-8">
                         <svg class="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                           <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" class="text-green-500 transition-all duration-300"
                                   stroke-width="8" stroke-linecap="round"
                                   [attr.stroke-dasharray]="289"
                                   [attr.stroke-dashoffset]="289 * (1 - (stepsCount() / 40))" />
                       </svg>
                       <div class="text-4xl font-bold dark:text-white">{{ stepsCount() }}/40</div>
                    </div>
                    <h2 class="text-2xl font-bold text-center mb-2 dark:text-white">{{ ls.t().taskStepInstr }}</h2>
                    <p class="text-gray-500">Walk around!</p>
                    
                    <button (click)="simulateStep()" class="mt-8 text-xs text-gray-300 dark:text-gray-700 underline">Simulate Step (Dev)</button>
                 </div>
             }
         }
      </div>

      <!-- Emergency Snooze (Optional, or removed for strictness. Keeping simple footer) -->
      <div class="p-6 pb-safe bg-gray-50 dark:bg-[#141414] border-t border-gray-100 dark:border-gray-800 text-center">
         <p class="text-xs text-gray-400 dark:text-gray-600">Complete tasks to stop alarm</p>
      </div>

    </div>
  `,
  styles: [`
    @keyframes wiggle {
       0%, 100% { transform: rotate(-3deg); }
       50% { transform: rotate(3deg); }
    }
    .animate-wiggle { animation: wiggle 0.3s ease-in-out infinite; }
  `]
})
export class AlarmTaskOverlayComponent implements OnInit, OnDestroy {
  alarm = input<AlarmConfig>();
  completed = output<void>();
  
  ls = inject(LocalizationService);
  Math = Math;

  tasksQueue = signal<TaskType[]>([]);
  currentTaskIndex = signal(0);
  currentTask = computed(() => this.tasksQueue()[this.currentTaskIndex()]);
  
  // Clock
  currentTime = '';
  private clockInterval: any;

  // -- Task States --
  
  // Shake
  shakeProgress = signal(0); // 0 to 1
  private shakeTime = 0; // seconds accumulated
  private lastX = 0; private lastY = 0; private lastZ = 0;
  private shakeInterval: any;

  // Math
  mathCorrectCount = signal(0);
  mathProblem = signal('');
  mathAnswer = 0;
  mathInput = signal('');

  // Stroop
  stroopCount = signal(0);
  stroopWord = '';
  stroopColor = '';
  colors = ['red', 'green', 'blue', 'yellow'];
  colorMap: any = { 'red': '#ef4444', 'green': '#22c55e', 'blue': '#3b82f6', 'yellow': '#eab308' };

  // Step
  stepsCount = signal(0);
  private lastAccMag = 0;

  ngOnInit() {
      if (this.alarm()) {
          // If no tasks, default to none? No, component shouldn't open. 
          // But as fail safe, if tasks array is empty, emit complete immediately.
          const t = this.alarm()!.tasks;
          if (!t || t.length === 0) {
              this.completed.emit();
          } else {
              this.tasksQueue.set([...t]);
              this.initTask(this.tasksQueue()[0]);
          }
      }

      this.updateClock();
      this.clockInterval = setInterval(() => this.updateClock(), 1000);
      
      // Request Motion (Might need button on mobile first, but we try)
      this.initSensors();
  }

  ngOnDestroy() {
     clearInterval(this.clockInterval);
     clearInterval(this.shakeInterval);
     window.removeEventListener('devicemotion', this.handleMotion);
  }

  updateClock() {
      const now = new Date();
      this.currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  initTask(type: TaskType) {
      if (type === 'shake') {
          this.shakeTime = 0;
          this.shakeProgress.set(0);
          this.startShakeDetection();
      } else if (type === 'math') {
          this.mathCorrectCount.set(0);
          this.genMathProblem();
      } else if (type === 'stroop') {
          this.stroopCount.set(0);
          this.genStroop();
      } else if (type === 'step') {
          this.stepsCount.set(0);
          // Step shares motion listener
      }
  }

  nextTask() {
      const idx = this.currentTaskIndex();
      if (idx < this.tasksQueue().length - 1) {
          this.currentTaskIndex.set(idx + 1);
          this.initTask(this.tasksQueue()[idx + 1]);
      } else {
          // All done
          this.completed.emit();
      }
  }

  // --- SENSORS ---
  
  initSensors() {
      if ((window as any).DeviceMotionEvent) {
          window.addEventListener('devicemotion', this.handleMotion.bind(this), true);
      }
  }

  handleMotion(event: DeviceMotionEvent) {
      if (!event.accelerationIncludingGravity) return;
      const { x, y, z } = event.accelerationIncludingGravity;
      if (x === null || y === null || z === null) return;

      const type = this.currentTask();

      // Shake Logic
      if (type === 'shake') {
          const deltaX = Math.abs(x - this.lastX);
          const deltaY = Math.abs(y - this.lastY);
          const deltaZ = Math.abs(z - this.lastZ);

          if (deltaX + deltaY + deltaZ > 15) { // Sensitivity
              // We count this update
              // Actual counting happens in interval to normalize time
              this.isShakingNow = true;
          } else {
              this.isShakingNow = false;
          }

          this.lastX = x; this.lastY = y; this.lastZ = z;
      }

      // Step Logic (Crude Pedometer)
      if (type === 'step') {
          const mag = Math.sqrt(x*x + y*y + z*z);
          const delta = mag - this.lastAccMag;
          if (delta > 2 && mag > 11) { // Peak detection
             // Debounce needed
             const now = Date.now();
             if (now - this.lastStepTime > 400) {
                 this.stepsCount.update(v => {
                     const n = v + 1;
                     if (n >= 40) this.nextTask();
                     return n;
                 });
                 this.lastStepTime = now;
             }
          }
          this.lastAccMag = mag;
      }
  }

  // --- SHAKE ---
  isShakingNow = false;
  startShakeDetection() {
      this.shakeInterval = setInterval(() => {
          if (this.currentTask() !== 'shake') return;
          if (this.isShakingNow) {
              this.shakeTime += 0.1; // 100ms interval
              this.shakeProgress.set(Math.min(1, this.shakeTime / 20));
              if (this.shakeTime >= 20) {
                  clearInterval(this.shakeInterval);
                  this.nextTask();
              }
              this.isShakingNow = false; // Reset flag
          }
      }, 100);
  }
  
  simulateShake() {
      this.isShakingNow = true;
  }

  // --- MATH ---
  genMathProblem() {
      const a = Math.floor(Math.random() * 90) + 10;
      const b = Math.floor(Math.random() * 90) + 10;
      const isAdd = Math.random() > 0.5;
      
      if (isAdd) {
          this.mathProblem.set(`${a} + ${b} = ?`);
          this.mathAnswer = a + b;
      } else {
          // Ensure positive result for simplicity
          const max = Math.max(a, b);
          const min = Math.min(a, b);
          this.mathProblem.set(`${max} - ${min} = ?`);
          this.mathAnswer = max - min;
      }
      this.mathInput.set('');
  }

  typeMath(num: number) {
      if (this.mathInput().length < 4) {
          this.mathInput.update(s => s + num);
      }
  }

  backspaceMath() {
      this.mathInput.update(s => s.slice(0, -1));
  }

  submitMath() {
      const val = parseInt(this.mathInput(), 10);
      if (val === this.mathAnswer) {
          const n = this.mathCorrectCount() + 1;
          this.mathCorrectCount.set(n);
          if (n >= 5) {
              this.nextTask();
          } else {
              this.genMathProblem();
          }
      } else {
          // Visual feedback? Shake input
          this.mathInput.set(''); 
          // Optional: penalty?
      }
  }

  // --- STROOP ---
  genStroop() {
     // Text says one color
     const wordIdx = Math.floor(Math.random() * 4);
     // Color is different
     let colorIdx = Math.floor(Math.random() * 4);
     while(colorIdx === wordIdx) {
         colorIdx = Math.floor(Math.random() * 4);
     }
     
     this.stroopWord = this.colors[wordIdx].toUpperCase();
     this.stroopColor = this.colorMap[this.colors[colorIdx]];
     this.targetStroopColor = this.colors[colorIdx];
  }
  
  targetStroopColor = '';
  
  checkStroop(color: string) {
      if (color === this.targetStroopColor) {
          const n = this.stroopCount() + 1;
          this.stroopCount.set(n);
          if (n >= 7) {
              this.nextTask();
          } else {
              this.genStroop();
          }
      } else {
          // Wrong answer logic - maybe reset count or just flash red
          // For now, simple retry
          this.genStroop();
      }
  }

  // --- STEPS ---
  lastStepTime = 0;
  simulateStep() {
      this.stepsCount.update(v => {
         const n = v + 1;
         if (n >= 40) this.nextTask();
         return n;
      });
  }
}