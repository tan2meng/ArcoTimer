import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup } from '@angular/forms';
import { ShakeAlarmService, ShakeAlarmConfig } from '../services/shake-alarm.service';
import { LocalizationService } from '../services/localization.service';

@Component({
  selector: 'app-shake-alarm',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="h-full flex flex-col bg-[#f5f5f5] dark:bg-td-dark-bg text-td-text-primary dark:text-td-dark-text relative font-sans">
      
      <!-- Header -->
      <div class="flex-none flex justify-between items-center px-5 py-4 bg-white dark:bg-[#1C1C1C] shadow-sm z-10 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <h1 class="text-xl font-bold">{{ ls.t().shakeAlarm }}</h1>
        <button (click)="ls.toggleLang()" class="ant-btn ant-btn-icon rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
           <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
           </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4 pb-24 md:pb-6 no-scrollbar">
         
         @if (service.alarms().length === 0 && service.activeStates().length === 0) {
            <div class="flex flex-col items-center justify-center h-full text-td-text-secondary dark:text-gray-400">
              <svg class="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10a4 4 0 014-4h10a4 4 0 014 4v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6z"/>
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 18v2m10-2v2"/>
              </svg>
              <p>{{ ls.t().noShakeAlarms }}</p>
            </div>
         }

         <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
           <!-- Running State Indicators (List) -->
           @for (state of service.activeStates(); track state.instanceId) {
             <div class="bg-white dark:bg-[#1C1C1C] p-4 rounded-ant shadow-ant border-2 border-td-brand animate-pulse relative overflow-hidden h-full min-h-[140px] flex flex-col justify-between gap-3">
                 <div class="flex justify-between items-center relative z-10">
                     <div class="min-w-0 flex-1 mr-2">
                         <div class="flex items-baseline min-w-0">
                            <div class="text-lg font-bold truncate text-td-text-primary dark:text-td-dark-text leading-tight">
                               {{ state.config.name }}
                            </div>
                            <!-- Updated font size to text-lg -->
                            <span class="text-td-text-secondary dark:text-gray-400 font-mono ml-2 text-lg shrink-0">#{{ state.runIndex }}</span>
                         </div>
                     </div>
                     <div class="text-2xl font-mono font-bold text-td-brand shrink-0">
                         {{ formatTime(state.remainingTime) }}
                     </div>
                 </div>
                 
                 <!-- Progress Bar -->
                 <div class="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden relative z-10">
                     <!-- Shake Points Markers -->
                     @for (point of state.config.shakePoints; track point) {
                        <div class="absolute top-0 bottom-0 w-1 bg-yellow-400 dark:bg-yellow-500 z-20 opacity-80"
                             [style.left.%]="(point / state.config.totalDuration) * 100"
                             [title]="formatTime(point)"></div>
                     }
                     
                     <div class="h-full bg-td-brand transition-all duration-1000 ease-linear relative z-10 opacity-90"
                          [style.width.%]="(state.elapsedTime / state.config.totalDuration) * 100"></div>
                 </div>

                 <div class="flex justify-between items-center relative z-10">
                     <div class="text-xs text-gray-500 font-medium">
                         {{ state.nextPointIndex }} / {{ state.config.shakePoints.length }} {{ ls.t().shakePoints }}
                     </div>
                     <button (click)="service.stop(state.instanceId)" class="ant-btn border-td-error text-td-error hover:bg-red-50 dark:hover:bg-red-900/20 text-xs px-3 h-7">
                         {{ ls.t().stop }}
                     </button>
                 </div>
             </div>
           }

           @for (alarm of service.alarms(); track alarm.id; let i = $index) {
             <div class="bg-white dark:bg-[#1C1C1C] p-5 rounded-ant shadow-ant flex flex-col border border-gray-100 dark:border-gray-800 relative hover:border-td-brand/30 transition-colors h-full min-h-[160px]">
                <div class="flex justify-between items-start mb-2">
                   <div class="min-w-0 flex-1 mr-2">
                      <div class="flex items-baseline min-w-0">
                          <h3 class="font-bold text-lg text-td-text-primary dark:text-td-dark-text truncate">{{ alarm.name }}</h3>
                          <!-- Updated font size to text-lg -->
                          <span class="text-td-text-secondary dark:text-gray-400 font-mono ml-2 text-lg shrink-0">#{{ i + 1 }}</span>
                      </div>
                      <div class="text-xs text-td-text-secondary dark:text-gray-400 mt-1 flex gap-2 flex-wrap">
                         <span>{{ ls.t().shakeTotalTime }}: {{ formatTime(alarm.totalDuration) }}</span>
                         <span>•</span>
                         <span>{{ alarm.shakePoints.length }} {{ ls.t().shakePoints }}</span>
                      </div>
                   </div>
                   <div class="flex gap-2 shrink-0">
                       <button (click)="editAlarm(alarm)" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 dark:bg-white/5 text-gray-500 hover:bg-td-brand hover:text-white transition-colors">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                       </button>
                       <button (click)="confirmDelete(alarm.id)" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 dark:bg-white/5 text-gray-500 hover:bg-red-500 hover:text-white transition-colors">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                       </button>
                   </div>
                </div>
                
                <!-- Points Preview -->
                <div class="flex flex-wrap gap-2 mb-4 flex-1">
                   @for (point of alarm.shakePoints.slice(0, 5); track point) {
                      <span class="text-[10px] bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded font-mono border border-yellow-200 dark:border-yellow-900/30">
                         {{ formatTime(point) }}
                      </span>
                   }
                   @if (alarm.shakePoints.length > 5) { <span class="text-xs text-gray-400">...</span> }
                </div>

                <!-- Start button always enabled to allow multiple instances -->
                <button (click)="service.start(alarm.id)" class="w-full py-2 bg-td-brand/10 text-td-brand font-bold rounded-ant hover:bg-td-brand hover:text-white transition-all flex items-center justify-center gap-2 mt-auto">
                   <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                   {{ ls.t().start }}
                </button>
             </div>
           }
         </div>
      </div>

      <!-- FAB -->
      <div class="absolute bottom-6 right-6 z-10">
         <button (click)="openAddModal()" 
                 class="w-14 h-14 rounded-full bg-td-brand text-white shadow-lg shadow-blue-500/30 flex items-center justify-center hover:bg-td-brandHover transition-all active:scale-95">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
         </button>
      </div>

      <!-- Add/Edit Modal -->
      @if (showModal()) {
        <div class="absolute inset-0 bg-black/45 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]" (click)="closeModal()">
          <div class="bg-white dark:bg-[#1C1C1C] rounded-ant-lg w-full max-w-sm h-[85vh] flex flex-col shadow-2xl" (click)="$event.stopPropagation()">
             
             <!-- Modal Header -->
             <div class="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#141414]">
               <h2 class="text-base font-semibold text-td-text-primary dark:text-td-dark-text">
                 {{ editingId() ? ls.t().edit : ls.t().shakeAlarm }}
               </h2>
               <button (click)="closeModal()" class="text-td-text-secondary hover:text-td-text-primary dark:text-gray-400 dark:hover:text-white">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
               </button>
             </div>

             <!-- Form -->
             <div class="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar" [formGroup]="shakeForm">
                <div>
                   <label class="block text-sm font-medium text-td-text-secondary dark:text-gray-400 mb-1.5">{{ ls.t().actName }}</label>
                   <input type="text" formControlName="name" class="ant-input h-9" placeholder="Shake Task">
                </div>

                <div>
                   <label class="block text-sm font-medium text-td-text-secondary dark:text-gray-400 mb-1.5">{{ ls.t().shakeTotalTime }}</label>
                   <div class="flex justify-center">
                      <input type="time" step="1" formControlName="totalDuration" class="text-3xl bg-transparent border-0 text-center font-bold text-td-text-primary dark:text-white focus:ring-0 p-0 h-16 w-48">
                   </div>
                </div>

                <div>
                   <div class="flex justify-between items-center mb-2">
                      <label class="block text-sm font-medium text-td-text-secondary dark:text-gray-400">{{ ls.t().shakePoints }}</label>
                   </div>
                   
                   <div formArrayName="points" class="space-y-3">
                      @for (ctrl of pointsArray.controls; track $index) {
                         <div class="flex items-center gap-2">
                            <span class="text-xs text-gray-400 w-4 font-mono">{{ $index + 1 }}</span>
                            <input [formControlName]="$index" type="time" step="1" class="ant-input h-9 text-center flex-1">
                            <button type="button" (click)="removePoint($index)" class="text-gray-400 hover:text-red-500">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                         </div>
                      }
                   </div>
                   
                   <div class="flex items-center gap-2 mt-4">
                      <div class="w-4"></div>
                      <button type="button" (click)="addPoint()" class="flex-1 py-2 border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-ant hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-1">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                          {{ ls.t().addShakePoint }}
                      </button>
                      <div class="w-5"></div>
                   </div>
                </div>
             </div>

             <div class="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1C1C1C]">
                <button (click)="saveAlarm()" [disabled]="shakeForm.invalid" class="w-full ant-btn ant-btn-primary h-10 text-base font-medium">
                   {{ ls.t().save }}
                </button>
             </div>
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
export class ShakeAlarmComponent {
  service = inject(ShakeAlarmService);
  ls = inject(LocalizationService);
  fb = inject(FormBuilder);

  showModal = signal(false);
  deleteId = signal<string | null>(null);
  editingId = signal<string | null>(null);

  shakeForm: FormGroup;

  constructor() {
    this.shakeForm = this.fb.group({
      name: ['', Validators.required],
      totalDuration: ['00:10:00', Validators.required],
      points: this.fb.array([])
    });
  }

  get pointsArray() { return this.shakeForm.get('points') as FormArray; }

  formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  
  // Helpers
  private timeToSeconds(timeStr: string): number {
      const parts = timeStr.split(':').map(Number);
      if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
      if (parts.length === 2) return parts[0]*60 + parts[1];
      return 0;
  }
  
  private secondsToTime(seconds: number): string {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  }

  openAddModal() {
    this.editingId.set(null);
    this.shakeForm.reset({ name: '', totalDuration: '00:10:00' });
    this.pointsArray.clear();
    this.addPoint(); // Default one
    this.showModal.set(true);
  }

  editAlarm(alarm: ShakeAlarmConfig) {
      this.editingId.set(alarm.id);
      this.shakeForm.patchValue({
          name: alarm.name,
          totalDuration: this.secondsToTime(alarm.totalDuration)
      });
      this.pointsArray.clear();
      alarm.shakePoints.forEach(p => {
          this.pointsArray.push(this.fb.control(this.secondsToTime(p)));
      });
      this.showModal.set(true);
  }

  addPoint() {
      this.pointsArray.push(this.fb.control('00:01:00'));
  }

  removePoint(idx: number) {
      this.pointsArray.removeAt(idx);
  }

  closeModal() { this.showModal.set(false); }

  saveAlarm() {
      if (this.shakeForm.invalid) return;
      const val = this.shakeForm.value;
      
      const config: ShakeAlarmConfig = {
          id: this.editingId() || crypto.randomUUID(),
          name: val.name,
          totalDuration: this.timeToSeconds(val.totalDuration),
          shakePoints: (val.points as string[]).map(p => this.timeToSeconds(p))
      };
      
      if (this.editingId()) this.service.updateAlarm(config);
      else this.service.addAlarm(config);
      
      this.closeModal();
  }

  confirmDelete(id: string) { this.deleteId.set(id); }
  cancelDelete() { this.deleteId.set(null); }
  doDelete() {
      if (this.deleteId()) this.service.deleteAlarm(this.deleteId()!);
      this.deleteId.set(null);
  }
}