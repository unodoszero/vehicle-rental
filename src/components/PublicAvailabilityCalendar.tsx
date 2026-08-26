import React, { useState, useMemo } from 'react';
import { 
  Car, Calendar, ShieldCheck, ChevronLeft, ChevronRight, 
  CheckCircle2, Clock, MessageCircle, ExternalLink, Copy, Check,
  FileText, Fuel, CreditCard, MapPin, Phone, Sparkles, Filter,
  Lock, Search, Share2, Info
} from 'lucide-react';
import { Booking, VehicleType } from '../types';
import { 
  getMonthCalendarGrid, 
  toISODateString, 
  formatDateOnly, 
  getBookingStartDateTime, 
  getBookingEndDateTime 
} from '../utils/dateUtils';

interface PublicAvailabilityCalendarProps {
  bookings: Booking[];
  onOpenTrackerLookup?: () => void;
  onOpenAdminLogin?: () => void;
  onSelectBookingTracker?: (trackerId: string) => void;
}

export const PublicAvailabilityCalendar: React.FC<PublicAvailabilityCalendarProps> = ({
  bookings,
  onOpenTrackerLookup,
  onOpenAdminLogin,
}) => {
  // Navigation & Date State
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [vehicleFilter, setVehicleFilter] = useState<'all' | VehicleType>('all');
  
  // Date Selection for Renters
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
  const [copiedInquiry, setCopiedInquiry] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(currentDate);

  const calendarDays = useMemo(() => {
    return getMonthCalendarGrid(year, month);
  }, [year, month]);

  // Next & Previous Month Handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filter bookings based on vehicle category
  const filteredBookings = useMemo(() => {
    if (vehicleFilter === 'all') return bookings;
    return bookings.filter((b) => b.vehicle === vehicleFilter);
  }, [bookings, vehicleFilter]);

  // Compute status for each day
  const getDayAvailability = (dateString: string) => {
    const dayBookings = filteredBookings.filter((b) => {
      const targetDayStart = new Date(`${dateString}T00:00:00`).getTime();
      const targetDayEnd = new Date(`${dateString}T23:59:59.999`).getTime();
      const start = getBookingStartDateTime(b).getTime();
      const end = getBookingEndDateTime(b).getTime();
      return start <= targetDayEnd && end >= targetDayStart;
    });

    const carBooked = dayBookings.some((b) => b.vehicle === 'Car');
    const vanBooked = dayBookings.some((b) => b.vehicle === 'Van');

    return {
      isBooked: dayBookings.length > 0,
      carBooked,
      vanBooked,
      bookingCount: dayBookings.length,
      bookings: dayBookings,
    };
  };

  // Date click logic
  const handleDayClick = (dateString: string, isPast: boolean) => {
    if (isPast) return;

    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      setSelectedStartDate(dateString);
      setSelectedEndDate(null);
    } else {
      // If clicked earlier than start date, reset start
      if (dateString < selectedStartDate) {
        setSelectedStartDate(dateString);
        setSelectedEndDate(null);
      } else {
        setSelectedEndDate(dateString);
      }
    }
  };

  // Calculation of selected days
  const selectedDurationDays = useMemo(() => {
    if (!selectedStartDate) return 0;
    if (!selectedEndDate) return 1;
    const start = new Date(selectedStartDate).getTime();
    const end = new Date(selectedEndDate).getTime();
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff + 1);
  }, [selectedStartDate, selectedEndDate]);

  // Generate Inquiry Message
  const inquiryMessage = useMemo(() => {
    const vehicleText = vehicleFilter === 'all' ? 'Car / Van' : vehicleFilter;
    if (selectedStartDate && selectedEndDate) {
      return `Hi Miranda Rentals! I checked your availability calendar and I would like to inquire about booking a ${vehicleText} from ${selectedStartDate} to ${selectedEndDate} (${selectedDurationDays} days). Are these dates available for reservation?`;
    } else if (selectedStartDate) {
      return `Hi Miranda Rentals! I checked your availability calendar and I would like to inquire about booking a ${vehicleText} starting on ${selectedStartDate}. Are these dates available for reservation?`;
    }
    return `Hi Miranda Rentals! I would like to inquire about available dates for booking a ${vehicleText}.`;
  }, [selectedStartDate, selectedEndDate, selectedDurationDays, vehicleFilter]);

  // Facebook & Messenger Direct Links
  const FB_PAGE_URL = 'https://www.facebook.com/mirandarentals';
  const MESSENGER_URL = `https://m.me/mirandarentals?text=${encodeURIComponent(inquiryMessage)}`;

  const handleCopyInquiry = () => {
    navigator.clipboard.writeText(inquiryMessage);
    setCopiedInquiry(true);
    setTimeout(() => setCopiedInquiry(false), 2500);
  };

  const handleShareCalendar = () => {
    const url = `${window.location.origin}${window.location.pathname}?view=calendar`;
    navigator.clipboard.writeText(url);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2500);
  };

  return (
    <div id="public-availability-calendar-page" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Ambient background styling */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Public Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-blue-600/25 shrink-0">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block leading-tight">
                Miranda Rentals & Services
              </span>
              <span className="text-xs sm:text-sm font-bold text-white tracking-tight leading-tight block">
                Public Availability Calendar
              </span>
            </div>
          </div>

          {/* Quick Action Links */}
          <div className="flex items-center gap-2">
            <button
              id="public-share-link-btn"
              type="button"
              onClick={handleShareCalendar}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
              title="Copy Public Calendar URL"
            >
              {copiedShareLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline text-emerald-300">Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Share Calendar</span>
                </>
              )}
            </button>

            {onOpenTrackerLookup && (
              <button
                id="public-open-tracker-btn"
                type="button"
                onClick={onOpenTrackerLookup}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Track Booking</span>
              </button>
            )}

            {onOpenAdminLogin && (
              <button
                id="public-open-admin-btn"
                type="button"
                onClick={onOpenAdminLogin}
                className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 rounded-lg text-xs font-semibold text-blue-300 hover:text-white transition-all flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Admin Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Banner with Operating Hours & Direct Channels */}
        <div className="bg-gradient-to-r from-blue-950/60 via-slate-900/90 to-slate-900/90 border border-blue-800/40 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-[11px] font-semibold text-blue-300">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Operating Hours: 8:00 AM – 8:00 PM (Daily)</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Check Vehicle Availability & Reserve Dates
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                Browse our real-time calendar below to view reserved and open schedule slots. Select your target dates to inquire instantly via Messenger.
              </p>
            </div>

            {/* Quick Contact Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                id="header-messenger-btn"
                href={MESSENGER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Messenger</span>
                <ExternalLink className="w-3 h-3 text-blue-200" />
              </a>

              <a
                id="header-fb-page-btn"
                href={FB_PAGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-2"
              >
                <Car className="w-4 h-4 text-sky-400" />
                <span>FB Page</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          </div>
        </div>

        {/* Vehicle Filter & Calendar Toolbar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            {/* Filter by Vehicle Type (Car vs Van) */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-400" />
                <span>Filter Fleet:</span>
              </span>
              <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
                <button
                  id="filter-all-fleet-btn"
                  type="button"
                  onClick={() => setVehicleFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    vehicleFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Fleet
                </button>
                <button
                  id="filter-car-btn"
                  type="button"
                  onClick={() => setVehicleFilter('Car')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    vehicleFilter === 'Car'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Car</span>
                </button>
                <button
                  id="filter-van-btn"
                  type="button"
                  onClick={() => setVehicleFilter('Van')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    vehicleFilter === 'Van'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>🚐 Van</span>
                </button>
              </div>
            </div>

            {/* Month Nav Controls */}
            <div className="flex items-center justify-between sm:justify-end gap-2">
              <button
                type="button"
                onClick={handleToday}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700"
              >
                Today
              </button>
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 text-xs sm:text-sm font-bold text-white min-w-[130px] text-center">
                  {monthName}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Availability Legends (Explicitly highlighted as requested) */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 pt-1 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" />
              <span className="font-semibold text-emerald-300">Available Date</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 shadow-xs shadow-rose-500/50" />
              <span className="font-semibold text-rose-300">Booked / Reserved</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 shadow-xs shadow-amber-400/50" />
              <span className="font-semibold text-amber-300">Today</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 shadow-xs shadow-blue-500/50" />
              <span className="font-semibold text-blue-300">Your Selected Dates</span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="pt-2">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Days Cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map((day) => {
                const dayStatus = getDayAvailability(day.dateString);
                const isSelectedStart = selectedStartDate === day.dateString;
                const isSelectedEnd = selectedEndDate === day.dateString;
                const isInSelectedRange = 
                  selectedStartDate && 
                  selectedEndDate && 
                  day.dateString >= selectedStartDate && 
                  day.dateString <= selectedEndDate;

                // State determination
                let bgClass = 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800/80';
                let textClass = day.isCurrentMonth ? 'text-slate-200' : 'text-slate-600';

                if (day.isPast) {
                  bgClass = 'bg-slate-950/30 border-slate-900/60 opacity-40 cursor-not-allowed';
                } else if (isInSelectedRange || isSelectedStart || isSelectedEnd) {
                  bgClass = 'bg-blue-600/30 border-blue-500 ring-1 ring-blue-400 text-white';
                } else if (dayStatus.isBooked) {
                  bgClass = 'bg-rose-950/30 hover:bg-rose-950/50 border-rose-900/50';
                } else if (day.isCurrentMonth) {
                  bgClass = 'bg-slate-950/70 hover:bg-slate-800 border-slate-800 hover:border-emerald-500/50 cursor-pointer';
                }

                return (
                  <button
                    key={day.dateString}
                    type="button"
                    disabled={day.isPast}
                    onClick={() => handleDayClick(day.dateString, day.isPast)}
                    className={`min-h-[72px] sm:min-h-[90px] p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between text-left transition-all relative overflow-hidden ${bgClass}`}
                  >
                    {/* Top Row: Date number & Today Pill */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs sm:text-sm font-bold ${textClass} ${
                          day.isToday ? 'text-amber-400' : ''
                        }`}
                      >
                        {day.dayOfMonth}
                      </span>
                      {day.isToday && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                          Today
                        </span>
                      )}
                    </div>

                    {/* Booking indicator status */}
                    <div className="space-y-1 my-auto">
                      {dayStatus.isBooked ? (
                        <div className="space-y-0.5">
                          {dayStatus.carBooked && (vehicleFilter === 'all' || vehicleFilter === 'Car') && (
                            <div className="px-1 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] sm:text-[10px] font-bold flex items-center gap-1 truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                              <span className="truncate">Car Booked</span>
                            </div>
                          )}
                          {dayStatus.vanBooked && (vehicleFilter === 'all' || vehicleFilter === 'Van') && (
                            <div className="px-1 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] sm:text-[10px] font-bold flex items-center gap-1 truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                              <span className="truncate">Van Booked</span>
                            </div>
                          )}
                        </div>
                      ) : !day.isPast && day.isCurrentMonth ? (
                        <div className="text-[9px] sm:text-[10px] text-emerald-400/80 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          <span className="hidden sm:inline">Available</span>
                        </div>
                      ) : null}
                    </div>

                    {/* Selection state marker */}
                    {(isSelectedStart || isSelectedEnd) && (
                      <div className="text-[9px] font-bold text-blue-300 bg-blue-500/20 px-1 py-0.2 rounded border border-blue-400/30 text-center">
                        {isSelectedStart && isSelectedEnd ? 'Selected Day' : isSelectedStart ? 'Start Date' : 'Return Date'}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Dates Booking & Instant Inquiry Box */}
        <div className="bg-gradient-to-tr from-slate-900 to-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 block">
                Step 2: Instant Booking Inquiry
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {selectedStartDate ? (
                  <span>
                    Selected: <span className="text-blue-300 font-mono">{selectedStartDate}</span>
                    {selectedEndDate && (
                      <> to <span className="text-blue-300 font-mono">{selectedEndDate}</span> ({selectedDurationDays} Days)</>
                    )}
                  </span>
                ) : (
                  <span>Click on any available date above to start your reservation</span>
                )}
              </h2>
              <p className="text-xs text-slate-400 max-w-xl">
                Ready to book? Send this inquiry directly to our official Messenger or copy the message to text our hotline.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <a
                id="messenger-inquire-cta-btn"
                href={MESSENGER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Inquire via Messenger</span>
                <ExternalLink className="w-3.5 h-3.5 text-blue-200" />
              </a>

              <button
                id="copy-inquiry-text-btn"
                type="button"
                onClick={handleCopyInquiry}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {copiedInquiry ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" />
                    <span>Copy Inquiry Text</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Pre-filled Message Preview Box */}
          <div className="mt-4 p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Message Preview:
            </span>
            <p className="text-xs sm:text-sm font-mono text-slate-300 leading-relaxed italic">
              "{inquiryMessage}"
            </p>
          </div>
        </div>

        {/* Essential Rental Requirements (Mini Guide) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Essential Rental Requirements & Guidelines
              </h3>
              <p className="text-xs text-slate-400">
                Please prepare the following documents upon reservation confirmation
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
            {/* Requirement 1 */}
            <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>1. Valid Driver's License</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Non-Professional or Professional Driver's License (Required for Self-Drive renters).
              </p>
            </div>

            {/* Requirement 2 */}
            <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-sky-400 text-xs font-bold">
                <FileText className="w-4 h-4" />
                <span>2. Government Valid ID</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                At least 1 additional primary valid ID (Passport, UMID, SSS, PhilID, PRC, etc.).
              </p>
            </div>

            {/* Requirement 3 */}
            <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <CreditCard className="w-4 h-4" />
                <span>3. Security Deposit</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Refundable security deposit collected upon release and returned after inspection.
              </p>
            </div>

            {/* Requirement 4 */}
            <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                <Fuel className="w-4 h-4" />
                <span>4. Fuel Policy</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Same-to-Same fuel return policy. Vehicles are handed over clean and ready for travel.
              </p>
            </div>

            {/* Requirement 5 */}
            <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-bold">
                <MapPin className="w-4 h-4" />
                <span>5. Pickup & Delivery Options</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Garage pickup available. Doorstep delivery or Airport/Terminal meetups can also be arranged upon request.
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-6 px-4 text-center text-xs text-slate-400">
        <div className="max-w-4xl mx-auto space-y-2">
          <p className="font-semibold text-slate-300">
            Miranda Rentals & Services • Booking & Reservation Management
          </p>
          <p className="text-slate-400">
            Operating Hours: 8:00 AM – 8:00 PM • Messenger: @mirandarentals
          </p>
        </div>
      </footer>
    </div>
  );
};
