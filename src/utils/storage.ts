import { Booking } from '../types';
import { toISODateString } from './dateUtils';

const STORAGE_KEY = 'car_rental_bookings_v1';
const LEGACY_STORAGE_KEY = 'fleet_rental_scheduler_bookings_v1';

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
      return parsed;
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
