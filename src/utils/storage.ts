import { Booking } from '../types';
import { toISODateString } from './dateUtils';

const STORAGE_KEY = 'car_rental_bookings_v1';
const LEGACY_STORAGE_KEY = 'fleet_rental_scheduler_bookings_v1';
const ADMIN_PIN_KEY = 'miranda_admin_pin_v1';
const ADMIN_SESSION_KEY = 'miranda_admin_session_auth_v1';
export const DEFAULT_ADMIN_PIN = '1234';

export const COLOR_PALETTES = [
  { id: 'emerald', bg: 'bg-emerald-500', text: 'text-emerald-950', border: 'border-emerald-600', light: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { id: 'indigo', bg: 'bg-indigo-600', text: 'text-white', border: 'border-indigo-700', light: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  { id: 'amber', bg: 'bg-amber-500', text: 'text-amber-950', border: 'border-amber-600', light: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'rose', bg: 'bg-rose-500', text: 'text-white', border: 'border-rose-600', light: 'bg-rose-50 text-rose-800 border-rose-200' },
  { id: 'sky', bg: 'bg-sky-500', text: 'text-sky-950', border: 'border-sky-600', light: 'bg-sky-50 text-sky-800 border-sky-200' },
  { id: 'violet', bg: 'bg-violet-600', text: 'text-white', border: 'border-violet-700', light: 'bg-violet-50 text-violet-800 border-violet-200' },
  { id: 'teal', bg: 'bg-teal-600', text: 'text-white', border: 'border-teal-700', light: 'bg-teal-50 text-teal-800 border-teal-200' },
];

export function getRandomColorTag(): string {
  const index = Math.floor(Math.random() * COLOR_PALETTES.length);
  return COLOR_PALETTES[index].id;
}

/**
 * Generates an unguessable, secure cryptographic tracking token for links
 */
export function generateTrackingToken(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let token = 'trk_';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    for (let i = 0; i < array.length; i++) {
      token += chars[array[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 16; i++) {
      token += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return token;
}

/**
 * Admin Security & PIN Management
 */
export function getAdminPin(): string {
  try {
    return localStorage.getItem(ADMIN_PIN_KEY) || DEFAULT_ADMIN_PIN;
  } catch {
    return DEFAULT_ADMIN_PIN;
  }
}

export function setAdminPin(newPin: string): boolean {
  if (!newPin || newPin.length < 4) return false;
  try {
    localStorage.setItem(ADMIN_PIN_KEY, newPin);
    return true;
  } catch {
    return false;
  }
}

export function verifyAdminPin(enteredPin: string): boolean {
  const currentPin = getAdminPin();
  return enteredPin.trim() === currentPin.trim();
}

export function isAdminSessionActive(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAdminSessionActive(active: boolean): void {
  try {
    if (active) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    } else {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    }
  } catch (err) {
    console.error('Session storage error', err);
  }
}

/**
 * Generates initial realistic seed data relative to current date
 */
export function getInitialSeedBookings(): Booking[] {
  return [];
}

export function loadBookings(): Booking[] {
  try {
    if (localStorage.getItem(LEGACY_STORAGE_KEY)) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((b) => ({
        ...b,
        trackingToken: b.trackingToken || generateTrackingToken(),
      }));
    }
    return [];
  } catch (err) {
    console.error('Error loading bookings from localStorage', err);
    return [];
  }
}

export function saveBookings(bookings: Booking[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  } catch (err) {
    console.error('Error saving bookings to localStorage', err);
  }
}

export function resetToSeedData(): Booking[] {
  const seed: Booking[] = [];
  saveBookings(seed);
  return seed;
}

export function generateBookingId(existingBookings?: Booking[]): string {
  const currentList = existingBookings ?? loadBookings();
  let maxNum = 0;
  for (const b of currentList) {
    const match = b.id.match(/^BK-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  const nextNum = maxNum + 1;
  return `BK-${String(nextNum).padStart(4, '0')}`;
}
