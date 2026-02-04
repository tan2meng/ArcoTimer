import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimeService } from '../services/time.service';
import { WorldClockService, CityConfig } from '../services/world-clock.service';
import { LocalizationService } from '../services/localization.service';

@Component({
  selector: 'app-world-clock',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col relative bg-[#f5f5f5] dark:bg-td-dark-bg text-td-text-primary dark:text-td-dark-text transition-colors">
      <!-- Ant Design Header -->
      <div class="flex justify-between items-center px-5 py-4 bg-white dark:bg-[#1C1C1C] shadow-sm z-10 border-b border-gray-100 dark:border-gray-800">
        <h1 class="text-xl font-bold">{{ ls.t().worldClock }}</h1>
        <button (click)="toggleLanguage()" class="ant-btn ant-btn-icon rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
           <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
           </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4 pb-24 no-scrollbar">
        
        <!-- Current Location Card -->
        <div class="bg-white dark:bg-[#1C1C1C] rounded-ant border border-gray-100 dark:border-gray-800 p-6 shadow-ant">
          <div class="text-td-brand dark:text-td-dark-brand text-xs font-bold uppercase mb-2 tracking-wide">
            {{ ls.t().currentLocation }}
          </div>
          <div class="flex justify-between items-end">
            <div>
               <div class="text-5xl font-semibold tracking-tight text-td-text-primary dark:text-td-dark-text leading-none">
                {{ formattedTime() }}
               </div>
               <div class="text-sm text-td-text-secondary dark:text-gray-400 mt-2">
                {{ currentDate() }}
               </div>
            </div>
          </div>
        </div>

        <!-- Cities List -->
        <div class="grid gap-4">
           @for (city of wcService.cities(); track city.id) {
             <div class="bg-white dark:bg-[#1C1C1C] p-5 rounded-ant border border-gray-100 dark:border-gray-800 shadow-ant flex justify-between items-center group transition-colors hover:border-td-brand/30">
                <div>
                  <div class="text-xs text-td-text-secondary dark:text-gray-400 mb-1 font-medium">{{ getLabel(city.offset) }}</div>
                  <div class="text-lg font-semibold text-td-text-primary dark:text-td-dark-text">{{ city.name }}</div>
                </div>
                <div class="flex items-center gap-4">
                  <span class="text-3xl font-light text-td-text-primary dark:text-td-dark-text">
                     {{ getOffsetTime(city.offset) }}
                  </span>
                  <button (click)="confirmDelete(city.id)" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-white hover:bg-red-500 hover:text-white transition-all shadow-sm">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
             </div>
           }
        </div>
      </div>

      <!-- FAB: Add -->
      <div class="absolute bottom-6 right-6 z-20">
         <button (click)="showAddModal.set(true)" 
                 class="w-14 h-14 rounded-full bg-td-brand text-white shadow-lg shadow-blue-500/30 flex items-center justify-center hover:bg-td-brandHover transition-all active:scale-95">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
         </button>
      </div>

      <!-- Modal -->
      @if (showAddModal()) {
        <div class="absolute inset-0 bg-black/45 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]" (click)="showAddModal.set(false)">
          <div class="bg-white dark:bg-[#1C1C1C] w-full max-w-sm rounded-ant-lg shadow-2xl overflow-hidden transform transition-all scale-100" (click)="$event.stopPropagation()">
            <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#141414]">
               <h3 class="text-base font-semibold text-td-text-primary dark:text-td-dark-text">{{ ls.t().addZone }}</h3>
               <button (click)="showAddModal.set(false)" class="text-td-text-secondary hover:text-td-text-primary dark:text-gray-400 dark:hover:text-white">
                 <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
               </button>
            </div>
            
            <div class="max-h-80 overflow-y-auto p-2">
              @for (city of wcService.availableCities; track city.id) {
                 @if (!isCityAdded(city.id)) {
                   <button (click)="addCity(city)" class="w-full text-left px-4 py-3 rounded-ant-sm hover:bg-td-brand/5 dark:hover:bg-white/5 flex justify-between items-center transition-colors group">
                     <span class="text-sm font-medium text-td-text-primary dark:text-td-dark-text group-hover:text-td-brand">{{ city.name }}</span>
                     <span class="text-xs text-td-text-secondary bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded">UTC {{ city.offset >= 0 ? '+' : '' }}{{ city.offset }}</span>
                   </button>
                 }
              }
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
export class WorldClockComponent {
  private timeService = inject(TimeService);
  wcService = inject(WorldClockService);
  ls = inject(LocalizationService);

  showAddModal = signal(false);
  deleteId = signal<string | null>(null);

  formattedTime = computed(() => {
    return this.timeService.now().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  });

  currentDate = computed(() => {
    const locale = this.ls.currentLang() === 'en' ? 'en-US' : 'zh-CN';
    return this.timeService.now().toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });
  });

  getOffsetTime(offset: number) {
    const now = this.timeService.now();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const newDate = new Date(utc + (3600000 * offset));
    return newDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  getLabel(offset: number) {
    return this.ls.t().today + `, ${offset >= 0 ? '+' : ''}${offset} ${this.ls.t().hrs}`;
  }

  toggleLanguage() {
    this.ls.toggleLang();
  }

  isCityAdded(id: string) {
    return this.wcService.cities().some(c => c.id === id);
  }

  addCity(city: CityConfig) {
    this.wcService.addCity(city);
    this.showAddModal.set(false);
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
      this.wcService.removeCity(id);
    }
    this.deleteId.set(null);
  }
}