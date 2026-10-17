export interface Member {
  uid: string;
  name: string;
  lat: number;
  lng: number;
  ts: number;
  sos: boolean;
}

export interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number; // in meters
}

export interface Event {
  id: string;
  uid: string;
  name: string;
  place: string;
  type: 'enter' | 'exit';
  ts: number;
}

export interface HistoryPoint {
  lat: number;
  lng: number;
  ts: number;
}

export function eventText(e: Event): string {
  return `${e.name} ${e.type === 'enter' ? 'arrived at' : 'left'} ${e.place}`;
}

export function ago(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return `${d} d ago`;
}

export function hhmm(ts: number): string {
  const d = new Date(ts);
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${mins}`;
}

export function dayMonth(ts: number): string {
  const d = new Date(ts);
  const day = d.getDate();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[d.getMonth()];
  return `${day} ${month} ${hhmm(ts)}`;
}

export function formatDateUTC(d: Date): string {
  const year = d.getUTCFullYear();
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = d.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateLocal(d: Date): string {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Distance between two coordinates in meters (Haversine formula, matches Location.distanceBetween)
export function distanceBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
