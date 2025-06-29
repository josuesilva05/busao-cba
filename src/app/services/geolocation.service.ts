import { Injectable } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { BehaviorSubject, Observable } from 'rxjs';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  private currentLocationSubject = new BehaviorSubject<LocationData | null>(null);
  public currentLocation$ = this.currentLocationSubject.asObservable();
  
  private watchId?: string;
  private isWatching = false;

  constructor() {}

  async requestPermissions(): Promise<boolean> {
    try {
      const permission = await Geolocation.requestPermissions();
      return permission.location === 'granted';
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  async getCurrentPosition(): Promise<LocationData | null> {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      const locationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      };

      this.currentLocationSubject.next(locationData);
      return locationData;
    } catch (error) {
      console.error('Error getting current position:', error);
      return null;
    }
  }

  async startWatching(): Promise<void> {
    if (this.isWatching) {
      return;
    }

    try {
      this.watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000
        },
        (position: Position | null, err) => {
          if (err) {
            console.error('Error watching position:', err);
            return;
          }

          if (position) {
            const locationData: LocationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp
            };

            this.currentLocationSubject.next(locationData);
          }
        }
      );

      this.isWatching = true;
    } catch (error) {
      console.error('Error starting location watch:', error);
    }
  }

  async stopWatching(): Promise<void> {
    if (this.watchId) {
      await Geolocation.clearWatch({ id: this.watchId });
      this.watchId = undefined;
      this.isWatching = false;
    }
  }

  get isCurrentlyWatching(): boolean {
    return this.isWatching;
  }
}
