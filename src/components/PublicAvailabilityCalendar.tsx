import React, { useState, useMemo } from 'react';
import { 
  Car, ChevronLeft, ChevronRight, 
  MessageCircle, Copy, Check,
  FileText, Fuel, CreditCard, ShieldCheck,
  Search, Share2, AlertTriangle, XCircle,
  FileCheck, UserCheck, ShieldAlert, Download,
  Radio, AlertOctagon, ExternalLink
} from 'lucide-react';
import { Booking, VehicleType } from '../types';

// Placeholder link storage for Rental Agreement PDF - replace with your Google Drive / Cloud storage link
const RENTAL_AGREEMENT_PDF_URL = "https://storage.googleapis.com/miranda-rentals-public/Miranda_Rentals_Agreement_Form_Placeholder.pdf";
import { 
  getMonthCalendarGrid, 
  getBookingStartDateTime, 
  getBookingEndDateTime,
  formatDateOnly,
  formatFullDate,
  isDayBookedForFilter,
  isDateRangeConsecutivelyAvailable,
  getFirstBlockedDateAfter
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
}) => {
  // Navigation & Date State
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [vehicleFilter, setVehicleFilter] = useState<'all' | VehicleType>('all');
  
  // Date Selection for Renters
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [copiedInquiry, setCopiedInquiry] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [rangeWarning, setRangeWarning] = useState<string | null>(null);

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

  // Filter bookings based on vehicle category
  const filteredBookings = useMemo(() => {
    if (vehicleFilter === 'all') return bookings;
    return bookings.filter((b) => b.vehicle === vehicleFilter);
  }, [bookings, vehicleFilter]);

  // Compute status for each day using centralized utility
  const getDayAvailability = (dateString: string) => {
    return isDayBookedForFilter(dateString, filteredBookings, vehicleFilter);
  };

  // Date click logic - Enforces strictly consecutive available days
  const handleDayClick = (dateString: string, isPast: boolean, isClickable: boolean) => {
    if (isPast || !isClickable) return;
    setRangeWarning(null);

    // Case 1: First click or resetting after full range
    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      setSelectedStartDate(dateString);
      setSelectedEndDate(null);
      return;
    }

    // Case 2: User clicked an earlier date or same date -> Reset start date
    if (dateString <= selectedStartDate) {
      setSelectedStartDate(dateString);
      setSelectedEndDate(null);
      return;
    }

    // Case 3: User clicked a later date as End Date -> Validate that every single day in between is available
    const rangeCheck = isDateRangeConsecutivelyAvailable(
      selectedStartDate,
      dateString,
      filteredBookings,
      vehicleFilter
    );

    if (!rangeCheck.isConsecutiveAvailable) {
      // Range contains one or more booked days
      const blockedDateFormatted = rangeCheck.blockedDate ? formatDateOnly(rangeCheck.blockedDate) : 'intermediate dates';
      setRangeWarning(
        `Cannot select across booked dates (${blockedDateFormatted} is already reserved). You can only select consecutive available days.`
      );
      // Reset start to newly clicked date
      setSelectedStartDate(dateString);
      setSelectedEndDate(null);
    } else {
      setSelectedEndDate(dateString);
    }
  };

  // Selection range highlighter with boundary check
  const isDayInSelectionRange = (dateString: string) => {
    if (!selectedStartDate) return false;

    // Fixed completed range
    if (selectedStartDate && selectedEndDate) {
      return dateString >= selectedStartDate && dateString <= selectedEndDate;
    }

    // Interactive hover state: Stop highlighting if hover crosses a booked day
    if (selectedStartDate && !selectedEndDate && hoverDate && hoverDate >= selectedStartDate) {
      const blocked = getFirstBlockedDateAfter(selectedStartDate, filteredBookings, vehicleFilter);
      const effectiveHover = blocked && hoverDate >= blocked ? null : hoverDate;
      if (!effectiveHover) return dateString === selectedStartDate;
      return dateString >= selectedStartDate && dateString <= effectiveHover;
    }

    return dateString === selectedStartDate;
  };

  const selectedDurationDays = useMemo(() => {
    if (!selectedStartDate) return 0;
    if (!selectedEndDate) return 1;
    const start = new Date(selectedStartDate).getTime();
    const end = new Date(selectedEndDate).getTime();
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff + 1);
  }, [selectedStartDate, selectedEndDate]);

  // Generate Inquiry Message with full Month D, YYYY format
  const inquiryMessage = useMemo(() => {
    const vehicleText = vehicleFilter === 'all' ? 'Car' : vehicleFilter;
    if (selectedStartDate && selectedEndDate && selectedStartDate !== selectedEndDate) {
      return `Hi Miranda Rentals and Services! I checked your availability calendar and I would like to inquire about booking a ${vehicleText} from ${formatFullDate(selectedStartDate)} to ${formatFullDate(selectedEndDate)} (${selectedDurationDays} Day/s). Can I confirm these dates are available for reservation?`;
    } else if (selectedStartDate) {
      return `Hi Miranda Rentals and Services! I checked your availability calendar and I would like to inquire about booking a ${vehicleText} for ${formatFullDate(selectedStartDate)} (1 Day/s). Can I confirm these dates are available for reservation?`;
    }
    return `Hi Miranda Rentals and Services! I would like to inquire about available dates for booking a ${vehicleText}.`;
  }, [selectedStartDate, selectedEndDate, selectedDurationDays, vehicleFilter]);

  const FB_PAGE_URL = 'https://www.facebook.com/share/1HMfSvhijx/?mibextid=wwXIfr';
  const MESSENGER_URL = `https://m.me/1193134077224088?text=${encodeURIComponent(inquiryMessage)}`;

  const handleCopyInquiry = () => {
    navigator.clipboard.writeText(inquiryMessage);
    setCopiedInquiry(true);
    setTimeout(() => setCopiedInquiry(false), 2500);
  };

  // Open gadget OS native share (iPhone / Android / Mac / Windows share sheet)
  const handleShareCalendar = async () => {
    const shareUrl = `${window.location.origin}/`;
    const shareData = {
      title: 'Miranda Rentals and Services',
      text: 'Check vehicle availability and reserve your rental online with Miranda Rentals and Services.',
      url: shareUrl,
    };

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          // If native share fails or is blocked, fallback to clipboard
          navigator.clipboard.writeText(shareUrl);
          setCopiedShareLink(true);
          setTimeout(() => setCopiedShareLink(false), 2500);
        }
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      // Fallback for browsers without Web Share API
      navigator.clipboard.writeText(shareUrl);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2500);
    }
  };

  return (
    <div id="public-availability-calendar-page" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Top Clean White Navbar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Brand - Just Miranda Rentals and Services */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Car className="w-5 h-5" />
            </div>
            <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight">
              Miranda Rentals and Services
            </span>
          </div>

          {/* Action Links: OS Native Share & Track Booking */}
          <div className="flex items-center gap-2">
            <button
              id="public-share-link-btn"
              type="button"
              onClick={handleShareCalendar}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
              title="Share Page"
            >
              {copiedShareLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Share</span>
                </>
              )}
            </button>

            {onOpenTrackerLookup && (
              <button
                id="public-open-tracker-btn"
                type="button"
                onClick={onOpenTrackerLookup}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-all flex items-center gap-1.5 shadow-xs"
              >
                <Search className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Track Booking</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Welcome Banner & Vehicle Schedule Info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-2">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
              Welcome to Miranda Rentals and Services
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Vehicle Schedule Calendar
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
            Check open dates on our calendar below. Select your target start and return dates to easily inquire and reserve via Facebook and Messenger.
          </p>
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

          {/* Symmetrical Color Legends (Red for Booked, Green for Available, Blue for Selected, Yellow for Today) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700">
            <div className="flex items-center justify-center gap-2 py-1.5 px-2 bg-white rounded-lg border border-slate-200/60 shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100 shrink-0" />
              <span className="font-semibold text-emerald-800 text-center truncate">Available</span>
            </div>
            <div className="flex items-center justify-center gap-2 py-1.5 px-2 bg-white rounded-lg border border-slate-200/60 shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-100 shrink-0" />
              <span className="font-semibold text-red-700 text-center truncate">Booked</span>
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
                const isInSelectedRange = isDayInSelectionRange(day.dateString);

                let bgClass = 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-2xs';
                let textClass = day.isCurrentMonth ? 'text-slate-800' : 'text-slate-300';

                if (day.isPast) {
                  bgClass = 'bg-slate-100/70 border-slate-200/60 opacity-50 cursor-not-allowed';
                } else if (isSelectedStart || isSelectedEnd) {
                  bgClass = 'bg-blue-600 text-white font-bold ring-2 ring-blue-500 shadow-md shadow-blue-500/20';
                  textClass = 'text-white';
                } else if (isInSelectedRange) {
                  bgClass = 'bg-blue-50/90 border-blue-300 text-blue-900 font-semibold';
                  textClass = 'text-blue-950';
                } else if (day.isToday) {
                  // Today is the ONLY date with an amber border
                  bgClass = !dayStatus.isClickable 
                    ? 'bg-red-50/50 border-2 border-amber-400 text-red-900 cursor-not-allowed shadow-xs'
                    : 'bg-amber-50/40 border-2 border-amber-400 text-slate-900 hover:border-amber-500 cursor-pointer shadow-xs';
                } else if (!dayStatus.isClickable) {
                  bgClass = 'bg-red-50/50 border border-red-200/80 text-red-900 cursor-not-allowed';
                } else if (day.isCurrentMonth) {
                  bgClass = 'bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 cursor-pointer';
                }

                return (
                  <button
                    key={day.dateString}
                    type="button"
                    disabled={day.isPast || !dayStatus.isClickable}
                    onClick={() => handleDayClick(day.dateString, day.isPast, dayStatus.isClickable)}
                    onMouseEnter={() => setHoverDate(day.dateString)}
                    className={`min-h-[56px] sm:min-h-[92px] p-1 sm:p-2 rounded-xl flex flex-col justify-between text-left transition-all relative overflow-hidden ${bgClass}`}
                  >
                    {/* Header: Day number */}
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs sm:text-sm font-bold ${
                          isSelectedStart || isSelectedEnd
                            ? 'text-white'
                            : day.isToday
                            ? 'text-amber-900 ring-1 ring-amber-400 bg-amber-100/90 px-1 sm:px-1.5 py-0.5 rounded-md'
                            : textClass
                        }`}
                      >
                        {day.dayOfMonth}
                      </span>
                    </div>

                    {/* Middle: Centered Status Legend Dot */}
                    {day.isCurrentMonth && !day.isPast && (
                      <div className="my-auto flex items-center justify-center pointer-events-none py-0.5">
                        {dayStatus.isBooked ? (
                          <span className="w-2 h-2 rounded-full bg-red-500 ring-2 ring-red-200" title="Booked" />
                        ) : isInSelectedRange || isSelectedStart || isSelectedEnd ? (
                          <span className={`w-2 h-2 rounded-full ${isSelectedStart || isSelectedEnd ? 'bg-white' : 'bg-blue-500'}`} />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" title="Available" />
                        )}
                      </div>
                    )}

                    {/* Booking badge indicators / Selection status marker (Desktop only - No text on mobile dates) */}
                    <div className="hidden sm:block space-y-0.5 w-full">
                      {isSelectedStart || isSelectedEnd ? (
                        <div className="text-[10px] font-bold text-center px-1 py-0.5 rounded bg-white/20 text-white truncate">
                          {isSelectedStart && isSelectedEnd ? (
                            <span>Selected</span>
                          ) : isSelectedStart ? (
                            <span>Start</span>
                          ) : (
                            <span>End</span>
                          )}
                        </div>
                      ) : dayStatus.isBooked ? (
                        <div className="space-y-0.5">
                          {dayStatus.carBooked && (vehicleFilter === 'all' || vehicleFilter === 'Car') && (
                            <div className="px-1 py-0.5 rounded text-[10px] font-bold flex items-center justify-start gap-1 truncate bg-red-100 text-red-700 border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-red-600" />
                              <span className="truncate">Car Booked</span>
                            </div>
                          )}
                          {dayStatus.vanBooked && (vehicleFilter === 'all' || vehicleFilter === 'Van') && (
                            <div className="px-1 py-0.5 rounded text-[10px] font-bold flex items-center justify-start gap-1 truncate bg-red-100 text-red-700 border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-red-600" />
                              <span className="truncate">Van Booked</span>
                            </div>
                          )}
                        </div>
                      ) : !day.isPast && day.isCurrentMonth ? (
                        <div className="text-[9px] text-emerald-700 font-semibold flex items-center justify-center gap-1">
                          <span>Available</span>
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Range Conflict Alert Banner */}
        {rangeWarning && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start justify-between gap-3 text-xs text-amber-900 shadow-xs animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-amber-950">Invalid Date Selection: </strong>
                <span>{rangeWarning}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRangeWarning(null)}
              className="text-amber-600 hover:text-amber-900 p-0.5 rounded-md hover:bg-amber-100/60 transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Selected Dates Booking & Inquiry Box */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
                Booking Inquiry
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {selectedStartDate ? (
                  <span>
                    {(!selectedEndDate || selectedStartDate === selectedEndDate) ? (
                      <>
                        Selected Date: <span className="text-blue-600 font-mono">{formatFullDate(selectedStartDate)}</span> (1 Day/s)
                      </>
                    ) : (
                      <>
                        Selected Dates: <span className="text-blue-600 font-mono">{formatFullDate(selectedStartDate)}</span> to <span className="text-blue-600 font-mono">{formatFullDate(selectedEndDate)}</span> ({selectedDurationDays} Day/s)
                      </>
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

            {/* Symmetrical Action Buttons without redirect arrows */}
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

        {/* SECTION 1: Essential Rental Requirements */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Essential Rental Requirements
                </h3>
                <p className="text-xs text-slate-500">
                  Please prepare and submit these necessary documents upon booking reservation
                </p>
              </div>
            </div>

            {/* Placeholder Link for Agreement Form PDF */}
            <a
              href={RENTAL_AGREEMENT_PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-xs font-bold rounded-xl transition-all shadow-2xs group shrink-0"
              title="Download official rental agreement form"
            >
              <Download className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
              <span>Download Agreement Form (PDF)</span>
              <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-500" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Req 1 */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-blue-700 text-xs font-bold mb-1">
                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>1. Reservation Form</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Duly filled-out reservation form detailing trip itinerary, dates, and primary contact info.
                </p>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 block pt-1 border-t border-slate-200/60">
                Booking Information
              </span>
            </div>

            {/* Req 2 */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-blue-700 text-xs font-bold mb-1">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>2. Driver’s License</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Valid Non-Professional or Professional driver’s license to confirm driving capability.
                </p>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 block pt-1 border-t border-slate-200/60">
                Driver Capability Verification
              </span>
            </div>

            {/* Req 3 */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-blue-700 text-xs font-bold mb-1">
                  <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>3. Valid Government ID</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  One primary valid government ID (Passport, UMID, SSS, PhilID, PRC) to confirm legitimacy.
                </p>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 block pt-1 border-t border-slate-200/60">
                Identity Authentication
              </span>
            </div>

            {/* Req 4 */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-blue-700 text-xs font-bold mb-1">
                  <FileCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>4. Signed Agreement</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Signed contract acknowledging terms. Electronic signatures (E-signature) are fully accepted.
                </p>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 block pt-1 border-t border-slate-200/60">
                E-Signatures Accepted
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 2: Guidelines & Policies */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Rental Guidelines & Policies
              </h3>
              <p className="text-xs text-slate-500">
                Important rules, responsibilities, and terms for all renters and drivers
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* Guide 1 */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-slate-900 text-xs font-bold">
                <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Security Deposit</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                A refundable security deposit is collected before turnover and returned in full upon vehicle checkout after inspection.
              </p>
            </div>

            {/* Guide 2 */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-slate-900 text-xs font-bold">
                <Fuel className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Fuel Policy</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Same-to-Same fuel policy. The vehicle must be returned with the exact same fuel level recorded during vehicle release.
              </p>
            </div>

            {/* Guide 3 */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-slate-900 text-xs font-bold">
                <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Damage Accountability</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                The renter assumes full accountability for any collision damage, scratches, dents, stained interiors, or mechanical issues sustained.
              </p>
            </div>

            {/* Guide 4 */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-slate-900 text-xs font-bold">
                <Radio className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>OR/CR & RFID Security Responsibility</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                The renter is responsible for safekeeping the vehicle OR/CR copy and toll RFID cards (Autosweep/Easytrip). Loss will incur replacement fees.
              </p>
            </div>

            {/* Guide 5 */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 md:col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 text-slate-900 text-xs font-bold">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Limitation of Liability & Accident Waiver</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Miranda Rentals and Services is not liable for any accidents, third-party injuries/property damage, traffic citations, or travel delays/inconveniences caused during the use of our vehicle. Renter assumes complete operational responsibility.
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* Clean Footer */}
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

