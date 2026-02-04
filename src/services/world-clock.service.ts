import { Injectable, signal, effect } from '@angular/core';

export interface CityConfig {
  id: string;
  name: string;
  offset: number;
}

@Injectable({
  providedIn: 'root'
})
export class WorldClockService {
  cities = signal<CityConfig[]>([]);

  // Predefined list for adding
  availableCities: CityConfig[] = [
    { id: 'london', name: 'London', offset: 1 },
    { id: 'paris', name: 'Paris', offset: 2 },
    { id: 'moscow', name: 'Moscow', offset: 3 },
    { id: 'dubai', name: 'Dubai', offset: 4 },
    { id: 'mumbai', name: 'Mumbai', offset: 5.5 },
    { id: 'bangkok', name: 'Bangkok', offset: 7 },
    { id: 'shanghai', name: 'Shanghai', offset: 8 },
    { id: 'tokyo', name: 'Tokyo', offset: 9 },
    { id: 'sydney', name: 'Sydney', offset: 11 },
    { id: 'newyork', name: 'New York', offset: -4 },
    { id: 'losangeles', name: 'Los Angeles', offset: -7 },
    { id: 'chicago', name: 'Chicago', offset: -5 },
    { id: 'toronto', name: 'Toronto', offset: -4 },
    { id: 'saopaulo', name: 'Sao Paulo', offset: -3 }
  ];

  constructor() {
    const saved = localStorage.getItem('worldClockCities');
    if (saved) {
      try {
        this.cities.set(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Defaults
      this.cities.set([
        { id: 'shanghai', name: 'Shanghai', offset: 8 },
        { id: 'newyork', name: 'New York', offset: -4 },
        { id: 'london', name: 'London', offset: 1 },
        { id: 'tokyo', name: 'Tokyo', offset: 9 }
      ]);
    }

    effect(() => {
      localStorage.setItem('worldClockCities', JSON.stringify(this.cities()));
    });
  }

  addCity(city: CityConfig) {
    if (!this.cities().find(c => c.id === city.id)) {
      this.cities.update(list => [...list, city]);
    }
  }

  removeCity(id: string) {
    this.cities.update(list => list.filter(c => c.id !== id));
  }
}