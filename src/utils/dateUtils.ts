import { Booking, BookingTimeCalculation, DateConflict, VehicleType } from '../types';

/**
 * Standard policy rules:
 * - 2 hours deducted from standard 24h day cycles (e.g. 1 day = 22h, 2 days = 46h)
 *   to ensure a vehicle turnaround, cleaning, and maintenance buffer before next reservation.
 * - 4 hours turnaround window after return before vehicle is ready for next customer.
 */
export const RENTAL_DEDUCTION_HOURS = 2;
export const TURNOVER_CLEANING_HOURS = 4;

/**
 * Accurately parses a booking's date and time into a Date object
 */
export function getBookingStartDateTime(booking: Pick<Booking, 'startDate' | 'startTime'>): Date {
  const [year, month, day] = booking.startDate.split('-').map(Number);
  const [hours, minutes] = (booking.startTime || '00:00').split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

/**
 * Computes the scheduled end Date by deducting 2 hours from full 24-hour cycles:
 * ((noOfDays * 24) - 2) hours.
 * E.g., 1 Day = 22 hours, 2 Days = 46 hours.
 */
export function getBookingEndDateTime(booking: Pick<Booking, 'startDate' | 'startTime' | 'noOfDays'>): Date {
  const start = getBookingStartDateTime(booking);
  const durationHours = Math.max(1, (booking.noOfDays * 24) - RENTAL_DEDUCTION_HOURS);
  const durationMs = durationHours * 60 * 60 * 1000;
  return new Date(start.getTime() + durationMs);
}

/**
 * Computes the turnaround/cleaning ready Date (4 hours after scheduled return).
 * The vehicle is ready for the next customer starting from this timestamp.
 */
export function getBookingTurnaroundReadyDateTime(booking: Pick<Booking, 'startDate' | 'startTime' | 'noOfDays'>): Date {
  const end = getBookingEndDateTime(booking);
  return new Date(end.getTime() + (TURNOVER_CLEANING_HOURS * 60 * 60 * 1000));
}

/**
 * Calculates current live time metrics, countdown, and overtime
 */
export function calculateBookingTime(
  booking: Pick<Booking, 'startDate' | 'startTime' | 'noOfDays'>,
  currentDate: Date = new Date()
): BookingTimeCalculation {
  const startDateTime = getBookingStartDateTime(booking);
  const endDateTime = getBookingEndDateTime(booking);
  const now = currentDate.getTime();
  const startMs = startDateTime.getTime();
  const endMs = endDateTime.getTime();
  const totalDurationMs = endMs - startMs;

  const isUpcoming = now < startMs;
  const isOvertime = now > endMs;
  const isActive = now >= startMs && now <= endMs;
  const isCompleted = false; // Admin can mark or if archived

  const elapsedMs = isUpcoming ? 0 : Math.max(0, now - startMs);
  // For upcoming bookings, remaining time counts down to start of departure (startMs - now).
  // For active or overtime bookings, remaining time counts down to scheduled return (endMs - now).
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
    isUpcoming,
    isActive,
    isOvertime,
    isCompleted,
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
 * Overlap exists if proposedStart < existingEnd AND proposedEnd > existingStart.
 * If sameVehicleOnly is true, only checks bookings of the same vehicle type.
 */
export function checkBookingConflicts(
  proposed: Pick<Booking, 'id' | 'startDate' | 'startTime' | 'noOfDays' | 'vehicle'>,
  allBookings: Booking[],
  sameVehicleOnly: boolean = true
): DateConflict {
  const proposedStart = getBookingStartDateTime(proposed).getTime();
  const proposedEnd = getBookingEndDateTime(proposed).getTime();

  const conflictingBookings = allBookings.filter((existing) => {
    // Skip self when editing
    if (proposed.id && existing.id === proposed.id) {
      return false;
    }

    // Vehicle check if enabled
    if (sameVehicleOnly && existing.vehicle !== proposed.vehicle) {
      return false;
    }

    const existingStart = getBookingStartDateTime(existing).getTime();
    const existingEnd = getBookingEndDateTime(existing).getTime();

    // Standard interval overlap: [A_start, A_end] and [B_start, B_end]
    return proposedStart < existingEnd && proposedEnd > existingStart;
  });

  return {
    hasConflict: conflictingBookings.length > 0,
    conflictingBookings,
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

