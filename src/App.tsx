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
import { Booking, VehicleType, TurnoverDetails } from './types';
import { loadBookings, isAdminSessionActive, setAdminSessionActive } from './utils/storage';
import { 
  subscribeToBookings, 
  saveBookingToFirestore, 
  deleteBookingFromFirestore, 
  clearAllBookingsFromFirestore 
} from './utils/firebaseBookings';
import { checkBookingConflicts, calculateBookingTime } from './utils/dateUtils';

type AppRoute = 'public' | 'admin' | 'tracker';

const parseRouteFromLocation = (): { route: AppRoute; trackerId: string | null } => {
  if (typeof window === 'undefined') {
    return { route: 'public', trackerId: null };
  }

  const pathname = window.location.pathname.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash.toLowerCase();

  // 1. Check for tracker route (/tracker, /tracker/ID, ?tracker=ID, ?id=ID, or #tracker=ID)
  if (
    pathname === '/tracker' || 
    pathname.startsWith('/tracker/') || 
    searchParams.has('tracker') || 
    searchParams.get('page') === 'tracker' || 
    hash.startsWith('#tracker')
  ) {
    let id: string | null = null;
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts[0]?.toLowerCase() === 'tracker' && pathParts[1]) {
      id = decodeURIComponent(pathParts[1]);
    } else if (searchParams.get('id')) {
      id = searchParams.get('id');
    } else if (searchParams.get('tracker')) {
      id = searchParams.get('tracker');
    } else if (hash.startsWith('#tracker=')) {
      id = hash.replace('#tracker=', '');
    }
    return { route: 'tracker', trackerId: id };
  }

  // 2. Check for admin route (/admin, /admin/..., ?page=admin, #admin)
  if (
    pathname === '/admin' || 
    pathname.startsWith('/admin/') || 
    searchParams.get('page') === 'admin' || 
    hash === '#admin'
  ) {
    return { route: 'admin', trackerId: null };
  }

  // 3. Landing page is Public Availability Calendar (/)
  return { route: 'public', trackerId: null };
};

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'active' | 'upcoming' | 'overtime' | 'completed'>('all');

  // URL Route State
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => parseRouteFromLocation().route);
  const [activeTrackerId, setActiveTrackerId] = useState<string | null>(() => parseRouteFromLocation().trackerId);

  // Real-time Firestore sync & offline cache subscription
  useEffect(() => {
    const unsubscribe = subscribeToBookings((updatedBookings) => {
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

  // Automatic completion check for 1-day inactive overdue rentals
  useEffect(() => {
    if (!bookings || bookings.length === 0) return;
    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;

    bookings.forEach((b) => {
      if (b.status === 'completed' || b.completedAt) return;
      const timeCalc = calculateBookingTime(b, now);
      if (timeCalc.isOvertime) {
        const overtimeDuration = now.getTime() - timeCalc.endDateTime.getTime();
        if (overtimeDuration >= oneDayMs) {
          // Automatically log completely in the completed status after 1 day of inactive update
          const autoCompleted: Booking = {
            ...b,
            status: 'completed',
            completedAt: now.toISOString(),
            turnoverDetails: {
              returnedAt: timeCalc.endDateTime.toISOString(),
              fuelLevel: 'Full',
              odometerReading: 'Auto-closed after 24h grace period',
              conditionNotes: 'Auto-completed by system after 1 day of inactive schedule past return time.',
              receivedBy: 'System Automation',
              loggedAt: now.toISOString(),
            },
          };
          saveBookingToFirestore(autoCompleted).catch((e) => {
            console.warn('Failed auto-completing overdue booking', b.id, e);
          });
        }
      }
    });
  }, [bookings]);

  // Listen to browser forward/backward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const { route, trackerId } = parseRouteFromLocation();
      setCurrentRoute(route);
      setActiveTrackerId(trackerId);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Router navigation helper
  const navigateTo = useCallback((route: AppRoute, trackerId?: string | null) => {
    let url = '/';
    if (route === 'admin') {
      url = '/admin';
    } else if (route === 'tracker') {
      url = trackerId ? `/tracker?id=${encodeURIComponent(trackerId)}` : '/tracker';
    } else {
      url = '/';
    }

    try {
      window.history.pushState({ route, trackerId }, '', url);
    } catch {
      // Fallback for restricted preview environments
    }

    setCurrentRoute(route);
    setActiveTrackerId(trackerId || null);
  }, []);

  const handleOpenTracker = (bookingId?: string) => {
    navigateTo('tracker', bookingId || null);
  };

  const handleOpenAdmin = () => {
    navigateTo('admin');
  };

  const handleOpenPublicCalendar = () => {
    navigateTo('public');
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

  // Log successful vehicle turnover
  const handleLogTurnover = async (bookingId: string, details: TurnoverDetails) => {
    const target = bookings.find((b) => b.id === bookingId);
    if (!target) return;

    const updatedBooking: Booking = {
      ...target,
      status: 'completed',
      completedAt: details.returnedAt || new Date().toISOString(),
      turnoverDetails: details,
    };

    try {
      await saveBookingToFirestore(updatedBooking);
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking(updatedBooking);
      }
      showToast(
        'Turnover Successfully Logged',
        `Reservation ${bookingId} for ${target.name} is now marked as Completed. Vehicle is safely checked in.`,
        'success'
      );
    } catch (err) {
      console.error('Failed to save turnover to Firestore', err);
      showToast('Database Error', 'Could not save turnover details to cloud.', 'error');
    }
  };

  // Undo vehicle turnover (restore to active/scheduled)
  const handleUndoTurnover = async (booking: Booking) => {
    const updatedBooking: Booking = {
      ...booking,
      status: undefined,
      completedAt: undefined,
      turnoverDetails: undefined,
    };

    try {
      await saveBookingToFirestore(updatedBooking);
      if (selectedBooking && selectedBooking.id === booking.id) {
        setSelectedBooking(updatedBooking);
      }
      showToast(
        'Turnover Reverted',
        `Reservation ${booking.id} has been restored to the ongoing schedule.`,
        'info'
      );
    } catch (err) {
      console.error('Failed to revert turnover in Firestore', err);
      showToast('Database Error', 'Could not revert turnover in cloud.', 'error');
    }
  };

  // Update payment status and billing details
  const handleUpdatePaymentStatus = async (bookingId: string, paymentData: Partial<Booking>) => {
    const target = bookings.find((b) => b.id === bookingId);
    if (!target) return;

    const updated: Booking = {
      ...target,
      ...paymentData,
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveBookingToFirestore(updated);
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking(updated);
      }
      showToast(
        paymentData.paymentStatus === 'paid' ? 'Payment Confirmed' : 'Payment Status Updated',
        `Payment for ${target.name} has been set to ${(paymentData.paymentStatus || 'updated').toUpperCase()}.`,
        'success'
      );
    } catch (err) {
      console.error('Failed to update payment status in Firestore', err);
      showToast('Database Error', 'Could not update payment status in cloud.', 'error');
    }
  };

  // 1. ROUTE: /tracker - Live Renter Tracker View
  if (currentRoute === 'tracker') {
    const activeBooking = activeTrackerId 
      ? (bookings.find((b) => b.id === activeTrackerId || b.trackingToken === activeTrackerId) || null)
      : null;

    return (
      <RenterTrackerView
        booking={activeBooking}
        bookingId={activeTrackerId}
        onNavigateHome={handleOpenPublicCalendar}
        onNavigateAdmin={handleOpenAdmin}
        onLookupId={(id) => handleOpenTracker(id)}
      />
    );
  }

  // 2. ROUTE: / (Landing Page) - Public Availability Calendar
  if (currentRoute === 'public') {
    return (
      <div className="relative min-h-screen bg-slate-50 flex flex-col">
        {isAdminUnlocked && (
          <div className="bg-blue-900 border-b border-blue-800 text-white text-xs px-4 py-2 flex items-center justify-between sticky top-0 z-40 shadow-xs">
            <span className="font-semibold flex items-center gap-1.5">
              <span>Admin session active • Previewing Public Landing Page (/)</span>
            </span>
            <button
              onClick={handleOpenAdmin}
              className="px-3 py-1 bg-white text-blue-900 font-bold rounded-md hover:bg-blue-50 transition-colors text-xs shadow-2xs"
            >
              Open Admin System (/admin)
            </button>
          </div>
        )}
        <PublicAvailabilityCalendar
          bookings={bookings}
          onOpenTrackerLookup={() => handleOpenTracker()}
          onOpenAdminLogin={handleOpenAdmin}
        />
      </div>
    );
  }

  // 3. ROUTE: /admin - Admin Booking System
  // Security Gate: Protect admin dashboard with PIN passkey if locked
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
        onNavigateHome={handleOpenPublicCalendar}
        onNavigateTracker={() => handleOpenTracker()}
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
          onFilterOngoing={() => setStatusFilter(statusFilter === 'ongoing' ? 'all' : 'ongoing')}
          onFilterUpcoming={() => setStatusFilter(statusFilter === 'upcoming' ? 'all' : 'upcoming')}
          onFilterCompleted={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
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
        onConfirmTurnover={handleLogTurnover}
        onUndoTurnover={handleUndoTurnover}
        onUpdatePaymentStatus={handleUpdatePaymentStatus}
      />

      {/* Add / Edit Booking Form Modal */}
      <BookingFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        editingBooking={editingBooking}
        initialDate={initialFormDate}
        allBookings={bookings}
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

