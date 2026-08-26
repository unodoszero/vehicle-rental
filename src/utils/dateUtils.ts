import { Booking, BookingTimeCalculation, DateConflict } from '../types';

/**
 * Accurately parses a booking's date and time into a Date object
 */
export function getBookingStartDateTime(booking: Pick<Booking, 'startDate' | 'startTime'>): Date {
  const [year, month, day] = booking.startDate.split('-').map(Number);
  const [hours, minutes] = (booking.startTime || '00:00').split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

/**
 * Computes the scheduled end Date by adding exact milliseconds (days * 24h)
 */
export function getBookingEndDateTime(booking: Pick<Booking, 'startDate' | 'startTime' | 'noOfDays'>): Date {
  const start = getBookingStartDateTime(booking);
  const durationMs = booking.noOfDays * 24 * 60 * 60 * 1000;
  return new Date(start.getTime() + durationMs);
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

  const elapsedMs = Math.max(0, now - startMs);
  const remainingMs = endMs - now; // Negative if overtime

  const progressPercentage = Math.min(
    100,
    Math.max(0, (elapsedMs / totalDurationMs) * 100)
  );

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
 * Formats a Date object into human-readable date and time
 */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatDateOnly(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatTimeOnly(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
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
