import type { UserProfile } from './types';

/**
 * Demo identity. The app has no real auth (role picker only), so the "logged-in
 * family user" is a stable per-browser profile. It is persisted to the `users`
 * table when an SOS / report is created so cases are tied to a user id.
 */
const KEY = 'vyro_demo_family_user';

function fallbackId(): string {
  return crypto.randomUUID();
}

export function getCurrentUser(): UserProfile {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (raw) {
      const u = JSON.parse(raw) as UserProfile;
      if (u?.id) return u;
    }
  } catch {
    /* fall through to create */
  }
  const user: UserProfile = {
    id: fallbackId(),
    name: 'Family Member',
    role: 'family',
    phone: '',
  };
  saveCurrentUser(user);
  return user;
}

export function saveCurrentUser(user: UserProfile): UserProfile {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(KEY, JSON.stringify(user));
    }
  } catch {
    /* ignore */
  }
  return user;
}
