import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { StatsBar } from './components/StatsBar';
import { CalendarView } from './components/CalendarView';
import { BookingFormModal } from './components/BookingFormModal';
import { BookingDetailsDrawer } from './components/BookingDetailsDrawer';
import { ConflictWarningModal } from './components/ConflictWarningModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { RenterTrackerView } from './components/RenterTrackerView';
import { AdminLockScreen } from './components/AdminLockScreen';
import { PublicAvailabilityCalendar } from './components/PublicAvailabilityCalendar';
import { ChangePinModal } from './components/ChangePinModal';
import { ToastProvider, useToast } from './components/Toast';
import { Booking, VehicleType } from './types';
import { loadBookings, isAdminSessionActive, setAdminSessionActive } from './utils/storage';
import { 
  subscribeToBookings, 
  saveBookingToFirestore, 
  deleteBookingFromFirestore, 
  clearAllBookingsFromFirestore 
} from './utils/firebaseBookings';
import { checkBookingConflicts } from './utils/dateUtils';

function MainApp() {
  const { showToast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>(() => loadBookings());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Security: Admin Authentication Gate
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => isAdminSessionActive());
  const [isChangePinModalOpen, setIsChangePinModalOpen] = useState(false);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [initialFormDate, setInitialFormDate] = useState<string | undefined>();

  // Conflict modal state
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [pendingBookingToSave, setPendingBookingToSave] = useState<Booking | null>(null);
  const [conflictsList, setConflictsList] = useState<Booking[]>([]);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);

  // Filters
  const [vehicleFilter, setVehicleFilter] = useState<'all' | VehicleType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'upcoming' | 'overtime'>('all');

  // Active public tracker route detection (from URL query ?tracker=ID or #tracker=ID)
  const [activeTrackerId, setActiveTrackerId] = useState<string | null>(null);
  const [isViewingPublicCalendar, setIsViewingPublicCalendar] = useState<boolean>(false);

  // Real-time Firestore sync & offline cache subscription
  useEffect(() => {
    const unsubscribe = subscribeToBookings((updatedBookings, isFromCache) => {
      setBookings(updatedBookings);
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check URL query on mount and on popstate
  useEffect(() => {
    const parseUrl = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const trackerParam = urlParams.get('tracker');
      const viewParam = urlParams.get('view');

      if (trackerParam) {
        setActiveTrackerId(trackerParam);
        setIsViewingPublicCalendar(false);
        return;
      }
      const hash = window.location.hash;
      if (hash.startsWith('#tracker=')) {
        setActiveTrackerId(hash.replace('#tracker=', ''));
        setIsViewingPublicCalendar(false);
        return;
      }

      if (viewParam === 'calendar' || viewParam === 'availability' || hash === '#calendar' || hash === '#availability') {
        setIsViewingPublicCalendar(true);
        setActiveTrackerId(null);
        return;
      }

      setActiveTrackerId(null);
      setIsViewingPublicCalendar(false);
    };

    parseUrl();
    window.addEventListener('popstate', parseUrl);
    return () => window.removeEventListener('popstate', parseUrl);
  }, []);

  // Handle open tracker public view
  const handleOpenTracker = (bookingId: string) => {
    setActiveTrackerId(bookingId);
    setIsViewingPublicCalendar(false);
    const newUrl = `${window.location.pathname}?tracker=${bookingId}`;
    window.history.pushState({ tracker: bookingId }, '', newUrl);
  };

  // Handle open public calendar view
  const handleOpenPublicCalendar = () => {
    setIsViewingPublicCalendar(true);
    setActiveTrackerId(null);
    const newUrl = `${window.location.pathname}?view=calendar`;
    window.history.pushState({ view: 'calendar' }, '', newUrl);
  };

  const handleBackToAdmin = () => {
    setActiveTrackerId(null);
    setIsViewingPublicCalendar(false);
    window.history.pushState({}, '', window.location.pathname);
  };

  // Open Add Booking modal
  const handleOpenAddModal = (dateString?: string) => {
    setEditingBooking(null);
    setInitialFormDate(dateString);
    setIsFormModalOpen(true);
  };

  // Open Edit Booking modal
  const handleOpenEditModal = (booking: Booking) => {
    setIsDrawerOpen(false);
    setEditingBooking(booking);
    setIsFormModalOpen(true);
  };

  // Open Delete Confirmation modal
  const handleOpenDeleteModal = (booking: Booking) => {
    setBookingToDelete(booking);
    setIsDeleteModalOpen(true);
  };

  // Confirm delete booking
  const handleConfirmDelete = async () => {
    if (!bookingToDelete) return;
    try {
      await deleteBookingFromFirestore(bookingToDelete.id);
      setIsDeleteModalOpen(false);
      setIsDrawerOpen(false);
      setSelectedBooking(null);
      showToast('Booking Deleted', `Reservation ${bookingToDelete.id} for ${bookingToDelete.name} was removed.`, 'info');
    } catch (err) {
      console.error('Failed to delete booking from Firestore', err);
      showToast('Delete Error', 'Could not delete booking from database.', 'error');
    }
  };

  // Submit booking from form (with conflict check)
  const handleFormSubmit = async (bookingData: Booking, isOverride: boolean = false) => {
    if (!isOverride) {
      const conflictCheck = checkBookingConflicts(bookingData, bookings, true);
      if (conflictCheck.hasConflict) {
        setPendingBookingToSave(bookingData);
        setConflictsList(conflictCheck.conflictingBookings);
        setIsConflictModalOpen(true);
        return;
      }
    }

    try {
      await saveBookingToFirestore(bookingData);

      if (editingBooking) {
        showToast('Booking Updated', `Changes to reservation ${bookingData.id} saved to Cloud & Local Cache.`, 'success');
      } else {
        showToast('Booking Created', `New reservation ${bookingData.id} for ${bookingData.name} saved to Cloud & Local Cache.`, 'success');
      }

      setIsFormModalOpen(false);
      setIsConflictModalOpen(false);
      setPendingBookingToSave(null);

      if (selectedBooking && selectedBooking.id === bookingData.id) {
        setSelectedBooking(bookingData);
      }
    } catch (err) {
      console.error('Failed to save booking to Firestore', err);
      showToast('Database Error', 'Could not save booking to Cloud.', 'error');
    }
  };

  // Conflict modal override proceed
  const handleProceedWithConflict = () => {
    if (pendingBookingToSave) {
      handleFormSubmit(pendingBookingToSave, true);
    }
  };

  // Clear all bookings
  const handleResetSeedData = async () => {
    if (confirm('Are you sure you want to clear all bookings from the database?')) {
      try {
        await clearAllBookingsFromFirestore();
        setSelectedBooking(null);
        setIsDrawerOpen(false);
        showToast('All Bookings Cleared', 'The schedule has been cleared from Cloud and Local storage.', 'info');
      } catch (err) {
        console.error('Failed to clear bookings', err);
        showToast('Clear Error', 'Failed to clear cloud database.', 'error');
      }
    }
  };

  // Select booking for side panel details drawer
  const handleSelectBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsDrawerOpen(true);
  };

  // If in public Renter Live Tracker view:
  if (activeTrackerId) {
    const activeBooking = bookings.find((b) => b.id === activeTrackerId || b.trackingToken === activeTrackerId) || null;
    return (
      <RenterTrackerView
        booking={activeBooking}
        bookingId={activeTrackerId}
      />
    );
  }

  // If in explicit Public Availability Calendar view (or opened via link)
  if (isViewingPublicCalendar) {
    return (
      <div className="relative">
        {isAdminUnlocked && (
          <div className="bg-blue-900 border-b border-blue-800 text-white text-xs px-4 py-2 flex items-center justify-between sticky top-0 z-40">
            <span className="font-semibold flex items-center gap-1.5">
              <span>👀 You are previewing the Public Availability Calendar (Potential Renters View)</span>
            </span>
            <button
              onClick={handleBackToAdmin}
              className="px-3 py-1 bg-white text-blue-900 font-bold rounded hover:bg-blue-50 transition-colors text-xs"
            >
              Back to Admin Dashboard
            </button>
          </div>
        )}
        <PublicAvailabilityCalendar
          bookings={bookings}
          onOpenTrackerLookup={() => {
            const id = prompt('Enter your Booking ID or Tracking Reference:') || '';
            if (id.trim()) handleOpenTracker(id.trim());
          }}
          onOpenAdminLogin={() => {
            setIsViewingPublicCalendar(false);
          }}
        />
      </div>
    );
  }

  // Security Gate: Protect admin dashboard with PIN passkey
  if (!isAdminUnlocked) {
    return (
      <AdminLockScreen
        bookings={bookings}
        onUnlock={() => {
          setAdminSessionActive(true);
          setIsAdminUnlocked(true);
          showToast('Admin Console Unlocked', 'Welcome to Miranda Rentals Booking System', 'success');
        }}
        onLookupTracker={(trackerKey) => {
          handleOpenTracker(trackerKey);
        }}
      />
    );
  }

  return (
    <div id="fleet-scheduler-app" className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900">
      {/* Top Admin Navbar */}
      <Navbar
        onOpenAddModal={() => handleOpenAddModal()}
        onResetSeedData={handleResetSeedData}
        bookings={bookings}
        onOpenTracker={handleOpenTracker}
        onOpenPublicCalendar={handleOpenPublicCalendar}
        isPublicTrackerView={false}
        isOnline={isOnline}
        onLockAdmin={() => {
          setAdminSessionActive(false);
          setIsAdminUnlocked(false);
          showToast('Admin Session Locked', 'You have securely locked the admin console.', 'info');
        }}
        onOpenChangePin={() => setIsChangePinModalOpen(true)}
      />

      {/* Main Admin Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Operations Overview Bar */}
        <StatsBar
          bookings={bookings}
          activeFilter={statusFilter}
          onFilterOvertime={() => setStatusFilter(statusFilter === 'overtime' ? 'all' : 'overtime')}
          onFilterActive={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
          onFilterUpcoming={() => setStatusFilter(statusFilter === 'upcoming' ? 'all' : 'upcoming')}
        />

        {/* Monthly Calendar View */}
        <CalendarView
          bookings={bookings}
          onSelectBooking={handleSelectBooking}
          onAddBookingForDate={(dateStr) => handleOpenAddModal(dateStr)}
          vehicleFilter={vehicleFilter}
          statusFilter={statusFilter}
          onVehicleFilterChange={setVehicleFilter}
          onStatusFilterChange={setStatusFilter}
        />
      </main>

      {/* Booking Details Slide-over Drawer */}
      <BookingDetailsDrawer
        booking={selectedBooking}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onEdit={handleOpenEditModal}
        onDelete={handleOpenDeleteModal}
        onOpenTracker={handleOpenTracker}
      />

      {/* Add / Edit Booking Form Modal */}
      <BookingFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        editingBooking={editingBooking}
        initialDate={initialFormDate}
      />

      {/* Conflict Overlap Warning Modal */}
      <ConflictWarningModal
        isOpen={isConflictModalOpen}
        proposedBooking={pendingBookingToSave || {}}
        conflictingBookings={conflictsList}
        onProceed={handleProceedWithConflict}
        onCancel={() => {
          setIsConflictModalOpen(false);
          setPendingBookingToSave(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        booking={bookingToDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setBookingToDelete(null);
        }}
      />

      {/* Change Admin PIN Modal */}
      <ChangePinModal
        isOpen={isChangePinModalOpen}
        onClose={() => setIsChangePinModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}

