import React, { useState, useMemo } from 'react';
import { 
  Car, ChevronLeft, ChevronRight, 
  MessageCircle, Copy, Check,
  FileText, Fuel, CreditCard, ShieldCheck,
  Search, Share2, AlertTriangle, XCircle,
  FileCheck, UserCheck, ShieldAlert, Download,
  Radio, AlertOctagon, ExternalLink, HelpCircle,
  ChevronDown, Clock, Zap, Tag
} from 'lucide-react';
import { Booking, VehicleType } from '../types';

// Placeholder link storage for Rental Agreement PDF
const RENTAL_AGREEMENT_PDF_URL = "https://storage.googleapis.com/miranda-rentals-public/Miranda_Rentals_Agreement_Form_Placeholder.pdf";
import { 
  getMonthCalendarGrid, 
  formatDateOnly,
  formatFullDate,
  formatTimeOnly,
  isDayBookedForFilter,
  isDateRangeConsecutivelyAvailable,
  getFirstBlockedDateAfter,
  TURNOVER_CLEANING_HOURS,
  RENTAL_RATES,
  getSuggestedRate,
  formatDurationDisplay
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
  const [vehicleFilter, setVehicleFilter] = useState<VehicleType>('Car');
  
  // Date & Time Selection for Inquiring Renters
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
  const [preferredStartTime, setPreferredStartTime] = useState<string>('08:00');
  const [preferredEndTime, setPreferredEndTime] = useState<string>('20:00');
  const [includeCustomTimes, setIncludeCustomTimes] = useState<boolean>(false);

  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [copiedInquiry, setCopiedInquiry] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [rangeWarning, setRangeWarning] = useState<string | null>(null);
  const [showDepositDetails, setShowDepositDetails] = useState(false);

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

    const clickedDayStatus = getDayAvailability(dateString);

    // Case 1: First click or resetting after full range
    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      if (!clickedDayStatus.canStartBooking) {
        if (clickedDayStatus.isStartDay) {
          setRangeWarning(
            `${formatFullDate(dateString)} is an outgoing pick-up date (Pick-up at ${clickedDayStatus.departureTime || 'scheduled time'}). It can only be selected as a return/end date for an earlier rental.`
          );
        } else {
          setRangeWarning(`${formatFullDate(dateString)} is not available for rental pickup.`);
        }
        return;
      }
      setSelectedStartDate(dateString);
      setSelectedEndDate(null);
      return;
    }

    // Case 2: User clicked an earlier date than current start -> Reset start date
    if (dateString < selectedStartDate) {
      if (!clickedDayStatus.canStartBooking) {
        if (clickedDayStatus.isStartDay) {
          setRangeWarning(
            `${formatFullDate(dateString)} is an outgoing pick-up date. It can only be selected as a drop-off date for an earlier rental.`
          );
        } else {
          setRangeWarning(`${formatFullDate(dateString)} is not available for rental pickup.`);
        }
        return;
      }
      setSelectedStartDate(dateString);
      setSelectedEndDate(null);
      return;
    }

    // Case 3: User clicked same date again
    if (dateString === selectedStartDate) {
      setSelectedEndDate(dateString);
      return;
    }

    // Case 4: User clicked a later date as End Date -> Validate consecutive availability
    const rangeCheck = isDateRangeConsecutivelyAvailable(
      selectedStartDate,
      dateString,
      filteredBookings,
      vehicleFilter
    );

    if (!rangeCheck.isConsecutiveAvailable) {
      const blockedDateFormatted = rangeCheck.blockedDate ? formatFullDate(rangeCheck.blockedDate) : 'intermediate dates';
      setRangeWarning(
        rangeCheck.reason ||
        `Cannot select across booked dates (${blockedDateFormatted} is already reserved). You can only select consecutive available days.`
      );
      if (clickedDayStatus.canStartBooking) {
        setSelectedStartDate(dateString);
        setSelectedEndDate(null);
      }
    } else {
      setSelectedEndDate(dateString);
    }
  };

  // Selection range highlighter with boundary check
  const isDayInSelectionRange = (dateString: string) => {
    if (!selectedStartDate) return false;

    if (selectedStartDate && selectedEndDate) {
      return dateString >= selectedStartDate && dateString <= selectedEndDate;
    }

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

  // Calculate approximate duration in hours when custom time is provided
  const customCalculatedHours = useMemo(() => {
    if (!selectedStartDate) return null;
    const endD = selectedEndDate || selectedStartDate;
    try {
      const [sy, sm, sd] = selectedStartDate.split('-').map(Number);
      const [sh, smin] = preferredStartTime.split(':').map(Number);
      const [ey, em, ed] = endD.split('-').map(Number);
      const [eh, emin] = preferredEndTime.split(':').map(Number);
      const startDt = new Date(sy, sm - 1, sd, sh, smin, 0, 0);
      const endDt = new Date(ey, em - 1, ed, eh, emin, 0, 0);
      const diffMs = endDt.getTime() - startDt.getTime();
      if (diffMs > 0) {
        return Math.round((diffMs / (1000 * 3600)) * 10) / 10;
      }
    } catch {
      // ignore
    }
    return null;
  }, [selectedStartDate, selectedEndDate, preferredStartTime, preferredEndTime]);

  // Generate Inquiry Message reflecting flexible timing request
  const inquiryMessage = useMemo(() => {
    const vehicleText = vehicleFilter === 'Car' ? 'Car (Toyota Vios)' : 'Van (Toyota Hiace)';
    const startDayInfo = selectedStartDate ? getDayAvailability(selectedStartDate) : null;
    const endDayInfo = selectedEndDate ? getDayAvailability(selectedEndDate) : null;

    let timingNotes = '';
    if (startDayInfo?.isReturnDay && startDayInfo.readyTime && endDayInfo?.isStartDay && endDayInfo.latestReturnTime) {
      timingNotes = ` (Note: Pick-up after ${startDayInfo.readyTime} cleaning buffer, return by ${endDayInfo.latestReturnTime})`;
    } else if (startDayInfo?.isReturnDay && startDayInfo.readyTime) {
      timingNotes = ` (Note: Available for pick-up after ${startDayInfo.readyTime} cleaning buffer)`;
    } else if (endDayInfo?.isStartDay && endDayInfo.latestReturnTime) {
      timingNotes = ` (Note: Return by ${endDayInfo.latestReturnTime} prior to next reservation)`;
    }

    const timeDetail = includeCustomTimes 
      ? ` from ${formatTimeOnly(preferredStartTime)} to ${formatTimeOnly(preferredEndTime)}${customCalculatedHours ? ` (${formatDurationDisplay(customCalculatedHours)})` : ''}`
      : '';

    if (selectedStartDate && selectedEndDate && selectedStartDate !== selectedEndDate) {
      return `Hi Miranda Rentals and Services! I checked your availability calendar and I would like to inquire about booking a ${vehicleText} from ${formatFullDate(selectedStartDate)} to ${formatFullDate(selectedEndDate)}${timeDetail}${timingNotes}. Can I confirm if this schedule is available for reservation?`;
    } else if (selectedStartDate) {
      return `Hi Miranda Rentals and Services! I checked your availability calendar and I would like to inquire about booking a ${vehicleText} on ${formatFullDate(selectedStartDate)}${timeDetail}${timingNotes}. Can I confirm if this schedule is available for reservation?`;
    }
    return `Hi Miranda Rentals and Services! I would like to inquire about available dates and flexible rates for booking a ${vehicleText}.`;
  }, [selectedStartDate, selectedEndDate, preferredStartTime, preferredEndTime, includeCustomTimes, customCalculatedHours, vehicleFilter, filteredBookings]);

  const FB_PAGE_URL = 'https://www.facebook.com/share/1HMfSvhijx/?mibextid=wwXIfr';
  const MESSENGER_URL = `https://m.me/1193134077224088?text=${encodeURIComponent(inquiryMessage)}`;

  const handleCopyInquiry = () => {
    navigator.clipboard.writeText(inquiryMessage);
    setCopiedInquiry(true);
    setTimeout(() => setCopiedInquiry(false), 2500);
  };

  // Open gadget OS native share
  const handleShareCalendar = async () => {
    const shareUrl = `${window.location.origin}/`;
    const shareData = {
      title: 'Miranda Rentals and Services',
      text: 'Check vehicle availability and inquire for flexible vehicle rentals with Miranda Rentals and Services.',
      url: shareUrl,
    };

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          navigator.clipboard.writeText(shareUrl);
          setCopiedShareLink(true);
          setTimeout(() => setCopiedShareLink(false), 2500);
        }
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
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
          {/* Brand */}
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
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
                Welcome to Miranda Rentals and Services
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Flexible Schedule & Availability Calendar
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                Rentals are not locked to 24 hours. Check open dates below, specify your preferred pick-up and return times, and send your booking inquiry directly to our team.
              </p>
            </div>

            {/* Quick Rates Banner Pill */}
            <div className="bg-blue-50/80 border border-blue-200/90 rounded-xl p-3 shrink-0 space-y-1.5 min-w-[260px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-blue-600" />
                  Rental Rates
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100/90 text-blue-700">
                  Starts with <strong className="font-mono text-blue-900">₱1,000</strong>
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="bg-white p-1.5 rounded-lg border border-blue-100 shadow-2xs">
                  <span className="block text-[10px] text-slate-500 font-medium">12 Hours</span>
                  <span className="block text-[9px] text-blue-600 font-semibold leading-tight">Starts with</span>
                  <strong className="text-xs font-mono font-bold text-blue-700">₱1,000</strong>
                </div>
                <div className="bg-white p-1.5 rounded-lg border border-blue-100 shadow-2xs">
                  <span className="block text-[10px] text-slate-500 font-medium">18 Hours</span>
                  <span className="block text-[9px] text-blue-600 font-semibold leading-tight">Starts with</span>
                  <strong className="text-xs font-mono font-bold text-blue-700">₱1,300</strong>
                </div>
                <div className="bg-white p-1.5 rounded-lg border border-blue-100 shadow-2xs">
                  <span className="block text-[10px] text-slate-500 font-medium">24 Hours</span>
                  <span className="block text-[9px] text-blue-600 font-semibold leading-tight">Starts with</span>
                  <strong className="text-xs font-mono font-bold text-blue-700">₱1,500</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5">
          
          {/* Top Controls Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            {/* Fleet Filter */}
            <div className="w-full sm:w-auto">
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold h-10 items-center sm:min-w-[180px]">
                <button
                  id="filter-car-btn"
                  type="button"
                  onClick={() => {
                    setVehicleFilter('Car');
                    setRangeWarning(null);
                  }}
                  className={`h-8 px-4 rounded-lg transition-all flex items-center justify-center text-center ${
                    vehicleFilter === 'Car'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  Car (Sedan)
                </button>
                <button
                  id="filter-van-btn"
                  type="button"
                  onClick={() => {
                    setVehicleFilter('Van');
                    setRangeWarning(null);
                  }}
                  className={`h-8 px-4 rounded-lg transition-all flex items-center justify-center text-center ${
                    vehicleFilter === 'Van'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  Van (Hiace)
                </button>
              </div>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 shadow-xs"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center px-3 min-w-[140px]">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  {monthName}
                </h2>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 shadow-xs"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleToday}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 ml-1"
              >
                Today
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider py-1">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map((day, idx) => {
                const dayStatus = getDayAvailability(day.dateString);
                const isInRange = isDayInSelectionRange(day.dateString);
                const isSelectedStart = selectedStartDate === day.dateString;
                const isSelectedEnd = selectedEndDate === day.dateString;

                const isClickable = !day.isPast && (
                  !dayStatus.isBooked || 
                  dayStatus.isReturnDay || 
                  (selectedStartDate && !selectedEndDate && dayStatus.isStartDay)
                );

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={day.isPast}
                    onClick={() => handleDayClick(day.dateString, day.isPast, isClickable)}
                    onMouseEnter={() => {
                      if (selectedStartDate && !selectedEndDate && !day.isPast) {
                        setHoverDate(day.dateString);
                      }
                    }}
                    onMouseLeave={() => {
                      if (selectedStartDate && !selectedEndDate) {
                        setHoverDate(null);
                      }
                    }}
                    className={`relative p-1 sm:p-2.5 min-h-[48px] sm:min-h-[82px] rounded-xl sm:rounded-2xl border text-left transition-all select-none ${
                      day.isPast
                        ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50'
                        : isSelectedStart || isSelectedEnd
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600 ring-offset-2 z-10'
                        : isInRange
                        ? 'bg-blue-50 text-blue-900 border-blue-300 shadow-2xs font-semibold'
                        : (dayStatus.isBooked || dayStatus.isStartDay || dayStatus.isReturnDay || dayStatus.isBackToBack)
                        ? 'bg-red-50/80 text-red-950 border-red-200'
                        : day.isCurrentMonth
                        ? 'bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 shadow-2xs'
                        : 'bg-slate-50 text-slate-400 border-slate-100'
                    }`}
                  >
                    {/* MOBILE DISPLAY (< sm): Symmetrical Vertically Centered Date + Single Dot (Red, Green, Blue) */}
                    <div className="flex sm:hidden flex-col items-center justify-center w-full h-full py-0.5 text-center">
                      <span className={`text-xs font-bold leading-none ${
                        isSelectedStart || isSelectedEnd ? 'text-white' : day.isToday ? 'text-blue-600' : ''
                      }`}>
                        {day.dayOfMonth}
                      </span>

                      {!day.isPast && day.isCurrentMonth ? (
                        <div className="flex items-center justify-center mt-1 h-2">
                          {isSelectedStart || isSelectedEnd ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-white shadow-2xs" />
                          ) : (dayStatus.isBooked || dayStatus.isStartDay || dayStatus.isReturnDay || dayStatus.isBackToBack) ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Booked" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Available" />
                          )}
                        </div>
                      ) : (
                        <div className="h-2 mt-1" />
                      )}
                    </div>

                    {/* DESKTOP DISPLAY (>= sm): Top Row (Date + Status Dot) & Bottom Row (Status Text Badge) */}
                    <div className="hidden sm:flex flex-col justify-between w-full h-full">
                      {/* Top Row */}
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs sm:text-sm font-bold ${
                          isSelectedStart || isSelectedEnd ? 'text-white' : day.isToday ? 'text-blue-600' : ''
                        }`}>
                          {day.dayOfMonth}
                        </span>

                        {!day.isPast && (
                          <div className="flex items-center gap-1">
                            {isSelectedStart || isSelectedEnd ? (
                              <Check className="w-3.5 h-3.5 text-white" />
                            ) : (dayStatus.isBooked || dayStatus.isStartDay || dayStatus.isReturnDay || dayStatus.isBackToBack) ? (
                              <span className="w-2 h-2 rounded-full bg-red-500" title="Booked" />
                            ) : day.isCurrentMonth ? (
                              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Available" />
                            ) : null}
                          </div>
                        )}
                      </div>

                      {/* Bottom Status Text Badge on Larger Screens */}
                      <div className="space-y-0.5 w-full">
                        {isSelectedStart || isSelectedEnd ? (
                          <div className="text-[10px] font-bold text-center px-1 py-0.5 rounded bg-white/20 text-white truncate">
                            {isSelectedStart && isSelectedEnd ? 'Selected' : isSelectedStart ? 'Pick-up' : 'Return'}
                          </div>
                        ) : dayStatus.isBackToBack ? (
                          <div className="px-1 py-0.5 rounded text-[9px] font-bold text-center truncate bg-red-100 text-red-800 border border-red-200">
                            Pick-up & Drop-off
                          </div>
                        ) : dayStatus.isStartDay ? (
                          <div className="px-1 py-0.5 rounded text-[9px] font-bold text-center truncate bg-red-100 text-red-800 border border-red-200">
                            Pick-up {dayStatus.departureTime || 'PM'}
                          </div>
                        ) : dayStatus.isReturnDay ? (
                          <div className="px-1 py-0.5 rounded text-[9px] font-bold text-center truncate bg-red-100 text-red-800 border border-red-200">
                            Drop-off {dayStatus.returnTime || 'AM'}
                          </div>
                        ) : dayStatus.isBooked ? (
                          <div className="px-1 py-0.5 rounded text-[10px] font-bold text-center truncate bg-red-100 text-red-800 border border-red-200">
                            Booked
                          </div>
                        ) : !day.isPast && day.isCurrentMonth ? (
                          <div className="text-[9px] text-emerald-700 font-semibold text-center">
                            Available
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Symmetrical 3-Color Legend: Red (Booked), Green (Available), Blue (Selected) */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs font-medium text-slate-700">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                <span className="font-semibold">Available</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-900 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-200" />
                <span className="font-semibold">Booked</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-200" />
                <span className="font-semibold">Selected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Range Conflict Alert Banner */}
        {rangeWarning && (
          <div className="p-4 bg-sky-50 border border-sky-300 rounded-2xl flex items-start justify-between gap-3 text-xs text-sky-900 shadow-xs animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-sky-950">Invalid Date Selection: </strong>
                <span>{rangeWarning}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRangeWarning(null)}
              className="text-sky-600 hover:text-sky-900 p-0.5 rounded-md hover:bg-sky-100/60 transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Selected Dates Booking & Inquiry Box */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
            <div className="space-y-2 flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
                Booking Inquiry (Admin Confirmation)
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {selectedStartDate ? (
                  <span>
                    {(!selectedEndDate || selectedStartDate === selectedEndDate) ? (
                      <>
                        Selected Date: <span className="text-blue-600 font-mono">{formatFullDate(selectedStartDate)}</span>
                      </>
                    ) : (
                      <>
                        Selected Dates: <span className="text-blue-600 font-mono">{formatFullDate(selectedStartDate)}</span> to <span className="text-blue-600 font-mono">{formatFullDate(selectedEndDate)}</span> ({selectedDurationDays} Day/s)
                      </>
                    )}
                  </span>
                ) : (
                  <span>Click on any open date on the calendar above to begin your inquiry</span>
                )}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Rentals are flexible in time. Final schedules and vehicle release are coordinated directly and confirmed with our administration.
              </p>

              {/* Optional Pick-up & Return Time Selector */}
              {selectedStartDate && (
                <div className="pt-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Specify Preferred Time (Optional):</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIncludeCustomTimes(!includeCustomTimes)}
                        className={`text-xs font-bold px-2 py-0.5 rounded transition-all ${
                          includeCustomTimes ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {includeCustomTimes ? 'Custom Time Added' : '+ Add Time (e.g. 5am to 3pm)'}
                      </button>
                    </div>

                    {includeCustomTimes && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Preferred Pick-up Time
                          </label>
                          <input
                            type="time"
                            value={preferredStartTime}
                            onChange={(e) => setPreferredStartTime(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Preferred Return Time
                          </label>
                          <input
                            type="time"
                            value={preferredEndTime}
                            onChange={(e) => setPreferredEndTime(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Symmetrical Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full md:w-auto shrink-0 pt-2 md:pt-0">
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

          {/* Message Preview Box */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Generated Message for Admin:
            </span>
            <p className="text-xs sm:text-sm font-mono text-slate-700 leading-relaxed italic">
              "{inquiryMessage}"
            </p>
          </div>
        </div>

        {/* Essential Rental Requirements */}
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

        {/* Guidelines & Policies */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Rental Guidelines & Policies
              </h3>
              <p className="text-xs text-slate-500">
                Important rules, responsibilities, and cleaning buffer standards
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* Guide 1: ₱300 Booking Deposit */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-2 text-slate-900 text-xs font-bold">
                    <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Booking Deposit (₱300)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDepositDetails(!showDepositDetails)}
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100/70 border border-blue-200/60 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                    title="Why do I need to pay a ₱300 deposit?"
                  >
                    <HelpCircle className="w-3 h-3 text-blue-600" />
                    <span className="font-semibold">{showDepositDetails ? 'Hide details' : 'Why ₱300?'}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showDepositDetails ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Advanced ₱300 deposit to secure calendar slot. Deducted from total rental fee upon checkout.
                </p>
              </div>

              {showDepositDetails && (
                <div className="mt-2 pt-2.5 border-t border-slate-200/80 space-y-1.5 text-[11px] text-slate-600 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-start gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">1</span>
                    <p><strong className="text-slate-800">Deducted from Total:</strong> Counts toward your final payment.</p>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">2</span>
                    <p><strong className="text-slate-800">Locks in your Ride:</strong> Calendar dates are blocked exclusively for you.</p>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">3</span>
                    <p><strong className="text-slate-800">Non-Refundable:</strong> Covers lost opportunity if trip is cancelled.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Guide 2: Fuel Policy */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 flex flex-col h-full">
              <div className="flex items-center gap-2 text-slate-900 text-xs font-bold mb-1.5">
                <Fuel className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Fuel Policy</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Same-to-Same fuel policy. The vehicle must be returned with the exact same fuel level recorded during vehicle release.
              </p>
            </div>

            {/* Guide 3: Mandatory 3-Hour Cleaning Buffer */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 flex flex-col h-full">
              <div className="flex items-center gap-2 text-slate-900 text-xs font-bold mb-1.5">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Mandatory {TURNOVER_CLEANING_HOURS}-Hour Cleaning Buffer</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every vehicle has a mandatory 3-hour buffer between bookings for thorough cleaning, disinfection, and mechanical inspection before the next pickup.
              </p>
            </div>

            {/* Guide 4: Damage Accountability */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 flex flex-col h-full">
              <div className="flex items-center gap-2 text-slate-900 text-xs font-bold mb-1.5">
                <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Damage Accountability</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                The renter assumes full accountability for any collision damage, scratches, dents, stained interiors, or mechanical issues sustained.
              </p>
            </div>

            {/* Guide 5: OR/CR & RFID */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 flex flex-col h-full">
              <div className="flex items-center gap-2 text-slate-900 text-xs font-bold mb-1.5">
                <Radio className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>OR/CR & RFID Security</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                The renter is responsible for safekeeping the vehicle OR/CR copy and toll RFID cards (Autosweep/Easytrip). Loss will incur replacement fees.
              </p>
            </div>

            {/* Guide 6: Limitation of Liability */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 flex flex-col h-full">
              <div className="flex items-center gap-2 text-slate-900 text-xs font-bold mb-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Limitation of Liability</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Miranda Rentals and Services is not liable for travel delays or accidents during client use. The renter assumes operational responsibility.
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
            <span>Operating Hours: Flexible (Admin Coordinated)</span>
            <span className="hidden sm:inline text-slate-400">•</span>
            <span>Facebook: Miranda Rentals and Services</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
