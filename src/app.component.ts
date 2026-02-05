import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlarmComponent } from './components/alarm.component';
import { GroupTimerComponent } from './components/group-timer.component';
import { LoopTimerComponent } from './components/loop-timer.component';
import { ShakeAlarmComponent } from './components/shake-alarm.component';
import { AlarmTaskOverlayComponent } from './components/alarm-task-overlay.component';
import { TimeService, LoopTimerConfig, AlarmConfig } from './services/time.service';
import { ShakeAlarmService, ShakeRuntime } from './services/shake-alarm.service';
import { LocalizationService } from './services/localization.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AlarmComponent, GroupTimerComponent, LoopTimerComponent, ShakeAlarmComponent, AlarmTaskOverlayComponent],
  template: `
    <div class="flex flex-col md:flex-row h-screen w-full bg-white dark:bg-[#1C1C1C] overflow-hidden relative font-sans text-td-text-primary dark:text-td-dark-text" (click)="unlockAudio()">
      
      <!-- Desktop Sidebar -->
      <aside class="hidden md:flex flex-col w-64 bg-white dark:bg-[#1C1C1C] border-r border-gray-100 dark:border-gray-800 z-20">
          <div class="p-6">
              <h1 class="text-2xl font-bold text-td-brand flex items-center gap-2 tracking-tight">
                 <!-- Brand Icon -->
                 <div class="w-9 h-9 relative group">
                    <svg viewBox="0 0 512 512" fill="none" class="w-full h-full drop-shadow-sm transition-transform group-hover:scale-105">
                        <defs>
                          <linearGradient id="brand_grad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
                            <stop offset="0" stop-color="#69b1ff"/>
                            <stop offset="1" stop-color="#1677ff"/>
                          </linearGradient>
                        </defs>
                        <rect width="512" height="512" rx="120" fill="url(#brand_grad)"/>
                        <circle cx="256" cy="256" r="160" stroke="white" stroke-opacity="0.25" stroke-width="40"/>
                        <path d="M256 96 A160 160 0 0 1 416 256" stroke="white" stroke-width="40" stroke-linecap="round"/>
                        <line x1="256" y1="256" x2="256" y2="166" stroke="white" stroke-width="42" stroke-linecap="round"/>
                        <line x1="256" y1="256" x2="336" y2="336" stroke="white" stroke-width="42" stroke-linecap="round"/>
                        <circle cx="256" cy="256" r="24" fill="white"/>
                    </svg>
                 </div>
                 ArcoTime
              </h1>
          </div>
          <nav class="flex-1 px-4 space-y-2 py-4">
              <button (click)="activeTab = 'loop'" 
                      class="w-full flex items-center gap-3 px-4 py-3 rounded-ant transition-colors text-left font-medium"
                      [class.bg-td-brand]="activeTab === 'loop'" 
                      [class.text-white]="activeTab === 'loop'"
                      [class.text-gray-600]="activeTab !== 'loop'"
                      [class.dark:text-gray-400]="activeTab !== 'loop'"
                      [class.hover:bg-gray-50]="activeTab !== 'loop'"
                      [class.dark:hover:bg-white/5]="activeTab !== 'loop'">
                 <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                 {{ ls.t().loops }}
              </button>

              <button (click)="activeTab = 'group'" 
                      class="w-full flex items-center gap-3 px-4 py-3 rounded-ant transition-colors text-left font-medium"
                      [class.bg-td-brand]="activeTab === 'group'" 
                      [class.text-white]="activeTab === 'group'"
                      [class.text-gray-600]="activeTab !== 'group'"
                      [class.dark:text-gray-400]="activeTab !== 'group'"
                      [class.hover:bg-gray-50]="activeTab !== 'group'"
                      [class.dark:hover:bg-white/5]="activeTab !== 'group'">
                 <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 7v5M12 8l-5-4M12 8l5-4M12 12l-5 7M12 12l5 7" /></svg>
                 {{ ls.t().groupTimer }}
              </button>

              <button (click)="activeTab = 'alarm'" 
                      class="w-full flex items-center gap-3 px-4 py-3 rounded-ant transition-colors text-left font-medium"
                      [class.bg-td-brand]="activeTab === 'alarm'" 
                      [class.text-white]="activeTab === 'alarm'"
                      [class.text-gray-600]="activeTab !== 'alarm'"
                      [class.dark:text-gray-400]="activeTab !== 'alarm'"
                      [class.hover:bg-gray-50]="activeTab !== 'alarm'"
                      [class.dark:hover:bg-white/5]="activeTab !== 'alarm'">
                 <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="13" r="8" stroke-width="2"></circle><polyline points="12 9 12 13 15 14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline><line x1="5" y1="2" x2="9" y2="6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></line><line x1="19" y1="2" x2="15" y2="6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></line></svg>
                 {{ ls.t().alarms }}
              </button>

              <button (click)="activeTab = 'shake'" 
                      class="w-full flex items-center gap-3 px-4 py-3 rounded-ant transition-colors text-left font-medium"
                      [class.bg-td-brand]="activeTab === 'shake'" 
                      [class.text-white]="activeTab === 'shake'"
                      [class.text-gray-600]="activeTab !== 'shake'"
                      [class.dark:text-gray-400]="activeTab !== 'shake'"
                      [class.hover:bg-gray-50]="activeTab !== 'shake'"
                      [class.dark:hover:bg-white/5]="activeTab !== 'shake'">
                 <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10a4 4 0 014-4h10a4 4 0 014 4v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 18v2m10-2v2"/></svg>
                 {{ ls.t().shakeAlarm }}
              </button>
          </nav>
      </aside>

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col h-full overflow-hidden bg-[#f5f5f5] dark:bg-td-dark-bg relative">
        <div class="flex-1 overflow-hidden relative">
          @switch (activeTab) {
            @case ('loop') { <app-loop-timer /> }
            @case ('alarm') { <app-alarm /> }
            @case ('group') { <app-group-timer /> }
            @case ('shake') { <app-shake-alarm /> }
          }
        </div>

        <!-- Mobile Bottom Tab Bar -->
        <div class="md:hidden bg-white dark:bg-[#1C1C1C] border-t border-gray-100 dark:border-gray-800 pb-safe pt-1 flex justify-between items-center h-[56px] shadow-sm z-20 shrink-0">
          
          <button (click)="activeTab = 'loop'" 
                  class="flex-1 h-full flex flex-col items-center justify-center relative transition-colors group"
                  [class.text-td-brand]="activeTab === 'loop'" 
                  [class.text-gray-400]="activeTab !== 'loop'">
            <svg class="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            <span class="text-[10px] font-medium">{{ ls.t().loops }}</span>
          </button>

          <button (click)="activeTab = 'group'" 
                  class="flex-1 h-full flex flex-col items-center justify-center relative transition-colors group"
                  [class.text-td-brand]="activeTab === 'group'" 
                  [class.text-gray-400]="activeTab !== 'group'">
            <svg class="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 7v5M12 8l-5-4M12 8l5-4M12 12l-5 7M12 12l5 7" />
            </svg>
            <span class="text-[10px] font-medium">{{ ls.t().groupTimer }}</span>
          </button>

          <button (click)="activeTab = 'alarm'" 
                  class="flex-1 h-full flex flex-col items-center justify-center relative transition-colors group"
                  [class.text-td-brand]="activeTab === 'alarm'" 
                  [class.text-gray-400]="activeTab !== 'alarm'">
            <svg class="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="13" r="8" stroke-width="2"></circle>
              <polyline points="12 9 12 13 15 14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline>
              <line x1="5" y1="2" x2="9" y2="6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></line>
              <line x1="19" y1="2" x2="15" y2="6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></line>
            </svg>
            <span class="text-[10px] font-medium">{{ ls.t().alarms }}</span>
          </button>
          
          <button (click)="activeTab = 'shake'" 
                  class="flex-1 h-full flex flex-col items-center justify-center relative transition-colors group"
                  [class.text-td-brand]="activeTab === 'shake'" 
                  [class.text-gray-400]="activeTab !== 'shake'">
            <svg class="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10a4 4 0 014-4h10a4 4 0 014 4v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 18v2m10-2v2"/>
            </svg>
            <span class="text-[10px] font-medium">{{ ls.t().shakeAlarm }}</span>
          </button>

        </div>
      </div>

      <!-- Ringing Logic (Overlays) -->
      
      <!-- 1. Shake Alarm Overlay -->
      @if (shakeService.ringingAlarm(); as ringingState) {
         <div class="fixed inset-0 z-[10001] bg-yellow-500 flex flex-col items-center justify-center animate-pulse p-8">
             <svg class="w-20 h-20 text-white mb-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
             </svg>
             
             <!-- Unified Large Font Header -->
             <div class="text-white/95 font-bold uppercase tracking-widest mb-8 flex flex-col items-center gap-4">
                <span class="text-4xl text-center leading-tight drop-shadow-md">{{ ringingState.config.name }}</span>
                <span class="text-4xl font-black bg-white/25 px-6 py-2 rounded-2xl backdrop-blur-sm shadow-sm border border-white/20">#{{ ringingState.runIndex }}</span>
             </div>

             <!-- Only show text when finished -->
             @if (ringingState.remainingTime <= 0) {
                 <div class="text-white text-4xl font-bold mb-4 text-center leading-tight">
                     {{ ls.t().shakeFinished }}
                 </div>
             }
             
             @if (ringingState.remainingTime > 0) {
               <div class="text-white/90 text-3xl font-mono font-bold mb-12 bg-white/20 px-6 py-2 rounded-full border border-white/30 backdrop-blur-sm">
                  {{ getShakePointTime(ringingState) }}
               </div>
             } @else {
               <div class="mb-8"></div>
             }

             <button (click)="shakeService.confirmShake(ringingState.instanceId)" 
                     class="bg-white text-yellow-600 px-10 py-5 rounded-full font-bold text-xl shadow-2xl hover:scale-105 transition-transform">
               @if (ringingState.remainingTime <= 0) {
                   {{ ls.t().finish }}
               } @else {
                   {{ ls.t().completeShake }}
               }
             </button>
         </div>
      }

      <!-- 2. Standard Alarm Logic -->
      @else if (isRinging()) {
        
        <!-- Case A: Conditional Alarm with Tasks -->
        @if (hasActiveStandardAlarmWithTasks(); as activeAlarm) {
           <app-alarm-task-overlay 
              [alarm]="activeAlarm" 
              (completed)="stopStandardAlarm(activeAlarm.id)">
           </app-alarm-task-overlay>
        } 
        
        <!-- Case B: Standard Overlay -->
        @else {
          <div class="fixed inset-0 z-[9999] bg-td-brand flex flex-col items-center justify-center animate-pulse p-8">
             <svg class="w-16 h-16 text-white mb-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
             
             @if (timeService.activeStandardAlarms().length > 0) {
                <div class="text-white/80 text-sm font-bold uppercase tracking-widest mb-2">{{ ls.t().alarms }}</div>
                <div class="text-white text-3xl font-bold mb-12 text-center leading-tight">
                   {{ getStandardAlarmLabel(timeService.activeStandardAlarms()[0]) }}
                </div>
                <div class="flex flex-col gap-4 w-full max-w-xs">
                   <button (click)="stopStandardAlarm(timeService.activeStandardAlarms()[0])" 
                           class="bg-white text-td-brand px-8 py-4 rounded-full font-bold text-xl shadow-2xl hover:scale-105 transition-transform">
                     {{ ls.t().stopAlarm }}
                   </button>
                </div>

             } @else if (timeService.activeLoopAlarms().length > 0) {
               @let activeLoopAlarm = getLoopAlarm(timeService.activeLoopAlarms()[0]);
               @if (activeLoopAlarm) {
                 <div class="text-white/80 text-sm font-bold uppercase tracking-widest mb-2">Loop Alarm #{{ activeLoopAlarm.timesFired }}</div>
                 <div class="text-white text-3xl font-bold mb-12 text-center leading-tight">
                   {{ activeLoopAlarm.name }}
                 </div>
                 <button (click)="stopLoopAlarm(activeLoopAlarm.id)" 
                         class="bg-white text-td-brand px-12 py-4 rounded-full font-bold text-xl shadow-2xl hover:scale-105 transition-transform">
                   {{ ls.t().stopAlarm }}
                 </button>
               }
             }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .pb-safe { padding-bottom: env(safe-area-inset-bottom, 12px); }
  `]
})
export class AppComponent {
  activeTab = 'loop'; 
  timeService = inject(TimeService);
  shakeService = inject(ShakeAlarmService);
  ls = inject(LocalizationService);

  unlockAudio() { 
    this.timeService.initAudio(); 
    this.shakeService.initAudio();
  }

  isRinging() {
      return this.timeService.activeLoopAlarms().length > 0 || 
             this.timeService.activeStandardAlarms().length > 0;
  }

  hasActiveStandardAlarmWithTasks(): AlarmConfig | null {
      const activeIds = this.timeService.activeStandardAlarms();
      if (activeIds.length === 0) return null;
      
      const alarm = this.timeService.alarms().find(a => a.id === activeIds[0]);
      if (alarm && alarm.tasks && alarm.tasks.length > 0) {
          return alarm;
      }
      return null;
  }

  getLoopAlarm(id: string): LoopTimerConfig | undefined {
    return this.timeService.loopTimers().find(t => t.id === id);
  }

  getStandardAlarmLabel(id: string): string {
      const alarm = this.timeService.alarms().find(a => a.id === id);
      return alarm ? (alarm.label || 'Conditional Alarm') : 'Conditional Alarm';
  }

  stopLoopAlarm(id: string) { this.timeService.stopAlarm(id); }
  stopStandardAlarm(id: string) { this.timeService.stopAlarm(id); }

  getShakePointTime(state: ShakeRuntime | null): string {
    if (!state) return '';
    const idx = state.nextPointIndex - 1;
    if (idx >= 0 && idx < state.config.shakePoints.length) {
       const seconds = state.config.shakePoints[idx];
       const h = Math.floor(seconds / 3600);
       const m = Math.floor((seconds % 3600) / 60);
       const s = Math.floor(seconds % 60);
       if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
       return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return '';
  }
}