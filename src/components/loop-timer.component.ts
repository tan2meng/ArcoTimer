import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { TimeService, LoopTimerConfig } from '../services/time.service';
import { LocalizationService } from '../services/localization.service';

@Component({
  selector: 'app-loop-timer',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="h-full flex flex-col bg-[#f5f5f5] dark:bg-td-dark-bg text-td-text-primary dark:text-td-dark-text relative">
      <!-- Header -->
      <div class="flex justify-between items-center px-5 py-4 bg-white dark:bg-[#1C1C1C] shadow-sm z-10 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <h1 class="text-xl font-bold">{{ ls.t().loopTimers }}</h1>
        <button (click)="ls.toggleLang()" class="ant-btn ant-btn-icon rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
           <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
           </svg>
        </button>
      </div>

      <!-- List -->
      <div class="flex-1 overflow-y-auto p-4 pb-24 md:pb-6 no-scrollbar">
        @if (timeService.loopTimers().length === 0) {
          <div class="flex flex-col items-center justify-center h-full text-td-text-secondary dark:text-gray-400">
            <svg class="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            <p>{{ ls.t().noLoops }}</p>
          </div>
        }

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          @for (timer of timeService.loopTimers(); track timer.id) {
            <div class="bg-white dark:bg-[#1C1C1C] p-5 rounded-ant shadow-ant flex items-center justify-between border-l-[6px] transition-all hover:-translate-y-0.5 relative overflow-hidden h-full min-h-[120px]" 
                 [class.border-td-brand]="timer.enabled" [class.border-gray-300]="!timer.enabled"
                 (click)="edit(timer)">
              
              @if (timer.enabled) {
                <!-- Shrinking Bar (Countdown Style) -->
                <div class="absolute bottom-0 left-0 h-1.5 transition-all duration-1000 ease-linear"
                     [style.background-color]="'rgb(22, 119, 255)'"
                     [style.width.%]="getProgress(timer)"></div>
              }

              <div class="flex-1 cursor-pointer z-10 mr-4">
                <div class="flex items-center space-x-2 mb-1 flex-wrap">
                   <h3 class="font-semibold text-lg dark:text-white truncate">{{ timer.name }}</h3>
                   
                   <span class="inline-flex items-center justify-center bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full text-xs font-mono font-bold text-gray-500 dark:text-gray-400">
                      # {{ timer.timesFired || 0 }}
                   </span>

                   @if (!timer.enabled) {
                     <span class="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{{ ls.t().off }}</span>
                   }
                </div>
                <div class="text-sm text-td-text-secondary dark:text-gray-400 mt-2 flex flex-wrap gap-2 items-center">
                  <span class="inline-flex items-center bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded text-td-brand dark:text-blue-300 capitalize whitespace-nowrap">
                    <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    {{ timer.intervalValue }} {{ getUnitLabel(timer.intervalUnit) }}
                  </span>
                  
                  @if (isSpecificTimeForDisplay(timer)) {
                     <span class="inline-flex items-center text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap">
                       • {{ getStartTimeDisplay(timer.startTime) }}
                     </span>
                  } @else if (timer.activeHoursEnabled && timer.activeTimeStart) {
                     <span class="inline-flex items-center text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap">
                       • {{ timer.activeTimeStart }} - {{ timer.activeTimeEnd }}
                     </span>
                  }
                </div>
              </div>
              
              <div class="flex flex-col gap-3 z-10" (click)="$event.stopPropagation()">
                <button (click)="toggle(timer.id)"
                  class="relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none"
                  [class.bg-td-brand]="timer.enabled"
                  [class.bg-gray-300]="!timer.enabled">
                  <span class="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out"
                        [class.translate-x-5]="timer.enabled"
                        [class.translate-x-0]="!timer.enabled"></span>
                </button>
                
                <button (click)="confirmDelete(timer.id)" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-white hover:bg-red-500 hover:text-white transition-all shadow-sm self-end">
                   <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- FAB -->
      <div class="absolute bottom-6 right-6 z-20">
         <button (click)="openAddModal()" 
                 class="w-14 h-14 rounded-full bg-td-brand text-white shadow-lg shadow-blue-500/30 flex items-center justify-center hover:bg-td-brandHover transition-all active:scale-95">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
         </button>
      </div>

      <!-- Modal -->
      @if (showModal()) {
        <div class="absolute inset-0 bg-black/45 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]" (click)="closeModal()">
          <div class="bg-white dark:bg-[#1C1C1C] rounded-ant-lg w-full max-w-sm max-h-[90%] overflow-y-auto shadow-2xl" (click)="$event.stopPropagation()">
            <div class="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#141414]">
              <h2 class="text-base font-semibold text-td-text-primary dark:text-td-dark-text">
                {{ editingId() ? ls.t().editLoop : ls.t().newLoop }}
              </h2>
              <button (click)="closeModal()" class="text-td-text-secondary hover:text-td-text-primary dark:text-gray-400 dark:hover:text-white">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <form [formGroup]="timerForm" (ngSubmit)="saveTimer()" class="p-6 space-y-6">
              <!-- Name -->
              <div>
                <label class="block text-sm font-medium text-td-text-secondary dark:text-gray-400 mb-1.5">{{ ls.t().actName }}</label>
                <input type="text" formControlName="name" class="ant-input h-9">
              </div>

              <!-- Interval -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                   <label class="block text-sm font-medium text-td-text-secondary dark:text-gray-400 mb-1.5">{{ ls.t().repeatEvery }}</label>
                   <input type="number" min="1" formControlName="intervalValue" class="ant-input h-9">
                </div>
                <div>
                   <label class="block text-sm font-medium text-td-text-secondary dark:text-gray-400 mb-1.5">{{ ls.t().unit }}</label>
                   <div class="relative">
                     <select formControlName="intervalUnit" class="ant-input h-9 appearance-none capitalize">
                       <option value="second">{{ ls.t().sec }}</option>
                       <option value="minute">{{ ls.t().min }}</option>
                       <option value="hour">{{ ls.t().hours }}</option>
                       <option value="day">{{ ls.t().day }}</option>
                       <option value="week">{{ ls.t().week }}</option>
                       <option value="month">{{ ls.t().month }}</option>
                       <option value="year">{{ ls.t().year }}</option>
                     </select>
                     <div class="absolute right-0 top-3 pointer-events-none text-gray-400 pr-3">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                     </div>
                   </div>
                </div>
              </div>

              <!-- Specific Time (Shown only for Hour/Day/Week/Month/Year or > 24h) -->
              @if (isSpecificTimeMode()) {
                 <div>
                    <label class="block text-sm font-medium text-td-text-secondary dark:text-gray-400 mb-4 text-center">{{ ls.t().ringTime }}</label>
                    <div class="flex justify-center">
                      <input type="time" step="1" formControlName="specificTime" class="text-4xl bg-transparent border-0 text-center font-bold text-td-text-primary dark:text-white focus:ring-0 p-0 h-16 w-56">
                    </div>
                    <div class="text-center text-xs text-td-text-secondary dark:text-gray-400 mt-2">
                        {{ ls.t().hours }} : {{ ls.t().min }} : {{ ls.t().sec }}
                    </div>
                 </div>
              } 
              @else {
                <!-- Active Hours -->
                <div class="p-4 rounded-ant border transition-all relative overflow-hidden group select-none"
                     [class.bg-white]="activeHoursEnabled()"
                     [class.dark:bg-[#141414]]="activeHoursEnabled()"
                     [class.border-gray-200]="activeHoursEnabled()"
                     [class.dark:border-gray-700]="activeHoursEnabled()"
                     [class.bg-gray-100]="!activeHoursEnabled()"
                     [class.dark:bg-[#2a2a2a]]="!activeHoursEnabled()">
                  
                  <div class="flex items-center justify-between mb-3">
                     <div class="flex items-center gap-2">
                        <span class="text-sm font-medium transition-colors"
                              [class.text-td-text-primary]="activeHoursEnabled()"
                              [class.dark:text-td-dark-text]="activeHoursEnabled()"
                              [class.text-gray-400]="!activeHoursEnabled()">
                          {{ ls.t().actHours }}
                        </span>
                        @if (!activeHoursEnabled()) { <span class="text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded">OFF</span> }
                     </div>
                     <button type="button" (click)="toggleActiveHours()" class="focus:outline-none">
                         <div class="w-10 h-6 rounded-full relative transition-colors" [class.bg-td-brand]="activeHoursEnabled()" [class.bg-gray-300]="!activeHoursEnabled()">
                              <div class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm" [class.translate-x-4]="activeHoursEnabled()"></div>
                         </div>
                     </button>
                  </div>

                  <div class="grid grid-cols-2 gap-3 relative">
                    @if (!activeHoursEnabled()) { <div class="absolute inset-0 z-10 bg-transparent cursor-not-allowed"></div> }
                    <input type="time" formControlName="activeTimeStart" class="ant-input h-8 text-center">
                    <input type="time" formControlName="activeTimeEnd" class="ant-input h-8 text-center">
                  </div>
                </div>

                <!-- Active Days -->
                <div class="p-4 rounded-ant border transition-all relative overflow-hidden group select-none"
                     [class.bg-white]="activeDaysEnabled()"
                     [class.dark:bg-[#141414]]="activeDaysEnabled()"
                     [class.border-gray-200]="activeDaysEnabled()"
                     [class.dark:border-gray-700]="activeDaysEnabled()"
                     [class.bg-gray-100]="!activeDaysEnabled()"
                     [class.dark:bg-[#2a2a2a]]="!activeDaysEnabled()">

                  <div class="flex items-center justify-between mb-3">
                     <div class="flex items-center gap-2">
                        <span class="text-sm font-medium transition-colors"
                              [class.text-td-text-primary]="activeDaysEnabled()"
                              [class.dark:text-td-dark-text]="activeDaysEnabled()"
                              [class.text-gray-400]="!activeDaysEnabled()">
                          {{ ls.t().actDays }}
                        </span>
                        @if (!activeDaysEnabled()) { <span class="text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded">OFF</span> }
                     </div>
                     <button type="button" (click)="toggleActiveDays()" class="focus:outline-none">
                         <div class="w-10 h-6 rounded-full relative transition-colors" [class.bg-td-brand]="activeDaysEnabled()" [class.bg-gray-300]="!activeDaysEnabled()">
                              <div class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm" [class.translate-x-4]="activeDaysEnabled()"></div>
                         </div>
                     </button>
                  </div>

                  <div class="flex justify-between relative">
                    @if (!activeDaysEnabled()) { <div class="absolute inset-0 z-10 bg-transparent cursor-not-allowed"></div> }
                    @for (day of days; track $index) {
                      <button type="button" 
                              (click)="toggleDay($index)"
                              
                              [class.bg-td-brand]="activeDaysEnabled() && selectedDays.includes($index)"
                              [class.bg-gray-400]="!activeDaysEnabled() && selectedDays.includes($index)"
                              [class.dark:bg-gray-700]="!activeDaysEnabled() && selectedDays.includes($index)"
                              
                              [class.text-white]="selectedDays.includes($index)"
                              
                              [class.bg-white]="!selectedDays.includes($index)"
                              [class.dark:bg-[#2a2a2a]]="activeDaysEnabled() && !selectedDays.includes($index)"
                              [class.dark:bg-transparent]="!activeDaysEnabled() && !selectedDays.includes($index)"

                              [class.border-gray-200]="!selectedDays.includes($index)"
                              [class.dark:border-gray-700]="!selectedDays.includes($index)"
                              [class.border-transparent]="selectedDays.includes($index)"

                              [class.text-gray-500]="!selectedDays.includes($index)"
                              
                              [class.hover:scale-105]="activeDaysEnabled()"
                              [class.active:scale-95]="activeDaysEnabled()"
                              
                              class="w-8 h-8 rounded-ant-sm border text-xs font-bold transition-all shadow-sm flex items-center justify-center">
                        {{ day }}
                      </button>
                    }
                  </div>
                </div>
              }

              <div class="pt-2">
                <button type="submit" [disabled]="timerForm.invalid" class="w-full ant-btn ant-btn-primary h-10 text-base font-medium shadow-lg shadow-blue-500/20">
                    {{ ls.t().save }}
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
export class LoopTimerComponent {
  timeService = inject(TimeService);
  ls = inject(LocalizationService);
  showModal = signal(false);
  deleteId = signal<string | null>(null);
  editingId = signal<string | null>(null);
  activeHoursEnabled = signal(false);
  activeDaysEnabled = signal(false);
  fb = inject(FormBuilder);
  
  days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  selectedDays: number[] = [1, 2, 3, 4, 5]; 

  timerForm: FormGroup = this.fb.group({
    name: ['Check', Validators.required],
    intervalValue: [1, [Validators.required, Validators.min(1)]],
    intervalUnit: ['hour', Validators.required],
    activeTimeStart: ['08:00'],
    activeTimeEnd: ['22:00'],
    specificTime: ['08:00:00']
  });
  
  // Track form values reactively for mode switching
  currentIntervalUnit = signal<string>('hour');
  currentIntervalValue = signal<number>(1);

  constructor() {
     this.timerForm.valueChanges.subscribe(val => {
         this.currentIntervalUnit.set(val.intervalUnit);
         this.currentIntervalValue.set(Number(val.intervalValue));
     });
  }

  isSpecificTimeMode = computed(() => {
    const u = this.currentIntervalUnit();
    const v = this.currentIntervalValue();
    
    // Day, Week, Month, Year
    if (['day', 'week', 'month', 'year'].includes(u)) return true;
    
    // Check if >= 24 hours
    let hours = 0;
    if (u === 'hour') hours = v;
    else if (u === 'minute') hours = v / 60;
    else if (u === 'second') hours = v / 3600;
    
    return hours >= 24;
  });

  isSpecificTimeForDisplay(timer: LoopTimerConfig): boolean {
    const u = timer.intervalUnit;
    const v = timer.intervalValue;
    if (['day', 'week', 'month', 'year'].includes(u)) return true;
    let hours = 0;
    if (u === 'hour') hours = v;
    else if (u === 'minute') hours = v / 60;
    else if (u === 'second') hours = v / 3600;
    return hours >= 24;
  }
  
  getStartTimeDisplay(isoStr: string): string {
      try {
          return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      } catch { return ''; }
  }

  getUnitLabel(unit: string): string {
      const u = unit as 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
      switch(u) {
          case 'second': return this.ls.t().sec;
          case 'minute': return this.ls.t().min;
          case 'hour': return this.ls.t().hours;
          case 'day': return this.ls.t().day;
          case 'week': return this.ls.t().week;
          case 'month': return this.ls.t().month;
          case 'year': return this.ls.t().year;
      }
      return unit;
  }

  getProgress(timer: LoopTimerConfig): number {
    const now = this.timeService.now();
    if (!timer.enabled || !timer.nextFireTime || !this.timeService.checkConstraints(now, timer)) return 0;
    const nowTime = now.getTime();
    
    let duration = 0;
    const val = timer.intervalValue;
    switch(timer.intervalUnit) {
        case 'second': duration = val * 1000; break;
        case 'minute': duration = val * 60000; break;
        case 'hour': duration = val * 3600000; break;
        case 'day': duration = val * 86400000; break;
        case 'week': duration = val * 604800000; break;
        case 'month': duration = val * 2592000000; break;
        case 'year': duration = val * 31536000000; break;
    }

    const remaining = timer.nextFireTime - nowTime;
    
    let percent = (remaining / duration) * 100;
    
    if (percent < 0) percent = 0;
    if (percent > 100) percent = 100;
    return percent;
  }

  openAddModal() {
    this.editingId.set(null);
    this.resetForm();
    this.showModal.set(true);
  }

  edit(timer: LoopTimerConfig) {
    this.editingId.set(timer.id);
    if (timer.allowedDaysOfWeek && timer.allowedDaysOfWeek.length > 0) {
        this.activeDaysEnabled.set(true);
        this.selectedDays = [...timer.allowedDaysOfWeek];
    } else {
        this.activeDaysEnabled.set(false);
        this.selectedDays = [1, 2, 3, 4, 5];
    }
    this.activeHoursEnabled.set(timer.activeHoursEnabled ?? false);
    
    // Populate form including specific time derived from startTime
    const date = new Date(timer.startTime);
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');

    this.timerForm.patchValue({
      name: timer.name,
      intervalValue: timer.intervalValue,
      intervalUnit: timer.intervalUnit,
      activeTimeStart: timer.activeTimeStart,
      activeTimeEnd: timer.activeTimeEnd,
      specificTime: `${h}:${m}:${s}`
    });
    
    // Update signals manually since patchValue doesn't always trigger if not changed from init,
    // but here we want to ensure mode is correct.
    this.currentIntervalUnit.set(timer.intervalUnit);
    this.currentIntervalValue.set(timer.intervalValue);
    
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingId.set(null);
  }

  resetForm() {
    this.selectedDays = [1, 2, 3, 4, 5];
    this.activeHoursEnabled.set(false);
    this.activeDaysEnabled.set(false);
    this.timerForm.reset({
      name: 'Check',
      intervalValue: 1,
      intervalUnit: 'hour',
      activeTimeStart: '08:00',
      activeTimeEnd: '22:00',
      specificTime: '08:00:00'
    });
    this.currentIntervalUnit.set('hour');
    this.currentIntervalValue.set(1);
  }

  toggleDay(index: number) {
    if (this.selectedDays.includes(index)) {
      this.selectedDays = this.selectedDays.filter(d => d !== index);
    } else {
      this.selectedDays.push(index);
    }
  }

  toggleActiveHours() { this.activeHoursEnabled.update(v => !v); }
  toggleActiveDays() { this.activeDaysEnabled.update(v => !v); }
  toggle(id: string) { this.timeService.toggleLoopTimer(id); }
  confirmDelete(id: string) { this.deleteId.set(id); }
  cancelDelete() { this.deleteId.set(null); }
  doDelete() {
    if(this.deleteId()) {
      this.timeService.deleteLoopTimer(this.deleteId()!);
      this.deleteId.set(null);
    }
  }

  saveTimer() {
    if (this.timerForm.invalid) return;
    const formVal = this.timerForm.value;
    const isSpecific = this.isSpecificTimeMode();

    let startTime = new Date().toISOString();
    
    // If in specific time mode, anchor the start time to Today + Specific Time.
    // The service will calculate the correct future fire time based on this anchor.
    if (isSpecific) {
       const [h, m, s] = (formVal.specificTime || '00:00:00').split(':').map(Number);
       const date = new Date();
       date.setHours(h || 0, m || 0, s || 0, 0);
       startTime = date.toISOString();
    }

    const finalDays = (this.activeDaysEnabled() && !isSpecific) ? this.selectedDays : [];
    const activeHours = (this.activeHoursEnabled() && !isSpecific);

    const timerData: LoopTimerConfig = {
      id: this.editingId() || crypto.randomUUID(),
      name: formVal.name,
      enabled: true,
      startTime: startTime, 
      intervalValue: formVal.intervalValue,
      intervalUnit: formVal.intervalUnit,
      allowedDaysOfWeek: finalDays,
      activeHoursEnabled: activeHours,
      activeTimeStart: formVal.activeTimeStart,
      activeTimeEnd: formVal.activeTimeEnd,
    };
    
    if (this.editingId()) {
       this.timeService.updateLoopTimer(timerData);
    } else {
       this.timeService.addLoopTimer(timerData);
    }
    this.closeModal();
  }
}