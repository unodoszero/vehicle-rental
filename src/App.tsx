import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { StatsBar } from './components/StatsBar';
import { CalendarView } from './components/CalendarView';
import { BookingFormModal } from './components/BookingFormModal';
import { BookingDetailsDrawer } from './components/BookingDetailsDrawer';
import { ConflictWarningModal } from './components/ConflictWarningModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { RenterTrackerView } from './components/RenterTrackerView';
import { ToastProvider, useToast } from './components/Toast';
import { Booking, VehicleType } from './types';
import { loadBookings, saveBookings, resetToSeedData } from './utils/storage';
import { checkBookingConflicts } from './utils/dateUtils';

function MainApp() {
  const { showToast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>(() => loadBookings());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

  // Check URL query on mount and on popstate
  useEffect(() => {
    const parseUrl = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const trackerParam = urlParams.get('tracker');
      if (trackerParam) {
        setActiveTrackerId(trackerParam);
        return;
      }
      const hash = window.location.hash;
      if (hash.startsWith('#tracker=')) {
        setActiveTrackerId(hash.replace('#tracker=', ''));
        return;
      }
      setActiveTrackerId(null);
    };

    parseUrl();
    window.addEventListener('popstate', parseUrl);
    return () => window.removeEventListener('popstate', parseUrl);
  }, []);

  // Sync bookings to localStorage
  const updateBookings = useCallback((newBookings: Booking[]) => {
    setBookings(newBookings);
    saveBookings(newBookings);
  }, []);

  // Handle open tracker public view
  const handleOpenTracker = (bookingId: string) => {
    setActiveTrackerId(bookingId);
    const newUrl = `${window.location.pathname}?tracker=${bookingId}`;
    window.history.pushState({ tracker: bookingId }, '', newUrl);
  };

  const handleBackToAdmin = () => {
    setActiveTrackerId(null);
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
  const handleConfirmDelete = () => {
    if (!bookingToDelete) return;
    const nextBookings = bookings.filter((b) => b.id !== bookingToDelete.id);
    updateBookings(nextBookings);
    setIsDeleteModalOpen(false);
    setIsDrawerOpen(false);
    setSelectedBooking(null);
    showToast('Booking Deleted', `Reservation ${bookingToDelete.id} for ${bookingToDelete.name} was removed.`, 'info');
  };

  // Submit booking from form (with conflict check)
  const handleFormSubmit = (bookingData: Booking, isOverride: boolean = false) => {
    if (!isOverride) {
      const conflictCheck = checkBookingConflicts(bookingData, bookings, true);
      if (conflictCheck.hasConflict) {
        setPendingBookingToSave(bookingData);
        setConflictsList(conflictCheck.conflictingBookings);
        setIsConflictModalOpen(true);
        return;
      }
    }

    // Save booking (new or edit)
    let nextBookings: Booking[];
    if (editingBooking) {
      nextBookings = bookings.map((b) => (b.id === bookingData.id ? bookingData : b));
      showToast('Booking Updated', `Changes to reservation ${bookingData.id} saved successfully.`, 'success');
    } else {
      nextBookings = [bookingData, ...bookings];
      showToast('Booking Created', `New reservation ${bookingData.id} for ${bookingData.name} added to schedule.`, 'success');
    }

    updateBookings(nextBookings);
    setIsFormModalOpen(false);
    setIsConflictModalOpen(false);
    setPendingBookingToSave(null);

    // If drawer was open for this booking, refresh selection
    if (selectedBooking && selectedBooking.id === bookingData.id) {
      setSelectedBooking(bookingData);
    }
  };

  // Conflict modal override proceed
  const handleProceedWithConflict = () => {
    if (pendingBookingToSave) {
      handleFormSubmit(pendingBookingToSave, true);
    }
  };

  // Clear all bookings
  const handleResetSeedData = () => {
    if (confirm('Are you sure you want to clear all bookings from the schedule?')) {
      const empty = resetToSeedData();
      setBookings(empty);
      setSelectedBooking(null);
      setIsDrawerOpen(false);
      showToast('All Bookings Cleared', 'The schedule has been cleared of all reservations.', 'info');
    }
  };

  // Select booking for side panel details drawer
  const handleSelectBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsDrawerOpen(true);
  };

  // If in public Renter Live Tracker view:
  if (activeTrackerId) {
    const activeBooking = bookings.find((b) => b.id === activeTrackerId) || null;
    return (
      <RenterTrackerView
        booking={activeBooking}
        onBackToAdmin={handleBackToAdmin}
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
        isPublicTrackerView={false}
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
