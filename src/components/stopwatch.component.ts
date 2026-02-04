import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StopwatchService } from '../services/stopwatch.service';
import { LocalizationService } from '../services/localization.service';

@Component({
  selector: 'app-stopwatch',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col bg-[#f5f5f5] dark:bg-td-dark-bg text-td-text-primary dark:text-td-dark-text">
      <!-- Header -->
      <div class="flex-none flex justify-between items-center px-5 py-4 bg-white dark:bg-[#1C1C1C] shadow-sm z-10 border-b border-gray-100 dark:border-gray-800">
        <h1 class="text-xl font-bold">{{ ls.t().stopwatch }}</h1>
        <button (click)="ls.toggleLang()" class="ant-btn ant-btn-icon rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
           <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
           </svg>
        </button>
      </div>

      <!-- Display (Flex-1) -->
      <div class="flex-1 flex justify-center items-center py-6"
           [class.border-b]="service.laps().length > 0"
           [class.border-gray-100]="service.laps().length > 0"
           [class.dark:border-gray-800]="service.laps().length > 0">
        <div class="text-7xl font-mono tabular-nums tracking-tighter text-td-text-primary dark:text-td-dark-text">
          {{ formattedTime() }}
        </div>
      </div>

      <!-- Laps List -->
      <div class="h-[30%] overflow-y-auto bg-white dark:bg-transparent no-scrollbar"
           [class.border-t]="service.laps().length > 0"
           [class.border-gray-100]="service.laps().length > 0"
           [class.dark:border-gray-800]="service.laps().length > 0">
        <div class="divide-y divide-gray-100 dark:divide-gray-800">
          @for (lap of service.laps(); track $index) {
            <div class="flex justify-between px-6 py-3 text-td-text-secondary dark:text-gray-400 font-mono text-base">
              <span>{{ ls.t().lap }} {{ service.laps().length - $index }}</span>
              <span class="text-td-text-primary dark:text-td-dark-text">{{ formatMs(lap) }}</span>
            </div>
          }
        </div>
      </div>

      <!-- Controls Wrapper (Fixed Bottom, aligned with Timer) -->
      <!-- Timer has padding: p-6 pb-8. Buttons are w-20 h-20. -->
      <div class="flex-none p-6 pb-8 flex justify-between items-center px-12 bg-[#f5f5f5] dark:bg-td-dark-bg z-20">
          <!-- Left Button (Lap/Reset) -->
          @if (service.isRunning()) {
            <button (click)="service.lap()" class="w-20 h-20 rounded-full bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 text-td-text-primary dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-all shadow-sm">
              {{ ls.t().lap }}
            </button>
          } @else {
            <button (click)="service.reset()" class="w-20 h-20 rounded-full bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 text-td-text-primary dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-all shadow-sm">
              {{ ls.t().reset }}
            </button>
          }

          <!-- Right Button (Start/Stop) -->
          @if (!service.isRunning()) {
            <button (click)="service.start()" class="w-20 h-20 rounded-full bg-td-success/10 text-td-success border border-td-success/20 font-medium hover:bg-td-success/20 transition-all">
              {{ ls.t().start }}
            </button>
          } @else {
            <button (click)="service.stop()" class="w-20 h-20 rounded-full bg-td-error/10 text-td-error border border-td-error/20 font-medium hover:bg-td-error/20 transition-all">
              {{ ls.t().stop }}
            </button>
          }
      </div>

    </div>
  `
})
export class StopwatchComponent {
  service = inject(StopwatchService);
  ls = inject(LocalizationService);

  formattedTime = computed(() => this.formatMs(this.service.time()));

  formatMs(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centis = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
  }
}