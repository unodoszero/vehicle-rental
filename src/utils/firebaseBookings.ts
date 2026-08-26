import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { Booking } from '../types';
import { loadBookings, saveBookings, generateTrackingToken } from './storage';

const BOOKINGS_COLLECTION = 'bookings';

/**
 * Subscribes to the Firestore bookings collection with real-time updates and offline caching.
 * Automatically synchronizes changes across all devices and falls back to local cache when offline.
 */
export function subscribeToBookings(
  onUpdate: (bookings: Booking[], isFromCache: boolean) => void,
  onError?: (error: Error) => void
): () => void {
  const colRef = collection(db, BOOKINGS_COLLECTION);

  // Fallback initial load from localStorage for zero-latency initial paint
  const localFallback = loadBookings();
  if (localFallback.length > 0) {
    onUpdate(localFallback, true);
  }

  const unsubscribe = onSnapshot(
    colRef,
    { includeMetadataChanges: true },
    (snapshot) => {
      const isFromCache = snapshot.metadata.fromCache;
      const list: Booking[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Booking;
        list.push({
          ...data,
          id: data.id || docSnap.id,
          trackingToken: data.trackingToken || generateTrackingToken(),
        });
      });

      // Sort by startDate desc or id desc
      list.sort((a, b) => {
        if (a.startDate === b.startDate) {
          return (a.startTime || '').localeCompare(b.startTime || '');
        }
        return (a.startDate || '').localeCompare(b.startDate || '');
      });

      // Update local storage backup
      saveBookings(list);
      onUpdate(list, isFromCache);
    },
    (err) => {
      console.warn('Firestore snapshot listener warning/error:', err);
      if (onError) onError(err);
      // Fallback to local storage
      const fallback = loadBookings();
      onUpdate(fallback, true);
    }
  );

  return unsubscribe;
}

/**
 * Saves or updates a single booking in Firestore.
 * Works seamlessly offline (queued locally by Firestore) and online.
 */
export async function saveBookingToFirestore(booking: Booking): Promise<void> {
  const docRef = doc(db, BOOKINGS_COLLECTION, booking.id);
  const cleanData: Booking = {
    ...booking,
    updatedAt: new Date().toISOString(),
  };

  // Immediate save to firestore (works offline with persistent cache)
  await setDoc(docRef, cleanData, { merge: true });

  // Update local storage cache immediately
  const current = loadBookings();
  const index = current.findIndex((b) => b.id === booking.id);
  let updatedList: Booking[];
  if (index >= 0) {
    updatedList = [...current];
    updatedList[index] = cleanData;
  } else {
    updatedList = [cleanData, ...current];
  }
  saveBookings(updatedList);
}

/**
 * Deletes a booking from Firestore.
 */
export async function deleteBookingFromFirestore(bookingId: string): Promise<void> {
  const docRef = doc(db, BOOKINGS_COLLECTION, bookingId);
  await deleteDoc(docRef);

  // Update local cache
  const current = loadBookings();
  const filtered = current.filter((b) => b.id !== bookingId);
  saveBookings(filtered);
}

/**
 * Clears all bookings from Firestore.
 */
export async function clearAllBookingsFromFirestore(): Promise<void> {
  const colRef = collection(db, BOOKINGS_COLLECTION);
  const snapshot = await getDocs(colRef);
  const batch = writeBatch(db);

  snapshot.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });

  await batch.commit();
  saveBookings([]);
}

/**
 * Imports an array of bookings into Firestore.
 */
export async function importBookingsToFirestore(importedList: Booking[]): Promise<void> {
  if (!Array.isArray(importedList) || importedList.length === 0) return;

  const batch = writeBatch(db);
  for (const b of importedList) {
    if (!b.id) continue;
    const docRef = doc(db, BOOKINGS_COLLECTION, b.id);
    batch.set(docRef, b, { merge: true });
  }

  await batch.commit();
}

/**
 * Exports current bookings to a downloadable JSON file for offline backup or iCloud Drive storage.
 */
export function exportBookingsToJSON(bookings: Booking[]): void {
  const dataStr = JSON.stringify(bookings, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.href = url;
  link.download = `miranda-rentals-backup-${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
