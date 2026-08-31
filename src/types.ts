export type VehicleType = 'Car' | 'Van';

export type BookingStatus = 'upcoming' | 'active' | 'completed' | 'overtime' | 'cancelled';

export interface TurnoverDetails {
  returnedAt: string; // ISO date-time string e.g. '2026-08-30T16:30:00'
  fuelLevel?: 'Full' | '3/4' | '1/2' | '1/4' | 'Low / Empty' | string;
  odometerReading?: string;
  conditionNotes?: string;
  receivedBy?: string;
  loggedAt: string; // ISO timestamp
}

export interface Booking {
  id: string;
  name: string;
  mobileNo: string;
  vehicle: VehicleType;
  vehicleModel?: string;
  plateNumber?: string;
  selfDrive: boolean;
  renterIsDriver?: boolean;
  driverName?: string;
  driverBirthdate?: string;
  driversLicenseDetails?: string;
  licenseNumber?: string;
  licenseExpiration?: string;
  passengers: number;
  startLocation: string;
  destination: string;
  startDate: string; // ISO date string 'YYYY-MM-DD'
  startTime: string; // 'HH:mm' 24h format
  endDate?: string;   // ISO date string 'YYYY-MM-DD' for flexible bookings
  endTime?: string;   // 'HH:mm' 24h format for flexible bookings
  durationHours?: number; // Exact total rental duration in hours (e.g. 10, 12, 18, 24)
  bookingMode?: '12h' | '18h' | '24h' | 'custom_hours' | 'days';
  noOfDays: number;  // Duration in days (or fractional / rounded for backward compatibility)
  notes?: string;
  colorTag: string;  // Hex or Tailwind color token for continuous visual bar
  trackingToken?: string; // Cryptographically random secure tracking token
  status?: BookingStatus;
  completedAt?: string; // ISO timestamp when turnover was recorded
  turnoverDetails?: TurnoverDetails;
  
  // Payment Information
  paymentStatus?: 'pending' | 'paid' | 'partial';
  depositPaid?: boolean; // True if the ₱300 security deposit is paid to secure booking
  depositAmount?: number | string; // Standard ₱300 deposit
  paymentAmount?: number | string; // Total rental fee e.g. 1500 or "₱1,500"
  downpaymentAmount?: number | string; // Deposit / downpayment amount paid (e.g. 300)
  remainingBalance?: number | string; // (Total rental fee - deposit paid)
  paymentMethod?: 'GCash' | 'Maya' | 'Bank Transfer' | 'Cash' | 'QRPh' | 'Other' | string;
  paymentReference?: string; // Reference / Transaction ID
  paidAt?: string; // ISO timestamp when marked as paid
  paymentNotes?: string; // Notes on payment
  paymentQrUrl?: string; // Custom uploaded or linked QR image

  createdAt: string; // ISO timestamp
  updatedAt?: string;
}

export interface BookingTimeCalculation {
  startDateTime: Date;
  endDateTime: Date;
  turnaroundReadyDateTime: Date; // 3 hours cleaning buffer after return
  durationHours: number;
  formattedDuration: string; // e.g. "10 Hours", "12 Hours", "1 Day", "2 Days"
  isUpcoming: boolean;
  isActive: boolean;
  isOvertime: boolean;
  isCompleted: boolean;
  completedAt?: string;
  turnoverDetails?: TurnoverDetails;
  canUndoTurnover?: boolean; // Can be undone if marked within 24 hours
  hoursSinceTurnover?: number;
  totalDurationMs: number;
  elapsedMs: number;
  remainingMs: number; // Negative if overtime
  progressPercentage: number; // 0 to 100+
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  secondsRemaining: number;
  formattedRemaining: string;
}

export interface DateConflict {
  hasConflict: boolean;
  isBufferConflict?: boolean; // Within the mandatory 3-hour turnaround cleaning window
  conflictingBookings: Booking[];
  reason?: string;
}

export type CalendarViewMode = 'month' | 'list';

