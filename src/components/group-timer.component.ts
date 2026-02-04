import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup } from '@angular/forms';
import { GroupTimerService, GroupTimerConfig, SingleInterval } from '../services/group-timer.service';
import { LocalizationService } from '../services/localization.service';

@Component({
  selector: 'app-group-timer',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="h-full flex flex-col bg-[#f5f5f5] dark:bg-td-dark-bg text-td-text-primary dark:text-td-dark-text relative font-sans">
      
      <!-- Header -->
      <div class="flex-none flex justify-between items-center px-5 py-4 bg-white dark:bg-[#1C1C1C] shadow-sm z-10 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <h1 class="text-xl font-bold">{{ ls.t().groupTimer }}</h1>
        <button (click)="ls.toggleLang()" class="ant-btn ant-btn-icon rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
           <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
           </svg>
        </button>
      </div>

      <!-- Main Content -->
      <div class="flex-1 overflow-hidden relative">
        
        <!-- RUNNING MODE -->
        @if (service.activeState(); as state) {
          <div class="absolute inset-0 z-20 flex flex-col bg-[#f5f5f5] dark:bg-td-dark-bg transition-colors duration-300">
             
             <!-- Top Info -->
             <div class="p-6 text-center">
                @let activeGroup = getGroup(state.groupId);
                <h2 class="text-lg font-semibold mb-2 text-td-text-primary dark:text-td-dark-text">{{ activeGroup?.name }}</h2>
                <div class="text-sm font-mono bg-gray-200 dark:bg-white/10 px-3 py-1 rounded-full text-td-text-secondary dark:text-gray-300 inline-block">
                   Set {{ state.intervalIndex + 1 }} / {{ state.totalSets }}
                </div>
             </div>

             <!-- Main Circle / Timer -->
             <div class="flex-1 flex flex-col items-center justify-center relative">
                <!-- Visual Phase Indicator Circle -->
                <div class="relative w-72 h-72 flex items-center justify-center">
                     <!-- SVG Countdown -->
                     <svg class="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                        <!-- Track -->
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" class="text-gray-200 dark:text-gray-700" stroke-width="6" />
                        <!-- Progress -->
                        <!-- Circumference ~ 283 -->
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="6"
                                stroke-linecap="round"
                                [attr.stroke-dasharray]="283"
                                [attr.stroke-dashoffset]="getDashOffset(state.remainingTime, state.totalPhaseDuration)"
                                [style.transition]="state.remainingTime === state.totalPhaseDuration ? 'none' : 'stroke-dashoffset 1s linear'"
                                class="shadow-sm"
                                [class.text-yellow-500]="state.phase === 'prep'"
                                [class.text-td-brand]="state.phase === 'work'"
                                [class.text-green-500]="state.phase === 'post'" />
                     </svg>

                     <!-- Text Content -->
                     <div class="text-center z-10">
                        <div class="text-7xl font-mono font-bold tabular-nums tracking-tighter mb-2 leading-none text-td-text-primary dark:text-td-dark-text">
                          {{ formatTime(state.remainingTime) }}
                        </div>
                        <div class="uppercase tracking-widest font-bold text-3xl opacity-90 transition-colors"
                             [class.text-yellow-500]="state.phase === 'prep'"
                             [class.text-td-brand]="state.phase === 'work'"
                             [class.text-green-500]="state.phase === 'post'">
                           @switch(state.phase) {
                             @case('prep') { {{ ls.t().prep }} }
                             @case('work') { {{ ls.t().work }} }
                             @case('post') { {{ ls.t().post }} }
                           }
                        </div>
                     </div>
                </div>
             </div>

             <!-- Up Next (Removed borders) -->
             <div class="h-28 flex items-center justify-center">
                 @let nextInfo = getNextInfo(state);
                 @if (nextInfo) {
                    <div class="flex flex-col items-center">
                       <span class="uppercase text-xs font-bold tracking-widest mb-1 text-td-text-secondary dark:text-gray-500">{{ ls.t().next }}</span>
                       <span class="font-bold text-2xl tracking-tight text-td-text-primary dark:text-td-dark-text">{{ nextInfo }}</span>
                    </div>
                 } @else {
                    <div class="text-td-brand font-bold text-2xl opacity-90">{{ ls.t().completed }}</div>
                 }
             </div>

             <!-- Controls (Matches page background) -->
             <div class="p-8 pb-12 flex justify-center items-center gap-10">
                <!-- Reset -->
                <button (click)="service.reset()" class="w-16 h-16 rounded-full bg-white dark:bg-[#2a2a2a] text-td-text-secondary dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#333] transition-all flex items-center justify-center shadow-md border border-gray-200 dark:border-gray-700">
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
                </button>

                <!-- Play/Pause -->
                <button (click)="service.togglePause()" 
                        class="w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 hover:scale-105"
                        [class.bg-td-brand]="state.phase === 'work'"
                        [class.bg-yellow-500]="state.phase === 'prep'"
                        [class.bg-green-500]="state.phase === 'post'"
                        [class.text-white]="true">
                   @if (state.isRunning) {
                     <svg class="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                   } @else {
                     <svg class="w-10 h-10 translate-x-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                   }
                </button>

                <!-- Skip -->
                <button (click)="service.skipPhase()" class="w-16 h-16 rounded-full bg-white dark:bg-[#2a2a2a] text-td-text-secondary dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#333] transition-all flex items-center justify-center shadow-md border border-gray-200 dark:border-gray-700">
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>
                </button>
             </div>
          </div>
        }

        <!-- LIST MODE -->
        <div class="h-full overflow-y-auto p-4 pb-24 md:pb-6 no-scrollbar">
           @if (service.groups().length === 0) {
              <div class="flex flex-col items-center justify-center h-full text-td-text-secondary dark:text-gray-400">
                <svg class="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <circle cx="12" cy="5" r="2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 7v5M12 8l-5-4M12 8l5-4M12 12l-5 7M12 12l5 7" />
                </svg>
                <p>{{ ls.t().noGroups }}</p>
              </div>
           }

           <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
             @for (group of service.groups(); track group.id) {
               <div class="bg-white dark:bg-[#1C1C1C] p-5 rounded-ant shadow-ant flex flex-col border border-gray-100 dark:border-gray-800 relative h-full min-h-[160px]">
                  <div class="flex justify-between items-start mb-4">
                     <div>
                        <h3 class="font-bold text-lg text-td-text-primary dark:text-td-dark-text truncate max-w-[150px]">{{ group.name }}</h3>
                        <div class="text-xs text-td-text-secondary dark:text-gray-400 mt-1">
                           {{ group.intervals.length }} {{ ls.t().totalSets }} • {{ getTotalDuration(group) }}
                        </div>
                     </div>
                     <div class="flex gap-2 shrink-0">
                        <button (click)="editGroup(group)" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 dark:bg-white/5 text-gray-500 hover:bg-td-brand hover:text-white transition-colors">
                           <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button (click)="confirmDelete(group.id)" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 dark:bg-white/5 text-gray-500 hover:bg-red-500 hover:text-white transition-colors">
                           <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                     </div>
                  </div>

                  <!-- Preview of first few intervals -->
                  <div class="space-y-2 mb-4 flex-1">
                     @for (int of group.intervals.slice(0, 3); track int.id) {
                        <div class="flex items-center text-xs text-td-text-secondary dark:text-gray-400 bg-gray-50 dark:bg-[#141414] rounded px-2 py-1.5">
                           <span class="w-6 font-bold text-gray-300">#{{ $index + 1 }}</span>
                           <span class="flex-1 font-medium truncate ml-2">{{ int.name }}</span>
                           <div class="flex gap-3 ml-2 font-mono">
                              @if (int.prepDuration > 0) { <span class="text-yellow-600 dark:text-yellow-500">P:{{ int.prepDuration }}</span> }
                              <span class="text-td-brand">W:{{ int.workDuration }}</span>
                              @if (int.postDuration > 0) { <span class="text-green-600 dark:text-green-500">R:{{ int.postDuration }}</span> }
                           </div>
                        </div>
                     }
                     @if (group.intervals.length > 3) {
                        <div class="text-center text-xs text-gray-400">... {{ group.intervals.length - 3 }} more ...</div>
                     }
                  </div>

                  <button (click)="service.startGroup(group.id)" class="w-full py-2 bg-td-brand/10 text-td-brand font-bold rounded-ant hover:bg-td-brand hover:text-white transition-all flex items-center justify-center gap-2 mt-auto">
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

      </div>

      <!-- Add/Edit Modal (Unchanged) -->
      @if (showModal()) {
        <div class="absolute inset-0 bg-black/45 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]" (click)="closeModal()">
          <div class="bg-white dark:bg-[#1C1C1C] rounded-ant-lg w-full max-w-sm h-[85vh] flex flex-col shadow-2xl" (click)="$event.stopPropagation()">
             
             <!-- Modal Header -->
             <div class="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#141414]">
               <h2 class="text-base font-semibold text-td-text-primary dark:text-td-dark-text">
                 {{ editingId() ? ls.t().edit : ls.t().newGroup }}
               </h2>
               <button (click)="closeModal()" class="text-td-text-secondary hover:text-td-text-primary dark:text-gray-400 dark:hover:text-white">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
               </button>
             </div>

             <!-- Form Content -->
             <div class="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar" [formGroup]="groupForm">
                <div>
                   <label class="block text-sm font-medium text-td-text-secondary dark:text-gray-400 mb-1.5">{{ ls.t().groupName }}</label>
                   <input type="text" formControlName="name" class="ant-input h-9" placeholder="e.g. HIIT Workout">
                </div>

                <!-- Intervals List -->
                <div>
                   <div class="flex justify-between items-center mb-2">
                      <label class="block text-sm font-medium text-td-text-secondary dark:text-gray-400">{{ ls.t().intervals }}</label>
                   </div>
                   
                   <div formArrayName="intervals" class="space-y-4">
                      @for (ctrl of intervalsArray.controls; track $index) {
                         <div [formGroupName]="$index" class="p-4 rounded-ant border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1f1f1f] relative">
                             <!-- Remove Button -->
                             <button type="button" (click)="removeInterval($index)" class="absolute top-2 right-2 text-gray-400 hover:text-red-500">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                             </button>

                             <div class="mb-3 pr-6">
                                <input type="text" formControlName="name" class="bg-transparent border-b border-gray-300 dark:border-gray-600 w-full text-sm focus:outline-none focus:border-td-brand pb-1 text-td-text-primary dark:text-white placeholder-gray-400" placeholder="Activity Name">
                             </div>

                             <div class="grid grid-cols-3 gap-2 text-center">
                                <div>
                                   <label class="text-[10px] uppercase font-bold text-yellow-600 dark:text-yellow-500 block mb-1">{{ ls.t().prep }}</label>
                                   <input type="number" formControlName="prepDuration" class="ant-input h-8 text-center" min="0">
                                </div>
                                <div>
                                   <label class="text-[10px] uppercase font-bold text-td-brand block mb-1">{{ ls.t().work }}</label>
                                   <input type="number" formControlName="workDuration" class="ant-input h-8 text-center" min="1">
                                </div>
                                <div>
                                   <label class="text-[10px] uppercase font-bold text-green-600 dark:text-green-500 block mb-1">{{ ls.t().post }}</label>
                                   <input type="number" formControlName="postDuration" class="ant-input h-8 text-center" min="0">
                                </div>
                             </div>
                         </div>
                      }
                   </div>
                   
                   <button type="button" (click)="addInterval()" class="mt-4 w-full py-2 border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-ant hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-1">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                      {{ ls.t().addInterval }}
                   </button>
                </div>
             </div>

             <!-- Footer -->
             <div class="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1C1C1C]">
                <button (click)="saveGroup()" [disabled]="groupForm.invalid || intervalsArray.length === 0" class="w-full ant-btn ant-btn-primary h-10 text-base font-medium">
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
export class GroupTimerComponent {
  service = inject(GroupTimerService);
  ls = inject(LocalizationService);
  fb = inject(FormBuilder);

  showModal = signal(false);
  deleteId = signal<string | null>(null);
  editingId = signal<string | null>(null);

  groupForm: FormGroup;

  constructor() {
    this.groupForm = this.fb.group({
      name: ['', Validators.required],
      intervals: this.fb.array([])
    });
  }

  get intervalsArray() {
    return this.groupForm.get('intervals') as FormArray;
  }

  getGroup(id: string) {
    return this.service.groups().find(g => g.id === id);
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  getTotalDuration(group: GroupTimerConfig): string {
    const total = group.intervals.reduce((acc, curr) => acc + curr.prepDuration + curr.workDuration + curr.postDuration, 0);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}m ${s}s`;
  }

  getNextInfo(state: any): string | null {
      const group = this.getGroup(state.groupId);
      if (!group) return null;
      
      const currentInt = group.intervals[state.intervalIndex];
      const nextInt = group.intervals[state.intervalIndex + 1];

      if (state.phase === 'prep') return `${lsKeys(this.ls.t(), 'work')} (${currentInt.workDuration}s)`;
      if (state.phase === 'work') return `${lsKeys(this.ls.t(), 'post')} (${currentInt.postDuration}s)`;
      if (state.phase === 'post') {
          return nextInt ? `${nextInt.name}` : null;
      }
      return null;
  }

  getDashOffset(remaining: number, total: number): number {
    if (total <= 0) return 0;
    const percentage = remaining / total;
    // 283 is full circle (approx 2 * PI * 45)
    // offset 0 = full (100%). offset 283 = empty (0%).
    return 283 * (1 - percentage);
  }

  // --- Form ---

  openAddModal() {
    this.editingId.set(null);
    this.groupForm.reset({ name: '' });
    this.intervalsArray.clear();
    // Add one default interval
    this.addInterval();
    this.showModal.set(true);
  }

  editGroup(group: GroupTimerConfig) {
    this.editingId.set(group.id);
    this.groupForm.patchValue({ name: group.name });
    this.intervalsArray.clear();
    group.intervals.forEach(int => {
       this.intervalsArray.push(this.createIntervalGroup(int));
    });
    this.showModal.set(true);
  }

  addInterval() {
    const count = this.intervalsArray.length + 1;
    this.intervalsArray.push(this.createIntervalGroup({
        id: crypto.randomUUID(),
        name: `Set ${count}`,
        prepDuration: 5,
        workDuration: 30,
        postDuration: 10
    }));
  }

  createIntervalGroup(data: any): FormGroup {
    return this.fb.group({
       id: [data.id],
       name: [data.name, Validators.required],
       prepDuration: [data.prepDuration, [Validators.required, Validators.min(0)]],
       workDuration: [data.workDuration, [Validators.required, Validators.min(1)]],
       postDuration: [data.postDuration, [Validators.required, Validators.min(0)]]
    });
  }

  removeInterval(index: number) {
    this.intervalsArray.removeAt(index);
  }

  closeModal() { this.showModal.set(false); }

  saveGroup() {
    if (this.groupForm.invalid) return;
    const val = this.groupForm.value;
    
    const config: GroupTimerConfig = {
       id: this.editingId() || crypto.randomUUID(),
       name: val.name,
       intervals: val.intervals
    };

    if (this.editingId()) {
       this.service.updateGroup(config);
    } else {
       this.service.addGroup(config);
    }
    this.closeModal();
  }

  confirmDelete(id: string) { this.deleteId.set(id); }
  cancelDelete() { this.deleteId.set(null); }
  doDelete() {
    if (this.deleteId()) this.service.deleteGroup(this.deleteId()!);
    this.deleteId.set(null);
  }
}

// Helper to avoid TS error in template access
function lsKeys(dict: any, key: string) { return dict[key]; }