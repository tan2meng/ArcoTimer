import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { CountdownService, TimerInstance, RecentTimer } from '../services/countdown.service';
import { LocalizationService } from '../services/localization.service';

@Component({
  selector: 'app-timer',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="h-full flex flex-col bg-[#f5f5f5] dark:bg-td-dark-bg text-td-text-primary dark:text-td-dark-text relative overflow-hidden font-sans">
      <!-- Header -->
      <div class="flex-none flex justify-between items-center px-5 py-4 bg-white dark:bg-[#1C1C1C] shadow-sm z-10 border-b border-gray-100 dark:border-gray-800">
        <h1 class="text-xl font-bold">{{ ls.t().timer }}</h1>
        <button (click)="ls.toggleLang()" class="ant-btn ant-btn-icon rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
           <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
           </svg>
        </button>
      </div>

      <!-- Content Area -->
      <div class="flex-1 flex flex-col w-full z-10 overflow-hidden relative">
        <div class="flex-1 flex flex-col h-full relative">
          <!-- List -->
          <div class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-24">
             @if (service.activeTimers().length === 0) {
                <div class="flex flex-col items-center justify-center h-64 text-td-text-secondary dark:text-gray-400">
                  <svg class="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>{{ ls.t().noTimers }}</p>
                </div>
             }

             @for (timer of service.activeTimers(); track timer.id) {
               <div class="bg-white dark:bg-[#1C1C1C] p-5 rounded-ant shadow-ant flex items-center justify-between border-l-[6px] transition-all relative overflow-hidden select-none"
                    [class.border-td-brand]="timer.status === 'running'"
                    [class.border-gray-300]="timer.status !== 'running'">
                    
                     <!-- Bottom Progress Bar -->
                     <div class="absolute bottom-0 left-0 h-1.5 transition-all duration-1000 ease-linear z-10"
                          [style.background-color]="'rgb(22, 119, 255)'"
                          [style.width.%]="(timer.remainingTime / timer.totalTime) * 100"></div>

                     <!-- Content (Left) -->
                     <div class="flex-1 z-10">
                         <div class="flex items-end gap-2 mb-1">
                             <span class="text-4xl font-light tracking-tight font-mono" 
                                   [class.text-td-text-primary]="timer.status === 'running'"
                                   [class.dark:text-white]="timer.status === 'running'"
                                   [class.text-gray-400]="timer.status !== 'running'">
                                 {{ formatTime(timer.remainingTime) }}
                             </span>
                         </div>
                         <div class="text-sm text-td-text-secondary dark:text-gray-400 flex items-center gap-2">
                             @if (timer.status === 'finished') {
                                <span class="text-td-error font-bold animate-pulse">{{ timer.label }} - Finished</span>
                             } @else {
                                <span>{{ timer.label }}</span>
                                <span class="text-gray-300">•</span>
                                <span class="flex items-center text-xs">
                                   <svg class="w-3 h-3 mr-1 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                                   {{ getFinishTime(timer) }}
                                </span>
                             }
                         </div>
                     </div>

                     <!-- Actions (Right) -->
                     <div class="flex items-center space-x-4 z-10">
                         <button (click)="resetRunning(timer.id); $event.stopPropagation()" 
                                 class="w-8 h-8 flex items-center justify-center rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-all shadow-sm">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                         </button>
                         <button (click)="toggleTimer(timer.id); $event.stopPropagation()"
                            class="relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none"
                            [class.bg-td-brand]="timer.status === 'running'"
                            [class.bg-gray-300]="timer.status !== 'running'">
                            <span class="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out"
                                  [class.translate-x-5]="timer.status === 'running'"
                                  [class.translate-x-0]="timer.status !== 'running'">
                            </span>
                        </button>
                         <button (click)="confirmDelete(timer.id); $event.stopPropagation()" 
                                 class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-white hover:bg-red-500 hover:text-white transition-all shadow-sm">
                             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                         </button>
                     </div>
               </div>
            }
          </div>

          <!-- FAB -->
          <div class="absolute bottom-6 right-6 z-20">
              <button (click)="openAddModal()" 
                      class="w-14 h-14 rounded-full bg-td-brand text-white shadow-lg shadow-blue-500/30 flex items-center justify-center hover:bg-td-brandHover transition-all active:scale-95">
                 <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
              </button>
          </div>
        </div>
      </div>

      <!-- Modal -->
      @if (showModal()) {
        <div class="absolute inset-0 bg-black/45 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]" (click)="closeModal()">
          <div class="bg-white dark:bg-[#1C1C1C] rounded-ant-lg w-full max-w-sm max-h-[90%] overflow-y-auto shadow-2xl" (click)="$event.stopPropagation()">
            <div class="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#141414]">
              <h2 class="text-base font-semibold text-td-text-primary dark:text-td-dark-text">
                {{ ls.t().newTimer }}
              </h2>
              <button (click)="closeModal()" class="text-td-text-secondary hover:text-td-text-primary dark:text-gray-400 dark:hover:text-white">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <form [formGroup]="timerForm" (ngSubmit)="saveTimer()" class="p-6 space-y-6">
              
              <!-- Duration Picker (Native Time Input) -->
              <div>
                  <div class="flex justify-center">
                    <input type="time" step="1" formControlName="duration" class="text-4xl bg-transparent border-0 text-center font-bold text-td-text-primary dark:text-white focus:ring-0 p-0 h-16 w-56">
                  </div>
                  <!-- Helper text to indicate format -->
                  <div class="text-center text-xs text-td-text-secondary dark:text-gray-400 mt-2">
                      {{ ls.t().hours }} : {{ ls.t().min }} : {{ ls.t().sec }}
                  </div>
              </div>

              <!-- Label -->
              <div>
                 <label class="block text-sm font-medium text-td-text-secondary dark:text-gray-400 mb-1.5">{{ ls.t().timerName }}</label>
                 <input type="text" formControlName="label" class="ant-input h-9" [placeholder]="ls.t().enterTimerName">
              </div>

              <div class="pt-2">
                  <button type="submit" [disabled]="timerForm.invalid || totalSecondsFromForm() === 0" class="w-full ant-btn ant-btn-primary h-10 text-base font-medium shadow-lg shadow-blue-500/20 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed">
                      {{ ls.t().start }}
                  </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Delete Confirmation -->
      @if (deleteId()) {
        <div class="absolute inset-0 bg-black/45 z-50 flex items-center justify-center p-6 backdrop-blur-[2px]" (click)="cancelDelete()">
           <div class="bg-white dark:bg-[#1C1C1C] p-6 rounded-ant-lg shadow-2xl w-full max-w-xs" (click)="$event.stopPropagation()">
              <div class="flex items-start gap-3 mb-6">
                  <div class="text-td-warning text-2xl">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  </div>
                  <div>
                    <h3 class="text-base font-semibold text-td-text-primary dark:text-td-dark-text mb-2">{{ ls.t().delete }}?</h3>
                    <p class="text-sm text-td-text-secondary dark:text-gray-400 leading-relaxed">{{ ls.t().confirmDelete }}</p>
                  </div>
              </div>
              <div class="flex justify-center gap-4">
                 <button (click)="cancelDelete()" class="ant-btn hover:border-td-brand hover:text-td-brand dark:hover:border-td-brand dark:hover:text-td-brand min-w-[80px]">{{ ls.t().cancel }}</button>
                 <button (click)="doDelete()" class="ant-btn ant-btn-primary bg-td-brand hover:bg-td-brandHover min-w-[80px]">{{ ls.t().confirm }}</button>
              </div>
           </div>
        </div>
      }
    </div>
  `
})
export class TimerComponent {
  service = inject(CountdownService);
  ls = inject(LocalizationService);
  fb = inject(FormBuilder);
  
  showModal = signal(false);
  deleteId = signal<string | null>(null);
  now = signal(Date.now());
  timerForm: FormGroup;

  constructor() {
    this.timerForm = this.fb.group({
      duration: ['00:05:00', [Validators.required]],
      label: [''],
    });
    setInterval(() => this.now.set(Date.now()), 1000);
  }

  totalSecondsFromForm = computed(() => {
    const val = this.timerForm.value.duration;
    if (!val) return 0;
    const parts = val.split(':').map(Number);
    let h = 0, m = 0, s = 0;
    if (parts.length === 3) {
        [h, m, s] = parts;
    } else if (parts.length === 2) {
        [h, m] = parts;
    }
    return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
  });

  getFinishTime(timer: TimerInstance): string {
      const finishMs = this.now() + (timer.remainingTime * 1000);
      const date = new Date(finishMs);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  saveTimer() {
    if (this.timerForm.invalid) return;
    const totalSeconds = this.totalSecondsFromForm();
    if (totalSeconds <= 0) return;
    
    const label = this.timerForm.value.label || this.ls.t().enterTimerName;
    this.service.addTimer(totalSeconds, label);
    this.closeModal();
  }
  
  openAddModal() {
    this.timerForm.reset({ duration: '00:05:00', label: '' });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  confirmDelete(id: string) {
    this.deleteId.set(id);
  }

  cancelDelete() {
    this.deleteId.set(null);
  }

  doDelete() {
    const id = this.deleteId();
    if (id) {
        this.service.deleteTimer(id);
        this.deleteId.set(null);
    }
  }
  
  toggleTimer(id: string) { this.service.togglePause(id); }
  resetRunning(id: string) { this.service.resetTimer(id); }

  formatTime(totalSeconds: number): string {
    const d = Math.floor(totalSeconds / 86400);
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    if (d > 0) return `${d}d ${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}