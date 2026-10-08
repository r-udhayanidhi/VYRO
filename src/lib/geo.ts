import type { GeoResult } from './types';

/**
 * Real browser geolocation only — never fabricates coordinates.
 * Always resolves (never rejects) so a denied/unavailable location can never
 * block an emergency SOS.
 */
export function getCurrentLocation(timeoutMs = 8000): Promise<GeoResult> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ status: 'UNAVAILABLE', reason: 'UNSUPPORTED' });
      return;
    }
    let settled = false;
    // Hard stop slightly after the browser's own timeout, in case a permission
    // prompt is left unanswered (the browser timeout does not cover that).
    const guard = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ status: 'UNAVAILABLE', reason: 'TIMEOUT' });
    }, timeoutMs + 1500);

    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (settled) return;
          settled = true;
          clearTimeout(guard);
          resolve({
            status: 'SHARED',
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
            capturedAt: new Date(pos.timestamp || Date.now()).toISOString(),
          });
        },
        (err) => {
          if (settled) return;
          settled = true;
          clearTimeout(guard);
          const reason =
            err.code === 1
              ? 'PERMISSION_DENIED'
              : err.code === 3
                ? 'TIMEOUT'
                : 'POSITION_UNAVAILABLE';
          resolve({ status: 'UNAVAILABLE', reason });
        },
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 10_000 }
      );
    } catch {
      if (settled) return;
      settled = true;
      clearTimeout(guard);
      resolve({ status: 'UNAVAILABLE', reason: 'UNSUPPORTED' });
    }
  });
}

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

export async function getLocationPermission(): Promise<PermissionState> {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unknown';
    const r = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return r.state as PermissionState;
  } catch {
    return 'unknown';
  }
}

export const GEO_REASON_TEXT: Record<
  Extract<GeoResult, { status: 'UNAVAILABLE' }>['reason'],
  string
> = {
  PERMISSION_DENIED: 'location permission denied',
  POSITION_UNAVAILABLE: 'device could not determine position',
  TIMEOUT: 'location request timed out',
  UNSUPPORTED: 'location not supported on this device/connection',
};
