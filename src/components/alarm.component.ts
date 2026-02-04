import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { TimeService, AlarmConfig, TaskType } from '../services/time.service';
import { LocalizationService } from '../services/localization.service';

@Component({
  selector: 'app-alarm',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="h-full flex flex-col bg-[#f5f5f5] dark:bg-td-dark-bg text-td-text-primary dark:text-td-dark-text relative font-sans">
      <!-- Header -->
      <div class="flex justify-between items-center px-5 py-4 bg-white dark:bg-[#1C1C1C] shadow-sm z-10 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <h1 class="text-xl font-bold">{{ ls.t().alarms }}</h1>
        <button (click)="ls.toggleLang()" class="ant-btn ant-btn-icon rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
           <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
           </svg>
        </button>
      </div>

      <!-- List -->
      <div class="flex-1 overflow-y-auto p-4 pb-24 md:pb-6 no-scrollbar">
        @if (timeService.alarms().length === 0) {
          <div class="flex flex-col items-center justify-center h-full text-td-text-secondary dark:text-gray-400">
             <svg class="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="13" r="8" stroke-width="1.5"></circle>
                <polyline points="12 9 12 13 15 14" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></polyline>
                <line x1="5" y1="2" x2="9" y2="6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></line>
                <line x1="19" y1="2" x2="15" y2="6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></line>
             </svg>
             <p>{{ ls.t().noAlarms }}</p>
          </div>
        }

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          @for (alarm of timeService.alarms(); track alarm.id) {
            <div class="bg-white dark:bg-[#1C1C1C] p-5 rounded-ant shadow-ant flex items-center justify-between border-l-[6px] transition-all hover:-translate-y-0.5 h-full min-h-[120px]"
                 [class.border-td-brand]="alarm.enabled" [class.border-gray-300]="!alarm.enabled"
                 (click)="edit(alarm)">
               
               <div class="flex-1 cursor-pointer mr-4">
                  <div class="flex items-end gap-2 mb-1">
                     <span class="text-4xl font-light tracking-tight" [class.text-gray-400]="!alarm.enabled">{{ alarm.time }}</span>
                     <span class="text-xs mb-1.5 font-medium text-td-text-secondary dark:text-gray-500 uppercase">{{ getMeridiem(alarm.time) }}</span>
                  </div>
                  <div class="text-sm text-td-text-secondary dark:text-gray-400 flex flex-wrap gap-2 items-center">
                     <span class="truncate max-w-[120px]">{{ alarm.label || ls.t().alarms }}</span>
                     @if (alarm.repeatDays.length > 0) {
                        <span class="text-gray-300 dark:text-gray-600">•</span>
                        <span>{{ formatDays(alarm.repeatDays) }}</span>
                     }
                     @if (alarm.tasks && alarm.tasks.length > 0) {
                        <span class="text-gray-300 dark:text-gray-600">•</span>
                        <div class="flex gap-1 flex-wrap">
                           @for (task of alarm.tasks; track task) {
                             <span class="bg-td-brand/10 text-td-brand px-1.5 rounded text-[10px] font-bold uppercase">{{ getTaskLabelShort(task) }}</span>
                           }
                        </div>
                     }
                  </div>
               </div>

               <div class="flex flex-col gap-3" (click)="$event.stopPropagation()">
                  <!-- Switch -->
                  <button (click)="toggle(alarm.id)"
                      class="relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none"
                      [class.bg-td-brand]="alarm.enabled"
                      [class.bg-gray-300]="!alarm.enabled">
                      <span class="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out"
                            [class.translate-x-5]="alarm.enabled"
                            [class.translate-x-0]="!alarm.enabled"></span>
                  </button>
                  <!-- Delete -->
                  <button (click)="confirmDelete(alarm.id)" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-white hover:bg-red-500 hover:text-white transition-all shadow-sm self-end">
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
                {{ editingId() ? ls.t().editAlarm : ls.t().newAlarm }}
              </h2>
              <button (click)="closeModal()" class="text-td-text-secondary hover:text-td-text-primary dark:text-gray-400 dark:hover:text-white">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <form [formGroup]="alarmForm" (ngSubmit)="saveAlarm()" class="p-6 space-y-6">
               
               <!-- Time Picker (Native) -->
               <div class="flex justify-center">
                  <input type="time" formControlName="time" class="text-4xl bg-transparent border-0 text-center font-bold text-td-text-primary dark:text-white focus:ring-0 p-0 h-16 w-40">
               </div>

               <!-- Label -->
               <div>
                  <label class="block text-sm font-medium text-td-text-secondary dark:text-gray-400 mb-1.5">{{ ls.t().alarmLabel }}</label>
                  <input type="text" formControlName="label" class="ant-input h-9" [placeholder]="ls.t().alarms">
               </div>

               <!-- Repeat -->
               <div>
                   <label class="block text-sm font-medium text-td-text-secondary dark:text-gray-400 mb-2">{{ ls.t().repeat }}</label>
                   <div class="flex justify-between">
                      @for (day of days; track $index) {
                        <button type="button" 
                                (click)="toggleDay($index)"
                                [class.bg-td-brand]="selectedDays.includes($index)"
                                [class.text-white]="selectedDays.includes($index)"
                                [class.bg-gray-100]="!selectedDays.includes($index)"
                                [class.dark:bg-[#2a2a2a]]="!selectedDays.includes($index)"
                                [class.text-gray-500]="!selectedDays.includes($index)"
                                class="w-9 h-9 rounded-full text-xs font-bold transition-all active:scale-95 shadow-sm flex items-center justify-center">
                          {{ day }}
                        </button>
                      }
                   </div>
               </div>
               
               <!-- Tasks Selection -->
               <div>
                   <label class="block text-sm font-medium text-td-text-secondary dark:text-gray-400 mb-2">{{ ls.t().selectTasks }}</label>
                   <div class="grid grid-cols-2 gap-2">
                       @for (type of taskTypes; track type) {
                           <button type="button" 
                                   (click)="toggleTask(type)"
                                   [class.bg-td-brand]="selectedTasks.includes(type)"
                                   [class.text-white]="selectedTasks.includes(type)"
                                   [class.border-transparent]="selectedTasks.includes(type)"
                                   [class.bg-white]="!selectedTasks.includes(type)"
                                   [class.text-gray-600]="!selectedTasks.includes(type)"
                                   [class.dark:bg-[#2a2a2a]]="!selectedTasks.includes(type)"
                                   [class.dark:text-gray-300]="!selectedTasks.includes(type)"
                                   class="py-2.5 px-3 rounded-ant border border-gray-200 dark:border-gray-700 text-sm font-medium transition-all text-left flex items-center gap-2">
                                <div class="w-4 h-4 rounded-full border flex items-center justify-center"
                                     [class.border-white]="selectedTasks.includes(type)"
                                     [class.border-gray-300]="!selectedTasks.includes(type)">
                                     @if (selectedTasks.includes(type)) { <div class="w-2 h-2 rounded-full bg-white"></div> }
                                </div>
                                {{ getTaskLabel(type) }}
                           </button>
                       }
                   </div>
               </div>

               <div class="pt-2">
                <button type="submit" [disabled]="alarmForm.invalid" class="w-full ant-btn ant-btn-primary h-10 text-base font-medium shadow-lg shadow-blue-500/20">
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
export class AlarmComponent {
  timeService = inject(TimeService);
  ls = inject(LocalizationService);
  fb = inject(FormBuilder);
  
  showModal = signal(false);
  deleteId = signal<string | null>(null);
  editingId = signal<string | null>(null);
  
  days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  selectedDays: number[] = [];
  selectedTasks: TaskType[] = [];
  
  taskTypes: TaskType[] = ['shake', 'math', 'stroop', 'step'];

  alarmForm = this.fb.group({
      time: ['08:00', Validators.required],
      label: ['Conditional Alarm']
  });

  getMeridiem(time: string): string {
      const h = parseInt(time.split(':')[0], 10);
      return h >= 12 ? 'PM' : 'AM';
  }
  
  getTaskLabel(type: TaskType): string {
      switch(type) {
          case 'shake': return this.ls.t().taskShake;
          case 'math': return this.ls.t().taskMath;
          case 'stroop': return this.ls.t().taskStroop;
          case 'step': return this.ls.t().taskStep;
      }
  }
  
  getTaskLabelShort(type: TaskType): string {
      switch(type) {
          case 'shake': return 'Shake';
          case 'math': return 'Math';
          case 'stroop': return 'Stroop';
          case 'step': return 'Step';
      }
  }

  formatDays(days: number[]): string {
      if (days.length === 7) return this.ls.t().daily;
      if (days.length === 5 && !days.includes(0) && !days.includes(6)) return this.ls.t().weekdays;
      if (days.length === 2 && days.includes(0) && days.includes(6)) return this.ls.t().weekends;
      if (days.length === 0) return this.ls.t().never;
      return days.map(d => this.days[d]).join(' ');
  }

  openAddModal() {
      this.editingId.set(null);
      this.alarmForm.reset({ time: '08:00', label: '' });
      this.selectedDays = [1, 2, 3, 4, 5]; // Default to Mon-Fri (1-5)
      this.selectedTasks = [];
      this.showModal.set(true);
  }

  edit(alarm: AlarmConfig) {
      this.editingId.set(alarm.id);
      this.alarmForm.patchValue({
          time: alarm.time,
          label: alarm.label
      });
      this.selectedDays = [...alarm.repeatDays];
      this.selectedTasks = [...(alarm.tasks || [])];
      this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }
  toggle(id: string) { this.timeService.toggleAlarm(id); }
  confirmDelete(id: string) { this.deleteId.set(id); }
  cancelDelete() { this.deleteId.set(null); }
  doDelete() { 
      if (this.deleteId()) this.timeService.deleteAlarm(this.deleteId()!);
      this.deleteId.set(null); 
  }
  
  toggleDay(index: number) {
      if (this.selectedDays.includes(index)) this.selectedDays = this.selectedDays.filter(d => d !== index);
      else this.selectedDays.push(index);
      this.selectedDays.sort();
  }
  
  toggleTask(type: TaskType) {
      if (this.selectedTasks.includes(type)) {
          this.selectedTasks = this.selectedTasks.filter(t => t !== type);
      } else {
          this.selectedTasks.push(type);
      }
  }
  
  saveAlarm() {
      if (this.alarmForm.invalid) return;
      const val = this.alarmForm.value;
      const config: AlarmConfig = {
          id: this.editingId() || crypto.randomUUID(),
          time: val.time!,
          label: val.label || this.ls.t().alarms,
          snoozeEnabled: false, // Force disabled
          snoozeDuration: 0,
          repeatDays: this.selectedDays,
          tasks: this.selectedTasks,
          enabled: true
      };
      
      if (this.editingId()) this.timeService.updateAlarm(config);
      else this.timeService.addAlarm(config);
      
      this.closeModal();
  }
}