import React, { useState, useMemo } from 'react';
import { 
  Car, ChevronLeft, ChevronRight, 
  MessageCircle, ExternalLink, Copy, Check,
  FileText, Fuel, CreditCard, ShieldCheck, Filter,
  Lock, Search, Share2, Facebook
} from 'lucide-react';
import { Booking, VehicleType } from '../types';
import { 
  getMonthCalendarGrid, 
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

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filter bookings based on vehicle category (exclude cancelled bookings)
  const filteredBookings = useMemo(() => {
    const active = bookings.filter((b) => b.status !== 'Cancelled');
    if (vehicleFilter === 'all') return active;
    return active.filter((b) => b.vehicle === vehicleFilter);
  }, [bookings, vehicleFilter]);

  // Compute status for each day
  // Rule: When a date has been booked, the last date (return/checkout day) is the only booked date that can be clicked for new booking.
  const getDayAvailability = (dateString: string) => {
    const carBookings = filteredBookings.filter((b) => {
      if (b.vehicle !== 'Car') return false;
      const targetDayStart = new Date(`${dateString}T00:00:00`).getTime();
      const targetDayEnd = new Date(`${dateString}T23:59:59.999`).getTime();
      const start = getBookingStartDateTime(b).getTime();
      const end = getBookingEndDateTime(b).getTime();
      return start <= targetDayEnd && end >= targetDayStart;
    });

    const vanBookings = filteredBookings.filter((b) => {
      if (b.vehicle !== 'Van') return false;
      const targetDayStart = new Date(`${dateString}T00:00:00`).getTime();
      const targetDayEnd = new Date(`${dateString}T23:59:59.999`).getTime();
      const start = getBookingStartDateTime(b).getTime();
      const end = getBookingEndDateTime(b).getTime();
      return start <= targetDayEnd && end >= targetDayStart;
    });

    const carBooked = carBookings.length > 0;
    const vanBooked = vanBookings.length > 0;

    // A vehicle booking blocks the date if the date is BEFORE the booking's end date (i.e. start day or middle day)
    const carIsBlocked = carBookings.some((b) => dateString < b.endDate);
    const carIsLastDay = carBooked && !carIsBlocked;

    const vanIsBlocked = vanBookings.some((b) => dateString < b.endDate);
    const vanIsLastDay = vanBooked && !vanIsBlocked;

    let isClickable = true;
    if (vehicleFilter === 'Car') {
      isClickable = !carIsBlocked; // Clickable if not booked, OR if it's the last day of booking
    } else if (vehicleFilter === 'Van') {
      isClickable = !vanIsBlocked; // Clickable if not booked, OR if it's the last day of booking
    } else {
      // 'all': Clickable if at least one vehicle category is available or on return day
      isClickable = !carIsBlocked || !vanIsBlocked;
    }

    return {
      isBooked: carBooked || vanBooked,
      carBooked,
      vanBooked,
      carIsLastDay,
      vanIsLastDay,
      isClickable,
      bookingCount: carBookings.length + vanBookings.length,
    };
  };

  // Date click logic
  const handleDayClick = (dateString: string, isPast: boolean, isClickable: boolean) => {
    if (isPast || !isClickable) return;

    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      setSelectedStartDate(dateString);
      setSelectedEndDate(null);
    } else {
      if (dateString < selectedStartDate) {
        setSelectedStartDate(dateString);
        setSelectedEndDate(null);
      } else {
        setSelectedEndDate(dateString);
      }
    }
  };

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
      return `Hi Miranda Rentals and Services! I checked your availability calendar and I would like to inquire about booking a ${vehicleText} from ${selectedStartDate} to ${selectedEndDate} (${selectedDurationDays} days). Are these dates available for reservation?`;
    } else if (selectedStartDate) {
      return `Hi Miranda Rentals and Services! I checked your availability calendar and I would like to inquire about booking a ${vehicleText} starting on ${selectedStartDate}. Are these dates available for reservation?`;
    }
    return `Hi Miranda Rentals and Services! I would like to inquire about available dates for booking a ${vehicleText}.`;
  }, [selectedStartDate, selectedEndDate, selectedDurationDays, vehicleFilter]);

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
    <div id="public-availability-calendar-page" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Top Clean White Navbar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block leading-tight">
                Miranda Rentals and Services
              </span>
              <span className="text-sm font-bold text-slate-900 tracking-tight leading-tight block">
                Calendar
              </span>
            </div>
          </div>

          {/* Action Links */}
          <div className="flex items-center gap-2">
            <button
              id="public-share-link-btn"
              type="button"
              onClick={handleShareCalendar}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 transition-all flex items-center gap-1.5 shadow-xs"
              title="Copy Public Calendar URL"
            >
              {copiedShareLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline text-emerald-700">Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Share Calendar</span>
                </>
              )}
            </button>

            {onOpenTrackerLookup && (
              <button
                id="public-open-tracker-btn"
                type="button"
                onClick={onOpenTrackerLookup}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 transition-all flex items-center gap-1.5 shadow-xs"
              >
                <Search className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Track Booking</span>
              </button>
            )}

            {onOpenAdminLogin && (
              <button
                id="public-open-admin-btn"
                type="button"
                onClick={onOpenAdminLogin}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin Access</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Banner with Direct Channels */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Vehicle Schedule & Booking Availability
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Check open dates on our calendar below. Select your target start and return dates to easily inquire and reserve via Facebook Messenger.
            </p>
          </div>

          {/* Symmetrical Contact Buttons (Equal width & height) */}
          <div className="grid grid-cols-2 gap-2.5 w-full sm:w-auto shrink-0">
            <a
              id="header-messenger-btn"
              href={MESSENGER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 min-w-[130px]"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>Messenger</span>
              <ExternalLink className="w-3 h-3 text-blue-200 shrink-0" />
            </a>

            <a
              id="header-fb-page-btn"
              href={FB_PAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 min-w-[130px]"
            >
              <Facebook className="w-4 h-4 text-blue-600 shrink-0" />
              <span>FB Page</span>
              <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
            </a>
          </div>
        </div>

        {/* Calendar Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5">
          
          {/* Top Controls Toolbar: Clean, Symmetrical & Fully Responsive */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            {/* Fleet Filter: Equal 3-column segmented button */}
            <div className="w-full sm:w-auto">
              <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold h-10 items-center sm:min-w-[240px]">
                <button
                  id="filter-all-fleet-btn"
                  type="button"
                  onClick={() => setVehicleFilter('all')}
                  className={`h-8 px-3 rounded-lg transition-all flex items-center justify-center text-center ${
                    vehicleFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  All
                </button>
                <button
                  id="filter-car-btn"
                  type="button"
                  onClick={() => setVehicleFilter('Car')}
                  className={`h-8 px-3 rounded-lg transition-all flex items-center justify-center text-center ${
                    vehicleFilter === 'Car'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  Car
                </button>
                <button
                  id="filter-van-btn"
                  type="button"
                  onClick={() => setVehicleFilter('Van')}
                  className={`h-8 px-3 rounded-lg transition-all flex items-center justify-center text-center ${
                    vehicleFilter === 'Van'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  Van
                </button>
              </div>
            </div>

            {/* Month Navigation Controls: Equal heights & perfectly aligned */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleToday}
                className="h-10 px-4 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 shadow-xs transition-all shrink-0 flex items-center justify-center"
              >
                Today
              </button>
              <div className="flex-1 sm:flex-initial flex items-center justify-between bg-slate-100 border border-slate-200 rounded-xl p-1 h-10 sm:min-w-[190px]">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all shrink-0 shadow-2xs"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-xs sm:text-sm font-bold text-slate-900 text-center truncate select-none">
                  {monthName}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all shrink-0 shadow-2xs"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Symmetrical Color Legends (Symmetric 4-part grid division) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700">
            <div className="flex items-center justify-center gap-2 py-1.5 px-2 bg-white rounded-lg border border-slate-200/60 shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100 shrink-0" />
              <span className="font-semibold text-emerald-800 text-center truncate">Available Date</span>
            </div>
            <div className="flex items-center justify-center gap-2 py-1.5 px-2 bg-white rounded-lg border border-slate-200/60 shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-100 shrink-0" />
              <span className="font-semibold text-rose-800 text-center truncate">Booked / Reserved</span>
            </div>
            <div className="flex items-center justify-center gap-2 py-1.5 px-2 bg-white rounded-lg border border-slate-200/60 shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-100 shrink-0" />
              <span className="font-semibold text-amber-800 text-center truncate">Today</span>
            </div>
            <div className="flex items-center justify-center gap-2 py-1.5 px-2 bg-white rounded-lg border border-slate-200/60 shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-100 shrink-0" />
              <span className="font-semibold text-blue-800 text-center truncate">Selected Dates</span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div>
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Calendar Days */}
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

                let bgClass = 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-2xs';
                let textClass = day.isCurrentMonth ? 'text-slate-800' : 'text-slate-300';

                if (day.isPast) {
                  bgClass = 'bg-slate-100/70 border-slate-200/60 opacity-50 cursor-not-allowed';
                } else if (isInSelectedRange || isSelectedStart || isSelectedEnd) {
                  bgClass = 'bg-blue-50 border-blue-500 ring-2 ring-blue-500 text-blue-900';
                } else if (!dayStatus.isClickable) {
                  bgClass = 'bg-rose-50/60 border-rose-200 opacity-60 cursor-not-allowed';
                } else if (dayStatus.isBooked) {
                  // The last day of booking is clickable for a new reservation
                  bgClass = 'bg-white hover:bg-slate-50 border-amber-300 hover:border-blue-400 cursor-pointer shadow-xs';
                } else if (day.isCurrentMonth) {
                  bgClass = 'bg-white hover:bg-slate-50 border-slate-200 hover:border-blue-400 cursor-pointer';
                }

                return (
                  <button
                    key={day.dateString}
                    type="button"
                    disabled={day.isPast || !dayStatus.isClickable}
                    onClick={() => handleDayClick(day.dateString, day.isPast, dayStatus.isClickable)}
                    className={`min-h-[70px] sm:min-h-[88px] p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between text-left transition-all relative overflow-hidden ${bgClass}`}
                  >
                    {/* Header: Clean Day number (Today pill removed to avoid clipping) */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs sm:text-sm font-bold ${textClass} ${
                          day.isToday ? 'text-blue-600 ring-1 ring-blue-400 bg-blue-50 px-1.5 py-0.5 rounded-md' : ''
                        }`}
                      >
                        {day.dayOfMonth}
                      </span>
                    </div>

                    {/* Booking badge indicators */}
                    <div className="space-y-1 my-auto">
                      {dayStatus.isBooked ? (
                        <div className="space-y-1">
                          {dayStatus.carBooked && (vehicleFilter === 'all' || vehicleFilter === 'Car') && (
                            <div className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 truncate ${
                              dayStatus.carIsLastDay 
                                ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                : 'bg-rose-100 text-rose-700 border border-rose-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dayStatus.carIsLastDay ? 'bg-amber-600' : 'bg-rose-600'}`} />
                              <span className="truncate">{dayStatus.carIsLastDay ? 'Car Return' : 'Car Booked'}</span>
                            </div>
                          )}
                          {dayStatus.vanBooked && (vehicleFilter === 'all' || vehicleFilter === 'Van') && (
                            <div className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 truncate ${
                              dayStatus.vanIsLastDay 
                                ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                : 'bg-rose-100 text-rose-700 border border-rose-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dayStatus.vanIsLastDay ? 'bg-amber-600' : 'bg-rose-600'}`} />
                              <span className="truncate">{dayStatus.vanIsLastDay ? 'Van Return' : 'Van Booked'}</span>
                            </div>
                          )}
                        </div>
                      ) : !day.isPast && day.isCurrentMonth ? (
                        <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="hidden sm:inline">Available</span>
                        </div>
                      ) : null}
                    </div>

                    {/* Selection status marker - compact Start/End for mobile */}
                    {(isSelectedStart || isSelectedEnd) && (
                      <div className="text-[9px] sm:text-[10px] font-bold text-blue-700 bg-blue-100/90 border border-blue-200 px-1 py-0.5 rounded text-center truncate shadow-2xs">
                        {isSelectedStart && isSelectedEnd ? 'Start/End' : isSelectedStart ? 'Start' : 'End'}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Dates Booking & Inquiry Box */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
                Instant Booking Inquiry
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {selectedStartDate ? (
                  <span>
                    Selected Dates: <span className="text-blue-600 font-mono">{selectedStartDate}</span>
                    {selectedEndDate && (
                      <> to <span className="text-blue-600 font-mono">{selectedEndDate}</span> ({selectedDurationDays} Days)</>
                    )}
                  </span>
                ) : (
                  <span>Click on any available date above to start your reservation</span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Send your inquiry directly to our official Messenger or copy the message to text us.
              </p>
            </div>

            {/* Symmetrical Action Buttons (Inquire on messenger & copy text div) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full md:w-auto shrink-0">
              <a
                id="messenger-inquire-cta-btn"
                href={MESSENGER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 min-w-[180px]"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>Inquire on Messenger</span>
                <ExternalLink className="w-3.5 h-3.5 text-blue-200 shrink-0" />
              </a>

              <button
                id="copy-inquiry-text-btn"
                type="button"
                onClick={handleCopyInquiry}
                className="h-11 px-5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 min-w-[180px]"
              >
                {copiedInquiry ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Clean Message Box */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Message Preview:
            </span>
            <p className="text-xs sm:text-sm font-mono text-slate-700 leading-relaxed italic">
              "{inquiryMessage}"
            </p>
          </div>
        </div>

        {/* Essential Rental Requirements (Symmetrical 4-Card Grid) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Essential Rental Requirements & Guidelines
              </h3>
              <p className="text-xs text-slate-500">
                Please prepare the following requirements upon reservation
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
            {/* Card 1 */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-blue-700 text-xs font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>1. Driver's License</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Non-Pro or Professional Driver's License for self-drive rentals.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-blue-700 text-xs font-bold">
                <FileText className="w-4 h-4" />
                <span>2. Valid Government ID</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                1 primary ID (Passport, UMID, SSS, PhilID, or PRC).
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-blue-700 text-xs font-bold">
                <CreditCard className="w-4 h-4" />
                <span>3. Security Deposit</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Refundable security deposit returned upon vehicle checkout.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-blue-700 text-xs font-bold">
                <Fuel className="w-4 h-4" />
                <span>4. Fuel Policy</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Same-to-Same fuel return policy across all fleet units.
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* Clean Footer (Individual rows on mobile as requested) */}
      <footer className="border-t border-slate-200 bg-white py-6 px-4 text-center text-xs text-slate-600 mt-auto">
        <div className="max-w-4xl mx-auto space-y-2">
          <p className="font-bold text-slate-900 text-sm">
            Miranda Rentals and Services
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-1.5 sm:gap-2 text-slate-600">
            <span>Operating Hours: 8:00 AM – 8:00 PM</span>
            <span className="hidden sm:inline text-slate-400">•</span>
            <span>Facebook: Miranda Rentals and Services</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
