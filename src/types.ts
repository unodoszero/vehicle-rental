export type VehicleType = 'Car' | 'Van';

export type BookingStatus = 'upcoming' | 'active' | 'completed' | 'overtime' | 'cancelled';

export interface Booking {
  id: string;
  name: string;
  mobileNo: string;
  vehicle: VehicleType;
  vehicleModel?: string;
  plateNumber?: string;
  selfDrive: boolean;
  driversLicenseDetails?: string;
  licenseNumber?: string;
  licenseExpiration?: string;
  passengers: number;
  startLocation: string;
  destination: string;
  startDate: string; // ISO date string 'YYYY-MM-DD'
  startTime: string; // 'HH:mm' 24h format
  noOfDays: number;  // Duration in days
  notes?: string;
  colorTag: string;  // Hex or Tailwind color token for continuous visual bar
  createdAt: string; // ISO timestamp
  updatedAt?: string;
}

export interface BookingTimeCalculation {
  startDateTime: Date;
  endDateTime: Date;
  isUpcoming: boolean;
  isActive: boolean;
  isOvertime: boolean;
  isCompleted: boolean;
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
  conflictingBookings: Booking[];
}

export type CalendarViewMode = 'month' | 'list';
