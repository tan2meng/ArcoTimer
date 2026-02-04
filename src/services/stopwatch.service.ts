import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StopwatchService {
  time = signal(0);
  isRunning = signal(false);
  laps = signal<number[]>([]);
  
  private intervalId: any;
  private startTime = 0;
  private accumulatedTime = 0;

  start() {
    if (this.isRunning()) return;
    this.isRunning.set(true);
    this.startTime = Date.now();
    
    // Resume from accumulated if paused
    if (this.time() > 0 && this.accumulatedTime === 0) {
        this.accumulatedTime = this.time();
    }

    this.intervalId = setInterval(() => {
      const now = Date.now();
      this.time.set(this.accumulatedTime + (now - this.startTime));
    }, 10);
  }

  stop() {
    if (!this.isRunning()) return;
    this.isRunning.set(false);
    clearInterval(this.intervalId);
    this.accumulatedTime = this.time();
  }

  reset() {
    this.stop();
    this.time.set(0);
    this.accumulatedTime = 0;
    this.laps.set([]);
  }

  lap() {
    this.laps.update(l => [this.time(), ...l]);
  }
}