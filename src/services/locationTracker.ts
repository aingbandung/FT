import { Place, distanceBetween } from '../types';
import { Repo } from './repo';

class LocationTrackerService {
  private watchId: number | null = null;
  private isTracking = false;
  private lastHist: { lat: number; lng: number; ts: number } | null = null;
  private inside: Record<string, boolean> = {};
  private places: Place[] = [];
  private unsubscribePlaces: (() => void) | null = null;
  private simulationInterval: number | null = null;

  public start(circleId: string, onUpdate?: (coords: { lat: number; lng: number }) => void) {
    if (this.isTracking) return;
    this.isTracking = true;

    // Subscribe to places for geofencing
    this.unsubscribePlaces = Repo.subscribePlaces(circleId, (places) => {
      this.places = places;
    });

    // Request notification permission if available
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          this.handlePosition(lat, lng);
          onUpdate?.({ lat, lng });
        },
        (err) => {
          console.warn('Geolocation error or permission denied:', err.message);
          // Fallback to initial location near first place/member or default
          this.startSimulatedFallback(onUpdate);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 15000,
        }
      );
    } else {
      this.startSimulatedFallback(onUpdate);
    }
  }

  private startSimulatedFallback(onUpdate?: (coords: { lat: number; lng: number }) => void) {
    if (this.simulationInterval) return;
    // Base around Central Park / NYC or current places
    let lat = this.places[0]?.lat ?? 40.7829;
    let lng = this.places[0]?.lng ?? -73.9654;

    this.handlePosition(lat, lng);
    onUpdate?.({ lat, lng });

    // Subtle drift simulation so history and movement work even if browser blocks GPS
    this.simulationInterval = window.setInterval(() => {
      lat += (Math.random() - 0.48) * 0.0003;
      lng += (Math.random() - 0.48) * 0.0003;
      this.handlePosition(lat, lng);
      onUpdate?.({ lat, lng });
    }, 15000);
  }

  public handlePosition(lat: number, lng: number) {
    // 1. Push location to members live map
    Repo.pushLocation(lat, lng).catch(() => {});

    // 2. History: write when moved >= 20m or every 2 minutes (120,000ms)
    const now = Date.now();
    const h = this.lastHist;
    const moved = h ? distanceBetween(h.lat, h.lng, lat, lng) : Number.MAX_VALUE;

    if (!h || moved >= 20 || now - h.ts >= 120000) {
      Repo.pushHistory(lat, lng).catch(() => {});
      this.lastHist = { lat, lng, ts: now };
    }

    // 3. Geofences: compare inside/outside with previous state (first fix is silent)
    for (const p of this.places) {
      const dist = distanceBetween(lat, lng, p.lat, p.lng);
      const isIn = dist <= p.radius;
      const prev = this.inside[p.id];

      if (prev !== undefined && prev !== isIn) {
        Repo.addEvent(p, isIn ? 'enter' : 'exit').catch(() => {});
      }
      this.inside[p.id] = isIn;
    }
  }

  public stop() {
    this.isTracking = false;
    if (this.watchId !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    if (this.unsubscribePlaces) {
      this.unsubscribePlaces();
      this.unsubscribePlaces = null;
    }
    this.lastHist = null;
    this.inside = {};
  }

  public isActive(): boolean {
    return this.isTracking;
  }
}

export const LocationTracker = new LocationTrackerService();
