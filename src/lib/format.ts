import type { SOSRecord } from './types';

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatShort(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Exact timestamp including seconds. */
export function formatExact(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function coordsText(lat: number, lon: number, accuracy?: number | null): string {
  const base = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  return accuracy != null ? `${base} (±${Math.round(accuracy)} m)` : base;
}

export function hasCoords(s?: SOSRecord | null): s is SOSRecord & { latitude: number; longitude: number } {
  return Boolean(s && s.location_status === 'SHARED' && s.latitude != null && s.longitude != null);
}

export function osmLink(lat: number, lon: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;
}

export function osmEmbed(lat: number, lon: number): string {
  const d = 0.004;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - d}%2C${lat - d}%2C${lon + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lon}`;
}
