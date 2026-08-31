import { Booking, BookingTimeCalculation, DateConflict, VehicleType } from '../types';

/**
 * Standard policy rules:
 * - Flexible booking support: customer/admin can book any duration (e.g. 10 hours, 12 hours, 18 hours, 24 hours, multi-day).
 * - 3 hours mandatory turnaround & cleaning buffer between bookings on the same vehicle.
 */
export const TURNOVER_CLEANING_HOURS = 3;

/**
 * Standard Rates Configuration:
 * - 12 Hours: ₱1,000
 * - 18 Hours: ₱1,300
 * - 24 Hours: ₱1,500
 */
export const RENTAL_RATES = {
  HOURS_12: 1000,
  HOURS_18: 1300,
  HOURS_24: 1500,
} as const;

/**
 * Standard Mandatory Deposit:
 * - ₱300 security deposit required to lock in calendar & secure vehicle booking.
 * - Deducted from overall rental fee on live tracker / final settlement.
 */
export const STANDARD_DEPOSIT_AMOUNT = 300;

export interface PaymentBreakdown {
  totalFee: number;
  depositDeduction: number;
  isDepositPaid: boolean;
  remainingBalance: number;
  isPaidInFull: boolean;
  formattedTotal: string;
  formattedDeposit: string;
  formattedBalance: string;
}

/**
 * Calculates complete payment breakdown: total rental fee, ₱300 deposit deduction, and remaining balance
 */
export function computeBookingPaymentBreakdown(booking?: {
  paymentAmount?: number | string;
  durationHours?: number;
  depositPaid?: boolean;
  depositAmount?: number | string;
  downpaymentAmount?: number | string;
  paymentStatus?: 'pending' | 'paid' | 'partial';
}): PaymentBreakdown {
  if (!booking) {
    return {
      totalFee: 0,
      depositDeduction: 0,
      isDepositPaid: false,
      remainingBalance: 0,
      isPaidInFull: false,
      formattedTotal: '₱0',
      formattedDeposit: '₱0',
      formattedBalance: '₱0',
    };
  }

  const rawTotal = typeof booking.paymentAmount === 'number'
    ? booking.paymentAmount
    : typeof booking.paymentAmount === 'string'
    ? parseFloat(booking.paymentAmount.replace(/[^0-9.]/g, '')) || 0
    : 0;

  const totalFee = rawTotal > 0 ? rawTotal : (booking.durationHours ? getSuggestedRate(booking.durationHours) : 0);

  // Deposit is considered paid if depositPaid is true OR (if not explicitly false) booking has status 'paid'/'partial' or downpayment
  const isDepositPaid = booking.depositPaid !== false && (
    booking.depositPaid === true ||
    booking.paymentStatus === 'paid' ||
    booking.paymentStatus === 'partial' ||
    (typeof booking.downpaymentAmount === 'number' && booking.downpaymentAmount > 0) ||
    (typeof booking.downpaymentAmount === 'string' && parseFloat(booking.downpaymentAmount.replace(/[^0-9.]/g, '')) > 0)
  );

  const customDownpayment = typeof booking.downpaymentAmount === 'number'
    ? booking.downpaymentAmount
    : typeof booking.downpaymentAmount === 'string'
    ? parseFloat(booking.downpaymentAmount.replace(/[^0-9.]/g, '')) || 0
    : typeof booking.depositAmount === 'number'
    ? booking.depositAmount
    : typeof booking.depositAmount === 'string'
    ? parseFloat(booking.depositAmount.replace(/[^0-9.]/g, '')) || 0
    : 0;

  const depositDeduction = isDepositPaid
    ? (customDownpayment > 0 ? customDownpayment : STANDARD_DEPOSIT_AMOUNT)
    : 0;

  const isPaidInFull = booking.paymentStatus === 'paid';
  const remainingBalance = isPaidInFull ? 0 : Math.max(0, totalFee - depositDeduction);

  return {
    totalFee,
    depositDeduction,
    isDepositPaid,
    remainingBalance,
    isPaidInFull,
    formattedTotal: `₱${totalFee.toLocaleString()}`,
    formattedDeposit: `₱${depositDeduction.toLocaleString()}`,
    formattedBalance: `₱${remainingBalance.toLocaleString()}`,
  };
}

/**
 * Computes suggested rental fee based on duration hours
 */
export function getSuggestedRate(durationHours: number): number {
  if (!durationHours || durationHours <= 0) return 0;
  if (durationHours <= 12) return RENTAL_RATES.HOURS_12;
  if (durationHours <= 18) return RENTAL_RATES.HOURS_18;
  if (durationHours <= 24) return RENTAL_RATES.HOURS_24;
  
  // For rentals > 24 hours: full 24-hour cycles (₱1,500/day) + partial hours tier
  const fullDays = Math.floor(durationHours / 24);
  const remainingHours = durationHours % 24;

  if (remainingHours === 0) {
    return fullDays * RENTAL_RATES.HOURS_24;
  } else if (remainingHours <= 12) {
    return (fullDays * RENTAL_RATES.HOURS_24) + RENTAL_RATES.HOURS_12;
  } else if (remainingHours <= 18) {
    return (fullDays * RENTAL_RATES.HOURS_24) + RENTAL_RATES.HOURS_18;
  } else {
    return (fullDays + 1) * RENTAL_RATES.HOURS_24;
  }
}

/**
 * Formats duration in hours to a human-friendly string (e.g. "10 Hours", "12 Hours", "24 Hours (1 Day)", "48 Hours (2 Days)")
 */
export function formatDurationDisplay(durationHours: number): string {
  if (!durationHours || durationHours <= 0) return '0 Hours';
  
  if (durationHours < 24) {
    const formatted = Number.isInteger(durationHours) ? durationHours : durationHours.toFixed(1);
    return `${formatted} Hour${durationHours === 1 ? '' : 's'}`;
  }

  const days = durationHours / 24;
  if (Number.isInteger(days)) {
    return `${durationHours} Hours (${days} Day${days === 1 ? '' : 's'})`;
  }

  const formattedHours = Number.isInteger(durationHours) ? durationHours : durationHours.toFixed(1);
  return `${formattedHours} Hours (${days.toFixed(1)} Days)`;
}

/**
 * Accurately parses a booking's date and time into a Date object
 */
export function getBookingStartDateTime(booking: Pick<Booking, 'startDate' | 'startTime'>): Date {
  const [year, month, day] = booking.startDate.split('-').map(Number);
  const [hours, minutes] = (booking.startTime || '00:00').split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

/**
 * Computes the scheduled end Date from:
 * 1. Explicit endDate and endTime if present
 * 2. durationHours if present (start + durationHours)
 * 3. Legacy noOfDays (start + noOfDays * 24h)
 */
export function getBookingEndDateTime(
  booking: Pick<Booking, 'startDate' | 'startTime'> & Partial<Pick<Booking, 'endDate' | 'endTime' | 'durationHours' | 'noOfDays'>>
): Date {
  const start = getBookingStartDateTime(booking);

  // Case 1: Explicit end date and end time
  if (booking.endDate && booking.endTime) {
    const [y, m, d] = booking.endDate.split('-').map(Number);
    const [h, min] = booking.endTime.split(':').map(Number);
    const end = new Date(y, m - 1, d, h, min, 0, 0);
    if (!isNaN(end.getTime()) && end.getTime() > start.getTime()) {
      return end;
    }
  }

  // Case 2: Explicit durationHours
  if (booking.durationHours && booking.durationHours > 0) {
    const durationMs = booking.durationHours * 60 * 60 * 1000;
    return new Date(start.getTime() + durationMs);
  }

  // Case 3: Days-based fallback
  const days = (typeof booking.noOfDays === 'number' && booking.noOfDays > 0) ? booking.noOfDays : 1;
  const durationMs = days * 24 * 60 * 60 * 1000;
  return new Date(start.getTime() + durationMs);
}

/**
 * Computes duration in hours between start and end Date
 */
export function getBookingDurationHours(
  booking: Pick<Booking, 'startDate' | 'startTime'> & Partial<Pick<Booking, 'endDate' | 'endTime' | 'durationHours' | 'noOfDays'>>
): number {
  if (booking.durationHours && booking.durationHours > 0) {
    return booking.durationHours;
  }
  const start = getBookingStartDateTime(booking).getTime();
  const end = getBookingEndDateTime(booking).getTime();
  const diffHours = (end - start) / (1000 * 60 * 60);
  return Math.round(diffHours * 10) / 10;
}

/**
 * Computes the turnaround/cleaning ready Date (3 hours after scheduled return).
 * The vehicle is ready for the next customer starting from this timestamp.
 */
export function getBookingTurnaroundReadyDateTime(
  booking: Pick<Booking, 'startDate' | 'startTime'> & Partial<Pick<Booking, 'endDate' | 'endTime' | 'durationHours' | 'noOfDays'>>
): Date {
  const end = getBookingEndDateTime(booking);
  return new Date(end.getTime() + (TURNOVER_CLEANING_HOURS * 60 * 60 * 1000));
}

/**
 * Calculates current live time metrics, countdown, and overtime
 */
export function calculateBookingTime(
  booking: Pick<Booking, 'startDate' | 'startTime'> & Partial<Pick<Booking, 'endDate' | 'endTime' | 'durationHours' | 'noOfDays' | 'status' | 'completedAt' | 'turnoverDetails'>>,
  currentDate: Date = new Date()
): BookingTimeCalculation {
  const startDateTime = getBookingStartDateTime(booking);
  const endDateTime = getBookingEndDateTime(booking);
  const turnaroundReadyDateTime = getBookingTurnaroundReadyDateTime(booking);
  const durationHours = getBookingDurationHours(booking);
  const formattedDuration = formatDurationDisplay(durationHours);

  const now = currentDate.getTime();
  const startMs = startDateTime.getTime();
  const endMs = endDateTime.getTime();
  const totalDurationMs = Math.max(1, endMs - startMs);

  const isCompleted = booking.status === 'completed' || Boolean(booking.completedAt);
  const hoursSinceTurnover = booking.completedAt 
    ? Math.max(0, (now - new Date(booking.completedAt).getTime()) / (1000 * 3600)) 
    : (isCompleted ? 999 : undefined);
  const canUndoTurnover = isCompleted && hoursSinceTurnover !== undefined && hoursSinceTurnover <= 24;

  if (isCompleted) {
    return {
      startDateTime,
      endDateTime,
      turnaroundReadyDateTime,
      durationHours,
      formattedDuration,
      isUpcoming: false,
      isActive: false,
      isOvertime: false,
      isCompleted: true,
      completedAt: booking.completedAt,
      turnoverDetails: booking.turnoverDetails,
      canUndoTurnover,
      hoursSinceTurnover,
      totalDurationMs,
      elapsedMs: totalDurationMs,
      remainingMs: 0,
      progressPercentage: 100,
      daysRemaining: 0,
      hoursRemaining: 0,
      minutesRemaining: 0,
      secondsRemaining: 0,
      formattedRemaining: 'Completed',
    };
  }

  const isUpcoming = now < startMs;
  const isOvertime = now > endMs;
  const isActive = now >= startMs && now <= endMs;

  const elapsedMs = isUpcoming ? 0 : Math.max(0, now - startMs);
  const remainingMs = isUpcoming ? startMs - now : endMs - now;

  const progressPercentage = isUpcoming
    ? 0
    : Math.min(100, Math.max(0, (elapsedMs / totalDurationMs) * 100));

  // Time remaining or overtime calculation
  const absRemainingMs = Math.abs(remainingMs);
  const totalSeconds = Math.floor(absRemainingMs / 1000);
  const daysRemaining = Math.floor(totalSeconds / (3600 * 24));
  const hoursRemaining = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutesRemaining = Math.floor((totalSeconds % 3600) / 60);
  const secondsRemaining = totalSeconds % 60;

  const prefix = isOvertime ? '+ ' : '';
  const formattedRemaining = `${prefix}${daysRemaining > 0 ? `${daysRemaining}d ` : ''}${String(hoursRemaining).padStart(2, '0')}h ${String(minutesRemaining).padStart(2, '0')}m ${String(secondsRemaining).padStart(2, '0')}s`;

  return {
    startDateTime,
    endDateTime,
    turnaroundReadyDateTime,
    durationHours,
    formattedDuration,
    isUpcoming,
    isActive,
    isOvertime,
    isCompleted: false,
    canUndoTurnover: false,
    totalDurationMs,
    elapsedMs,
    remainingMs,
    progressPercentage,
    daysRemaining,
    hoursRemaining,
    minutesRemaining,
    secondsRemaining,
    formattedRemaining,
  };
}

/**
 * Formats a Date object or ISO string into "Month D, YYYY" (e.g. September 1, 2026)
 */
export function formatFullDate(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '';
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  if (typeof dateInput === 'string') {
    const isoMatch = dateInput.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      const mIndex = parseInt(m, 10) - 1;
      const dayNum = parseInt(d, 10);
      return `${monthNames[mIndex] || ''} ${dayNum}, ${y}`;
    }
    const parsed = new Date(dateInput);
    if (!isNaN(parsed.getTime())) {
      return `${monthNames[parsed.getMonth()]} ${parsed.getDate()}, ${parsed.getFullYear()}`;
    }
    return dateInput;
  }
  return `${monthNames[dateInput.getMonth()]} ${dateInput.getDate()}, ${dateInput.getFullYear()}`;
}

/**
 * Formats a Date object or ISO string into MM/DD/YYYY format
 */
export function formatDateOnly(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    // If already YYYY-MM-DD
    const isoMatch = dateInput.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return `${m.padStart(2, '0')}/${d.padStart(2, '0')}/${y}`;
    }
    const parsed = new Date(dateInput);
    if (!isNaN(parsed.getTime())) {
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      const y = parsed.getFullYear();
      return `${m}/${d}/${y}`;
    }
    return dateInput;
  }
  const m = String(dateInput.getMonth() + 1).padStart(2, '0');
  const d = String(dateInput.getDate()).padStart(2, '0');
  const y = dateInput.getFullYear();
  return `${m}/${d}/${y}`;
}

/**
 * Formats a Date object or HH:mm time string into 12-hour format (e.g. 5:00 PM, 11:30 AM)
 */
export function formatTimeOnly(timeInput: Date | string | null | undefined): string {
  if (!timeInput) return '';
  if (typeof timeInput === 'string') {
    // If HH:mm string (e.g., '17:00' or '09:30')
    const timeMatch = timeInput.match(/^(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const h24 = parseInt(timeMatch[1], 10);
      const minStr = timeMatch[2];
      const period = h24 >= 12 ? 'PM' : 'AM';
      const h12 = h24 % 12 || 12;
      return `${h12}:${minStr} ${period}`;
    }
    const parsed = new Date(timeInput);
    if (!isNaN(parsed.getTime())) {
      let h = parsed.getHours();
      const min = String(parsed.getMinutes()).padStart(2, '0');
      const period = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h}:${min} ${period}`;
    }
    return timeInput;
  }
  let h = timeInput.getHours();
  const min = String(timeInput.getMinutes()).padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${min} ${period}`;
}

/**
 * Formats a Date object or string into MM/DD/YYYY, 12-hour format
 */
export function formatDateTime(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '';
  const d = formatDateOnly(dateInput);
  const t = formatTimeOnly(dateInput);
  if (!d && !t) return '';
  if (!d) return t;
  if (!t) return d;
  return `${d} at ${t}`;
}

/**
 * Detects whether a proposed booking conflicts with existing bookings.
 * 1. Direct overlap: proposedStart < existingEnd AND proposedEnd > existingStart
 * 2. Buffer overlap (3-hour cleaning turnover): 
 *    - Proposed booking starts within 3 hours of existing return (vehicle still being cleaned)
 *    - Proposed booking ends within 3 hours before existing departure (not enough time to clean before next rental)
 */
export function checkBookingConflicts(
  proposed: Pick<Booking, 'startDate' | 'startTime' | 'vehicle'> & Partial<Pick<Booking, 'id' | 'endDate' | 'endTime' | 'durationHours' | 'noOfDays'>>,
  allBookings: Booking[],
  sameVehicleOnly: boolean = true,
  enforceCleaningBuffer: boolean = true
): DateConflict {
  const proposedStart = getBookingStartDateTime(proposed).getTime();
  const proposedEnd = getBookingEndDateTime(proposed).getTime();
  const bufferMs = (TURNOVER_CLEANING_HOURS * 60 * 60 * 1000);

  const directCollisions: Booking[] = [];
  const bufferCollisions: Booking[] = [];
  let conflictReason: string | undefined;

  for (const existing of allBookings) {
    // Skip self when editing
    if (proposed.id && existing.id === proposed.id) {
      continue;
    }

    // Skip cancelled bookings
    if (existing.status === 'cancelled') {
      continue;
    }

    // Vehicle check if enabled
    if (sameVehicleOnly && existing.vehicle !== proposed.vehicle) {
      continue;
    }

    const existingStartDate = getBookingStartDateTime(existing);
    const existingEndDate = getBookingEndDateTime(existing);
    const existingStart = existingStartDate.getTime();
    const existingEnd = existingEndDate.getTime();

    // 1. Direct overlap check
    if (proposedStart < existingEnd && proposedEnd > existingStart) {
      directCollisions.push(existing);
      conflictReason = `Direct schedule conflict: Overlaps with ${existing.name}'s booking (${formatDateTime(existingStartDate)} – ${formatDateTime(existingEndDate)}).`;
      continue;
    }

    // 2. Turnover cleaning buffer check (3 hours)
    if (enforceCleaningBuffer) {
      // Case A: Proposed booking is after existing, but starts before 3-hour cleaning window finishes
      const existingCleanReady = existingEnd + bufferMs;
      if (proposedStart >= existingEnd && proposedStart < existingCleanReady) {
        bufferCollisions.push(existing);
        const readyDate = new Date(existingCleanReady);
        conflictReason = `Turnover buffer conflict: ${existing.name}'s rental ends at ${formatTimeOnly(existingEndDate)}. The 3-hour vehicle cleaning window completes at ${formatTimeOnly(readyDate)}. Earliest available pick-up is ${formatTimeOnly(readyDate)}.`;
        continue;
      }

      // Case B: Proposed booking is before existing, but ends after 3-hour buffer window before next pickup
      const existingCleanStart = existingStart - bufferMs;
      if (proposedEnd <= existingStart && proposedEnd > existingCleanStart) {
        bufferCollisions.push(existing);
        const cutoffDate = new Date(existingCleanStart);
        conflictReason = `Turnover buffer conflict: Next booking (${existing.name}) starts at ${formatTimeOnly(existingStartDate)}. Due to the 3-hour cleaning window, this rental must be returned by ${formatTimeOnly(cutoffDate)}.`;
        continue;
      }
    }
  }

  const allConflicting = [...directCollisions, ...bufferCollisions];

  return {
    hasConflict: allConflicting.length > 0,
    isBufferConflict: directCollisions.length === 0 && bufferCollisions.length > 0,
    conflictingBookings: allConflicting,
    reason: conflictReason,
  };
}

/**
 * Generates dates for a calendar grid given a year and month (0-11)
 * Includes padding days from previous and next months to form complete 7-day weeks
 */
export interface CalendarDayInfo {
  date: Date;
  dateString: string; // 'YYYY-MM-DD'
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  dayOfWeek: number; // 0 = Sun, 6 = Sat
}

export function getMonthCalendarGrid(year: number, month: number): CalendarDayInfo[] {
  const today = new Date();
  const todayString = toISODateString(today);

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday
  const totalDaysInMonth = lastDayOfMonth.getDate();

  const days: CalendarDayInfo[] = [];

  // Padding days from previous month
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    const dateStr = toISODateString(d);
    days.push({
      date: d,
      dateString: dateStr,
      dayOfMonth: d.getDate(),
      isCurrentMonth: false,
      isToday: dateStr === todayString,
      isPast: d.getTime() < today.setHours(0, 0, 0, 0),
      dayOfWeek: d.getDay(),
    });
  }

  // Current month days
  for (let i = 1; i <= totalDaysInMonth; i++) {
    const d = new Date(year, month, i);
    const dateStr = toISODateString(d);
    days.push({
      date: d,
      dateString: dateStr,
      dayOfMonth: i,
      isCurrentMonth: true,
      isToday: dateStr === todayString,
      isPast: d.getTime() < today.setHours(0, 0, 0, 0),
      dayOfWeek: d.getDay(),
    });
  }

  // Padding days from next month to complete the grid (up to multiple of 7)
  const remainingCells = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    const d = new Date(year, month + 1, i);
    const dateStr = toISODateString(d);
    days.push({
      date: d,
      dateString: dateStr,
      dayOfMonth: i,
      isCurrentMonth: false,
      isToday: dateStr === todayString,
      isPast: d.getTime() < today.setHours(0, 0, 0, 0),
      dayOfWeek: d.getDay(),
    });
  }

  return days;
}

export function toISODateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Checks if a booking spans onto a specific calendar day (YYYY-MM-DD)
 */
export function isBookingOnDay(booking: Booking, dateString: string): boolean {
  const targetDayStart = new Date(`${dateString}T00:00:00`).getTime();
  const targetDayEnd = new Date(`${dateString}T23:59:59.999`).getTime();

  const bookingStart = getBookingStartDateTime(booking).getTime();
  const bookingEnd = getBookingEndDateTime(booking).getTime();

  return bookingStart <= targetDayEnd && bookingEnd >= targetDayStart;
}

/**
 * Determines position of this day within the booking's total span
 */
export function getBookingDayPosition(booking: Booking, dateString: string) {
  const startStr = booking.startDate;
  const endDate = getBookingEndDateTime(booking);
  const endStr = toISODateString(endDate);

  const isStart = dateString === startStr;
  const isEnd = dateString === endStr;
  const isSingleDay = booking.noOfDays <= 1 || startStr === endStr;

  return {
    isStart,
    isEnd,
    isMiddle: !isStart && !isEnd,
    isSingleDay,
  };
}

export interface DayAvailabilityInfo {
  isBooked: boolean;
  carBooked: boolean;
  vanBooked: boolean;
  isClickable: boolean;
  canStartBooking: boolean;
  canEndBooking: boolean;
  isReturnDay: boolean; // Arrival day (booking ends)
  isCarReturnDay: boolean;
  isVanReturnDay: boolean;
  isStartDay: boolean; // Departure day (booking starts)
  isCarStartDay: boolean;
  isVanStartDay: boolean;
  isBackToBack: boolean; // Both arrival and departure on same date
  readyTime?: string; // Pickup ready after arrival + 4h turnover
  carReadyTime?: string;
  vanReadyTime?: string;
  returnTime?: string; // Scheduled vehicle return time
  carReturnTime?: string;
  vanReturnTime?: string;
  departureTime?: string; // Scheduled next departure time
  carDepartureTime?: string;
  vanDepartureTime?: string;
  latestReturnTime?: string; // Required return time (departure - 4h turnover)
  carLatestReturnTime?: string;
  vanLatestReturnTime?: string;
}

function evaluateVehicleDayAvailability(vehicleBookings: Booking[], dateString: string) {
  const touching = vehicleBookings.filter((b) => isBookingOnDay(b, dateString));
  if (touching.length === 0) {
    return {
      isBooked: false,
      isClickable: true,
      canStartBooking: true,
      canEndBooking: true,
      isReturnDay: false,
      isStartDay: false,
      isBackToBack: false,
      returnTime: undefined,
      readyTime: undefined,
      departureTime: undefined,
      latestReturnTime: undefined,
    };
  }

  // Categorize touching bookings
  const startingBookings = touching.filter((b) => b.startDate === dateString);
  const endingBookings = touching.filter((b) => {
    const endStr = toISODateString(getBookingEndDateTime(b));
    return endStr === dateString;
  });
  const middleBookings = touching.filter((b) => {
    const endStr = toISODateString(getBookingEndDateTime(b));
    return dateString > b.startDate && dateString < endStr;
  });

  // If any booking is in the middle of a trip: completely booked
  if (middleBookings.length > 0) {
    return {
      isBooked: true,
      isClickable: false,
      canStartBooking: false,
      canEndBooking: false,
      isReturnDay: false,
      isStartDay: false,
      isBackToBack: false,
      returnTime: undefined,
      readyTime: undefined,
      departureTime: undefined,
      latestReturnTime: undefined,
    };
  }

  // Case: Both Arrival (ending) and Departure (starting) on the same day (Back-to-Back)
  if (startingBookings.length > 0 && endingBookings.length > 0) {
    const latestEndDt = new Date(Math.max(...endingBookings.map((b) => getBookingEndDateTime(b).getTime())));
    const latestReadyDt = new Date(Math.max(...endingBookings.map((b) => getBookingTurnaroundReadyDateTime(b).getTime())));
    const earliestStartDt = new Date(Math.min(...startingBookings.map((b) => getBookingStartDateTime(b).getTime())));
    const latestReturnDt = new Date(earliestStartDt.getTime() - (TURNOVER_CLEANING_HOURS * 60 * 60 * 1000));

    return {
      isBooked: true,
      isClickable: false, // Rule 4: Not selectable for a 3rd customer
      canStartBooking: false,
      canEndBooking: false,
      isReturnDay: true,
      isStartDay: true,
      isBackToBack: true,
      returnTime: formatTimeOnly(latestEndDt),
      readyTime: formatTimeOnly(latestReadyDt),
      departureTime: formatTimeOnly(earliestStartDt),
      latestReturnTime: formatTimeOnly(latestReturnDt),
    };
  }

  // Case: Only Starting Booking(s) on this day (Departure Day)
  if (startingBookings.length > 0) {
    const earliestStartDt = new Date(Math.min(...startingBookings.map((b) => getBookingStartDateTime(b).getTime())));
    const latestReturnDt = new Date(earliestStartDt.getTime() - (TURNOVER_CLEANING_HOURS * 60 * 60 * 1000));

    return {
      isBooked: true,
      isClickable: true, // Clickable as end/return date
      canStartBooking: false, // Cannot start pickup on a departure day
      canEndBooking: true, // Can end/return before departure
      isReturnDay: false,
      isStartDay: true,
      isBackToBack: false,
      returnTime: undefined,
      readyTime: undefined,
      departureTime: formatTimeOnly(earliestStartDt),
      latestReturnTime: formatTimeOnly(latestReturnDt),
    };
  }

  // Case: Only Ending Booking(s) on this day (Arrival Day / Return Day)
  if (endingBookings.length > 0) {
    const latestEndDt = new Date(Math.max(...endingBookings.map((b) => getBookingEndDateTime(b).getTime())));
    const latestReadyDt = new Date(Math.max(...endingBookings.map((b) => getBookingTurnaroundReadyDateTime(b).getTime())));

    return {
      isBooked: true,
      isClickable: true, // Clickable as start/pickup date
      canStartBooking: true, // Can start pickup from readyTime
      canEndBooking: false, // Cannot end/return during existing trip
      isReturnDay: true,
      isStartDay: false,
      isBackToBack: false,
      returnTime: formatTimeOnly(latestEndDt),
      readyTime: formatTimeOnly(latestReadyDt),
      departureTime: undefined,
      latestReturnTime: undefined,
    };
  }

  return {
    isBooked: true,
    isClickable: false,
    canStartBooking: false,
    canEndBooking: false,
    isReturnDay: false,
    isStartDay: false,
    isBackToBack: false,
    returnTime: undefined,
    readyTime: undefined,
    departureTime: undefined,
    latestReturnTime: undefined,
  };
}

/**
 * Checks if a specific day (YYYY-MM-DD) is booked/unavailable based on vehicle filter
 */
export function isDayBookedForFilter(
  dateString: string,
  bookings: Booking[],
  vehicleFilter: 'all' | VehicleType,
  excludeBookingId?: string
): DayAvailabilityInfo {
  const activeBookings = bookings.filter((b) => !excludeBookingId || b.id !== excludeBookingId);

  const carBookings = activeBookings.filter((b) => b.vehicle === 'Car');
  const vanBookings = activeBookings.filter((b) => b.vehicle === 'Van');

  const carStatus = evaluateVehicleDayAvailability(carBookings, dateString);
  const vanStatus = evaluateVehicleDayAvailability(vanBookings, dateString);

  let isClickable = true;
  let canStartBooking = true;
  let canEndBooking = true;
  let isReturnDay = false;
  let isStartDay = false;
  let isBackToBack = false;
  let readyTime: string | undefined;
  let returnTime: string | undefined;
  let departureTime: string | undefined;
  let latestReturnTime: string | undefined;

  if (vehicleFilter === 'Car') {
    isClickable = carStatus.isClickable;
    canStartBooking = carStatus.canStartBooking;
    canEndBooking = carStatus.canEndBooking;
    isReturnDay = carStatus.isReturnDay;
    isStartDay = carStatus.isStartDay;
    isBackToBack = carStatus.isBackToBack;
    readyTime = carStatus.readyTime;
    returnTime = carStatus.returnTime;
    departureTime = carStatus.departureTime;
    latestReturnTime = carStatus.latestReturnTime;
  } else if (vehicleFilter === 'Van') {
    isClickable = vanStatus.isClickable;
    canStartBooking = vanStatus.canStartBooking;
    canEndBooking = vanStatus.canEndBooking;
    isReturnDay = vanStatus.isReturnDay;
    isStartDay = vanStatus.isStartDay;
    isBackToBack = vanStatus.isBackToBack;
    readyTime = vanStatus.readyTime;
    returnTime = vanStatus.returnTime;
    departureTime = vanStatus.departureTime;
    latestReturnTime = vanStatus.latestReturnTime;
  } else {
    // 'all' filter
    isClickable = carStatus.isClickable || vanStatus.isClickable;
    canStartBooking = carStatus.canStartBooking || vanStatus.canStartBooking;
    canEndBooking = carStatus.canEndBooking || vanStatus.canEndBooking;
    isReturnDay = carStatus.isReturnDay || vanStatus.isReturnDay;
    isStartDay = carStatus.isStartDay || vanStatus.isStartDay;
    isBackToBack = carStatus.isBackToBack || vanStatus.isBackToBack;
    readyTime = carStatus.isReturnDay ? carStatus.readyTime : vanStatus.readyTime;
    returnTime = carStatus.isReturnDay ? carStatus.returnTime : vanStatus.returnTime;
    departureTime = carStatus.isStartDay ? carStatus.departureTime : vanStatus.departureTime;
    latestReturnTime = carStatus.isStartDay ? carStatus.latestReturnTime : vanStatus.latestReturnTime;
  }

  return {
    isBooked: carStatus.isBooked || vanStatus.isBooked,
    carBooked: carStatus.isBooked,
    vanBooked: vanStatus.isBooked,
    isClickable,
    canStartBooking,
    canEndBooking,
    isReturnDay,
    isCarReturnDay: carStatus.isReturnDay,
    isVanReturnDay: vanStatus.isReturnDay,
    isStartDay,
    isCarStartDay: carStatus.isStartDay,
    isVanStartDay: vanStatus.isStartDay,
    isBackToBack,
    readyTime,
    returnTime,
    departureTime,
    latestReturnTime,
    carReadyTime: carStatus.readyTime,
    vanReadyTime: vanStatus.readyTime,
    carReturnTime: carStatus.returnTime,
    vanReturnTime: vanStatus.returnTime,
    carDepartureTime: carStatus.departureTime,
    vanDepartureTime: vanStatus.departureTime,
    carLatestReturnTime: carStatus.latestReturnTime,
    vanLatestReturnTime: vanStatus.latestReturnTime,
  };
}

/**
 * Validates that every day between startDateStr and endDateStr is consecutive and available
 * Supports starting on Arrival Days and ending on Departure Days.
 */
export function isDateRangeConsecutivelyAvailable(
  startDateStr: string,
  endDateStr: string,
  bookings: Booking[],
  vehicleFilter: 'all' | VehicleType,
  excludeBookingId?: string
): { isConsecutiveAvailable: boolean; blockedDate?: string; reason?: string } {
  if (!startDateStr || !endDateStr) {
    return { isConsecutiveAvailable: false };
  }

  const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);

  const start = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);

  if (start.getTime() > end.getTime()) {
    return { isConsecutiveAvailable: false };
  }

  // Check start date validity
  const startDayAvail = isDayBookedForFilter(startDateStr, bookings, vehicleFilter, excludeBookingId);
  if (!startDayAvail.canStartBooking) {
    return {
      isConsecutiveAvailable: false,
      blockedDate: startDateStr,
      reason: startDayAvail.isStartDay
        ? `${formatFullDate(startDateStr)} is an outgoing pick-up date. You cannot start a rental on this day.`
        : `${formatFullDate(startDateStr)} is not available for rental start.`
    };
  }

  // Check end date validity
  const endDayAvail = isDayBookedForFilter(endDateStr, bookings, vehicleFilter, excludeBookingId);
  if (startDateStr !== endDateStr && !endDayAvail.canEndBooking) {
    return {
      isConsecutiveAvailable: false,
      blockedDate: endDateStr,
      reason: endDayAvail.isReturnDay
        ? `${formatFullDate(endDateStr)} is a drop-off date for an ongoing rental.`
        : `${formatFullDate(endDateStr)} is already reserved.`
    };
  }

  // Check intermediate days strictly between start and end (cannot be booked or turnover days)
  const current = new Date(start.getTime());
  current.setDate(current.getDate() + 1);

  while (current.getTime() < end.getTime()) {
    const dStr = toISODateString(current);
    const dayAvail = isDayBookedForFilter(dStr, bookings, vehicleFilter, excludeBookingId);
    if (dayAvail.isBooked) {
      return {
        isConsecutiveAvailable: false,
        blockedDate: dStr,
        reason: `${formatFullDate(dStr)} is already reserved.`
      };
    }
    current.setDate(current.getDate() + 1);
  }

  return { isConsecutiveAvailable: true };
}

/**
 * Finds the earliest blocked/booked date strictly after startDateStr
 */
export function getFirstBlockedDateAfter(
  startDateStr: string,
  bookings: Booking[],
  vehicleFilter: 'all' | VehicleType,
  excludeBookingId?: string
): string | null {
  const [year, month, day] = startDateStr.split('-').map(Number);
  const current = new Date(year, month - 1, day);
  current.setDate(current.getDate() + 1); // strictly after start date

  // Check up to 180 days ahead
  for (let i = 0; i < 180; i++) {
    const dStr = toISODateString(current);
    const dayAvail = isDayBookedForFilter(dStr, bookings, vehicleFilter, excludeBookingId);

    // If day is a Departure Day: this day CAN be reached as end date, but date after it is blocked!
    if (dayAvail.isStartDay && dayAvail.canEndBooking) {
      const nextDay = new Date(current.getTime());
      nextDay.setDate(nextDay.getDate() + 1);
      return toISODateString(nextDay);
    }

    // If day cannot be ended on (middle day, return day, back-to-back, etc.)
    if (!dayAvail.canEndBooking) {
      return dStr;
    }

    current.setDate(current.getDate() + 1);
  }

  return null;
}

