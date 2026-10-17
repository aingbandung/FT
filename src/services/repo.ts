import { Member, Place, Event, HistoryPoint, formatDateLocal } from '../types';

// Storage keys
const STORAGE_PREFIX = 'family_locator_';
const CHANNEL_NAME = 'family_locator_sync_channel';

// In-browser BroadcastChannel for real-time multi-tab/multi-window synchronization
let channel: BroadcastChannel | null = null;
try {
  channel = new BroadcastChannel(CHANNEL_NAME);
} catch {
  // BroadcastChannel not available in some restricted contexts
}

interface StoredUser {
  uid: string;
  email: string;
  name: string;
  circleId?: string;
}

interface StoredCircle {
  id: string;
  name: string;
  owner: string;
  createdAt: number;
}

class Repository {
  private currentUid: string | null = null;
  private cachedName: string | null = null;
  private cachedCircle: string | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Restore session if exists
    const sessionUid = localStorage.getItem(`${STORAGE_PREFIX}session_uid`);
    if (sessionUid) {
      this.currentUid = sessionUid;
      const user = this.getUser(sessionUid);
      if (user) {
        this.cachedName = user.name;
        this.cachedCircle = user.circleId || null;
      }
    }

    // Seed default sample family if empty
    this.seedInitialDataIfNeeded();

    // Listen to changes from other tabs/windows
    if (channel) {
      channel.onmessage = (event) => {
        if (event.data?.type === 'DATA_UPDATED') {
          this.notifyListeners();
        }
      };
    }

    window.addEventListener('storage', () => {
      this.notifyListeners();
    });
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  private broadcastChange() {
    this.notifyListeners();
    if (channel) {
      try {
        channel.postMessage({ type: 'DATA_UPDATED', ts: Date.now() });
      } catch {
        // ignore
      }
    }
  }

  private seedInitialDataIfNeeded() {
    const initialized = localStorage.getItem(`${STORAGE_PREFIX}seeded_v1`);
    if (initialized) return;

    // Seed a sample circle "FAM789" with sample places and historical data
    const sampleCircleId = 'FAM789';
    const sampleCircle: StoredCircle = {
      id: sampleCircleId,
      name: 'The Smiths',
      owner: 'user_alex',
      createdAt: Date.now() - 86400000 * 7,
    };
    this.saveCircle(sampleCircle);

    // Seed sample users
    const sampleUsers: StoredUser[] = [
      { uid: 'user_alex', email: 'alex@example.com', name: 'Alex', circleId: sampleCircleId },
      { uid: 'user_sarah', email: 'sarah@example.com', name: 'Sarah', circleId: sampleCircleId },
      { uid: 'user_leo', email: 'leo@example.com', name: 'Leo', circleId: sampleCircleId },
    ];
    sampleUsers.forEach((u) => this.saveUser(u));

    // Seed locations (London / Central Park or general recognizable area)
    const now = Date.now();
    const baseLat = 40.7829;
    const baseLng = -73.9654; // Central Park, NY

    const sampleLocations: Record<string, Member> = {
      user_alex: {
        uid: 'user_alex',
        name: 'Alex',
        lat: baseLat + 0.004,
        lng: baseLng - 0.003,
        ts: now - 1000 * 90,
        sos: false,
      },
      user_sarah: {
        uid: 'user_sarah',
        name: 'Sarah',
        lat: baseLat - 0.006,
        lng: baseLng + 0.004,
        ts: now - 1000 * 300,
        sos: false,
      },
      user_leo: {
        uid: 'user_leo',
        name: 'Leo',
        lat: baseLat + 0.001,
        lng: baseLng + 0.006,
        ts: now - 1000 * 45,
        sos: false,
      },
    };
    localStorage.setItem(`${STORAGE_PREFIX}locations`, JSON.stringify(sampleLocations));

    // Seed places (Home, School, Park)
    const samplePlaces: Place[] = [
      {
        id: 'place_1',
        name: 'Home',
        lat: baseLat + 0.004,
        lng: baseLng - 0.003,
        radius: 180,
      },
      {
        id: 'place_2',
        name: 'High School',
        lat: baseLat + 0.001,
        lng: baseLng + 0.006,
        radius: 200,
      },
      {
        id: 'place_3',
        name: 'Grand Central Station',
        lat: baseLat - 0.025,
        lng: baseLng + 0.002,
        radius: 300,
      },
    ];
    localStorage.setItem(`${STORAGE_PREFIX}places_${sampleCircleId}`, JSON.stringify(samplePlaces));

    // Seed events
    const sampleEvents: Event[] = [
      {
        id: 'evt_1',
        uid: 'user_alex',
        name: 'Alex',
        place: 'Home',
        type: 'enter',
        ts: now - 1000 * 60 * 12,
      },
      {
        id: 'evt_2',
        uid: 'user_leo',
        name: 'Leo',
        place: 'High School',
        type: 'enter',
        ts: now - 1000 * 60 * 45,
      },
      {
        id: 'evt_3',
        uid: 'user_sarah',
        name: 'Sarah',
        place: 'Home',
        type: 'exit',
        ts: now - 1000 * 60 * 85,
      },
    ];
    localStorage.setItem(`${STORAGE_PREFIX}events_${sampleCircleId}`, JSON.stringify(sampleEvents));

    // Seed history for today for user_alex
    const todayStr = formatDateLocal(new Date(now));
    const historyPoints: HistoryPoint[] = [
      { lat: baseLat - 0.025, lng: baseLng + 0.002, ts: now - 1000 * 60 * 180 }, // Start at station
      { lat: baseLat - 0.018, lng: baseLng, ts: now - 1000 * 60 * 140 },
      { lat: baseLat - 0.010, lng: baseLng - 0.002, ts: now - 1000 * 60 * 100 },
      { lat: baseLat - 0.002, lng: baseLng - 0.002, ts: now - 1000 * 60 * 60 },
      { lat: baseLat + 0.004, lng: baseLng - 0.003, ts: now - 1000 * 60 * 12 }, // Arrived home
    ];
    const historyKey = `${STORAGE_PREFIX}history_user_alex_${todayStr}`;
    localStorage.setItem(historyKey, JSON.stringify(historyPoints));

    localStorage.setItem(`${STORAGE_PREFIX}seeded_v1`, 'true');
  }

  // Auth getters
  get myUid(): string | null {
    return this.currentUid;
  }

  // --- Auth operations ---
  async signIn(email: string, pw: string): Promise<string> {
    if (!email || !pw) {
      throw new Error('Please enter both email and password.');
    }
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getAllUsers();
    let user = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      // Allow seamless first login or test
      const uid = 'usr_' + Math.random().toString(36).substring(2, 9);
      user = {
        uid,
        email: cleanEmail,
        name: cleanEmail.split('@')[0] || 'User',
      };
      this.saveUser(user);
    }

    this.currentUid = user.uid;
    this.cachedName = user.name;
    this.cachedCircle = user.circleId || null;
    localStorage.setItem(`${STORAGE_PREFIX}session_uid`, user.uid);
    return user.uid;
  }

  async signUp(email: string, pw: string, name: string): Promise<string> {
    if (!email || !pw) {
      throw new Error('Please enter both email and password.');
    }
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getAllUsers();
    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      // Sign into existing account
      this.currentUid = existing.uid;
      this.cachedName = existing.name;
      this.cachedCircle = existing.circleId || null;
      localStorage.setItem(`${STORAGE_PREFIX}session_uid`, existing.uid);
      return existing.uid;
    }

    const uid = 'usr_' + Math.random().toString(36).substring(2, 9);
    const user: StoredUser = {
      uid,
      email: cleanEmail,
      name: name.trim() || 'Me',
    };
    this.saveUser(user);
    this.currentUid = uid;
    this.cachedName = user.name;
    this.cachedCircle = null;
    localStorage.setItem(`${STORAGE_PREFIX}session_uid`, uid);
    return uid;
  }

  async myCircleId(): Promise<string | null> {
    if (!this.currentUid) return null;
    const user = this.getUser(this.currentUid);
    if (!user) return null;
    this.cachedName = user.name;
    this.cachedCircle = user.circleId || null;
    return this.cachedCircle;
  }

  async createCircle(name: string): Promise<string> {
    if (!this.currentUid) throw new Error('Not authenticated');
    // Generate 6-char random code (matching Repo.kt: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789")
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const circle: StoredCircle = {
      id: code,
      name: name.trim() || 'Family',
      owner: this.currentUid,
      createdAt: Date.now(),
    };
    this.saveCircle(circle);

    const user = this.getUser(this.currentUid);
    if (user) {
      user.circleId = code;
      this.saveUser(user);
    }
    this.cachedCircle = code;
    this.broadcastChange();
    return code;
  }

  async joinCircle(code: string): Promise<boolean> {
    if (!this.currentUid) throw new Error('Not authenticated');
    const c = code.trim().toUpperCase();
    const circle = this.getCircle(c);
    if (!circle) return false;

    const user = this.getUser(this.currentUid);
    if (user) {
      user.circleId = c;
      this.saveUser(user);
    }
    this.cachedCircle = c;
    this.broadcastChange();
    return true;
  }

  async pushLocation(lat: number, lng: number): Promise<void> {
    if (!this.currentUid) return;
    if (!this.cachedCircle) await this.myCircleId();
    const circle = this.cachedCircle;
    if (!circle) return;

    const locations = this.getAllLocations();
    const currentLoc = locations[this.currentUid] || {};
    const updated: Member = {
      uid: this.currentUid,
      name: this.cachedName || 'Me',
      lat,
      lng,
      ts: Date.now(),
      sos: currentLoc.sos || false,
    };

    locations[this.currentUid] = updated;
    localStorage.setItem(`${STORAGE_PREFIX}locations`, JSON.stringify(locations));
    this.broadcastChange();
  }

  async setSos(on: boolean): Promise<void> {
    if (!this.currentUid) return;
    const locations = this.getAllLocations();
    const currentLoc = locations[this.currentUid];
    if (currentLoc) {
      currentLoc.sos = on;
      localStorage.setItem(`${STORAGE_PREFIX}locations`, JSON.stringify(locations));
      this.broadcastChange();
    }
  }

  // Real-time members subscription
  subscribeMembers(circleId: string, callback: (members: Member[]) => void): () => void {
    const update = () => {
      // Get all users in this circle
      const usersInCircle = this.getAllUsers().filter((u) => u.circleId === circleId);
      const locations = this.getAllLocations();

      const members: Member[] = [];
      usersInCircle.forEach((u) => {
        const loc = locations[u.uid];
        if (loc) {
          members.push({
            uid: u.uid,
            name: u.name || loc.name,
            lat: loc.lat,
            lng: loc.lng,
            ts: loc.ts,
            sos: !!loc.sos,
          });
        }
      });

      callback(members);
    };

    update();
    this.listeners.add(update);
    return () => {
      this.listeners.delete(update);
    };
  }

  // History operations
  async pushHistory(lat: number, lng: number): Promise<void> {
    if (!this.currentUid) return;
    const now = Date.now();
    const day = formatDateLocal(new Date(now));
    const key = `${STORAGE_PREFIX}history_${this.currentUid}_${day}`;
    const raw = localStorage.getItem(key);
    const points: HistoryPoint[] = raw ? JSON.parse(raw) : [];

    points.push({ lat, lng, ts: now });
    localStorage.setItem(key, JSON.stringify(points));
    this.broadcastChange();
  }

  async history(memberUid: string, day: string): Promise<HistoryPoint[]> {
    const key = `${STORAGE_PREFIX}history_${memberUid}_${day}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const list: HistoryPoint[] = JSON.parse(raw);
      return list.sort((a, b) => a.ts - b.ts);
    } catch {
      return [];
    }
  }

  // Places (geofences) operations
  async addPlace(name: string, lat: number, lng: number, radius: number): Promise<void> {
    const c = this.cachedCircle || (await this.myCircleId());
    if (!c) return;

    const places = this.getPlaces(c);
    const newPlace: Place = {
      id: 'place_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      name: name.trim() || 'Place',
      lat,
      lng,
      radius,
    };
    places.push(newPlace);
    localStorage.setItem(`${STORAGE_PREFIX}places_${c}`, JSON.stringify(places));
    this.broadcastChange();
  }

  async deletePlace(id: string): Promise<void> {
    const c = this.cachedCircle;
    if (!c) return;
    let places = this.getPlaces(c);
    places = places.filter((p) => p.id !== id);
    localStorage.setItem(`${STORAGE_PREFIX}places_${c}`, JSON.stringify(places));
    this.broadcastChange();
  }

  subscribePlaces(circleId: string, callback: (places: Place[]) => void): () => void {
    const update = () => {
      callback(this.getPlaces(circleId));
    };
    update();
    this.listeners.add(update);
    return () => {
      this.listeners.delete(update);
    };
  }

  // Events operations
  async addEvent(place: Place, type: 'enter' | 'exit'): Promise<void> {
    const c = this.cachedCircle;
    if (!c || !this.currentUid) return;

    const events = this.getEvents(c);
    const newEvent: Event = {
      id: 'evt_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      uid: this.currentUid,
      name: this.cachedName || 'Someone',
      place: place.name,
      type,
      ts: Date.now(),
    };
    // Prepend to list (latest first)
    events.unshift(newEvent);
    // Keep max 50
    if (events.length > 50) events.pop();
    localStorage.setItem(`${STORAGE_PREFIX}events_${c}`, JSON.stringify(events));
    this.broadcastChange();
  }

  subscribeEvents(circleId: string, callback: (events: Event[]) => void): () => void {
    const update = () => {
      callback(this.getEvents(circleId));
    };
    update();
    this.listeners.add(update);
    return () => {
      this.listeners.delete(update);
    };
  }

  signOut(): void {
    this.cachedName = null;
    this.cachedCircle = null;
    this.currentUid = null;
    localStorage.removeItem(`${STORAGE_PREFIX}session_uid`);
    this.broadcastChange();
  }

  // Storage helper methods
  private getAllUsers(): StoredUser[] {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}users`);
    return raw ? JSON.parse(raw) : [];
  }

  private getUser(uid: string): StoredUser | null {
    return this.getAllUsers().find((u) => u.uid === uid) || null;
  }

  private saveUser(user: StoredUser): void {
    const users = this.getAllUsers().filter((u) => u.uid !== user.uid);
    users.push(user);
    localStorage.setItem(`${STORAGE_PREFIX}users`, JSON.stringify(users));
  }

  private getCircle(id: string): StoredCircle | null {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}circle_${id}`);
    return raw ? JSON.parse(raw) : null;
  }

  private saveCircle(circle: StoredCircle): void {
    localStorage.setItem(`${STORAGE_PREFIX}circle_${circle.id}`, JSON.stringify(circle));
  }

  private getAllLocations(): Record<string, Member> {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}locations`);
    return raw ? JSON.parse(raw) : {};
  }

  private getPlaces(circleId: string): Place[] {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}places_${circleId}`);
    return raw ? JSON.parse(raw) : [];
  }

  private getEvents(circleId: string): Event[] {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}events_${circleId}`);
    return raw ? JSON.parse(raw) : [];
  }
}

export const Repo = new Repository();
