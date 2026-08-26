import React, { useState, useEffect } from 'react';
import { 
  Clock, AlertTriangle, ShieldCheck, MapPin, Phone, Car, 
  Calendar, CheckCircle2, Navigation, ArrowLeft, RefreshCw, 
  User, Info, AlertOctagon, HelpCircle, ArrowRight
} from 'lucide-react';
import { Booking } from '../types';
import { calculateBookingTime, formatDateTime, formatDateOnly, formatTimeOnly } from '../utils/dateUtils';

interface RenterTrackerViewProps {
  booking: Booking | null;
  onBackToAdmin?: () => void;
}

export const RenterTrackerView: React.FC<RenterTrackerViewProps> = ({
  booking,
  onBackToAdmin,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Precision 1-second interval ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4">
          <Car className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold">Booking Not Found</h1>
        <p className="text-xs text-slate-400 mt-2 max-w-sm">
          The requested rental tracker identifier could not be located or has expired.
        </p>
        {onBackToAdmin && (
          <button
            id="not-found-back-admin-btn"
            onClick={onBackToAdmin}
            className="mt-6 px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20 active:scale-95"
          >
            Return to Fleet Dashboard
          </button>
        )}
      </div>
    );
  }

  const timeCalc = calculateBookingTime(booking, currentTime);
  const isOvertime = timeCalc.isOvertime;
  const isUpcoming = timeCalc.isUpcoming;
  const isActive = timeCalc.isActive;

  return (
    <div
      id="renter-tracker-page"
      className={`min-h-screen transition-colors duration-500 flex flex-col justify-between ${
        isOvertime
          ? 'bg-red-950 text-red-50'
          : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Top Public Header */}
      <header
        className={`px-4 sm:px-8 py-3.5 border-b flex items-center justify-between transition-colors duration-500 ${
          isOvertime
            ? 'bg-red-900/60 border-red-800 backdrop-blur-xs'
            : 'bg-slate-900/80 border-slate-800 backdrop-blur-xs'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-xs ${
              isOvertime
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-blue-600 text-white'
            }`}
          >
            <Car className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400">
                Live Rental Time Tracker
              </span>
              <span className="text-slate-500 text-xs">•</span>
              <span className="text-xs font-mono font-semibold text-slate-300">
                {booking.id}
              </span>
            </div>
            <h1 className="text-sm font-bold text-white tracking-tight">
              {booking.vehicleModel || `${booking.vehicle} Rental`}
            </h1>
          </div>
        </div>

        {onBackToAdmin && (
          <button
            id="renter-back-to-admin-btn"
            onClick={onBackToAdmin}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-700 text-slate-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin Portal</span>
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl w-full mx-auto px-4 py-8 sm:py-10 flex-1 flex flex-col justify-center space-y-6">
        
        {/* Dynamic Status Alert Banner */}
        <div
          id="tracker-status-banner"
          className={`p-4 sm:p-5 rounded-xl border transition-all duration-500 flex items-center justify-between gap-4 shadow-xl ${
            isOvertime
              ? 'bg-red-600 text-white border-red-500 shadow-red-900/50'
              : isActive
              ? 'bg-slate-900/90 text-slate-100 border-slate-800 shadow-black/40'
              : 'bg-sky-950/80 text-sky-200 border-sky-800 shadow-sky-950/30'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                isOvertime
                  ? 'bg-white text-red-700 font-bold'
                  : isActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
              }`}
            >
              {isOvertime ? (
                <AlertOctagon className="w-5 h-5 animate-pulse" />
              ) : isActive ? (
                <Clock className="w-4 h-4" />
              ) : (
                <Calendar className="w-4 h-4" />
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                {isOvertime ? 'Urgent Alert' : 'Rental Status'}
              </span>
              <h2 className="text-sm sm:text-base font-bold tracking-tight leading-tight">
                {isOvertime
                  ? 'WARNING: RENTAL OVERTIME EXCEEDED'
                  : isActive
                  ? 'Active Rental — Clock Running'
                  : 'Scheduled Reservation — Ready for Pickup'}
              </h2>
            </div>
          </div>

          {isOvertime && (
            <a
              href="tel:+18005550199"
              className="shrink-0 px-3.5 py-1.5 bg-white text-red-700 hover:bg-slate-100 font-bold text-xs rounded-lg shadow-md transition-all flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5" />
              Contact Dispatch
            </a>
          )}
        </div>

        {/* Hero Countdown Timer Display */}
        <div
          id="tracker-timer-container"
          className={`p-6 sm:p-8 rounded-xl border transition-all duration-500 flex flex-col items-center text-center shadow-2xl relative overflow-hidden ${
            isOvertime
              ? 'bg-gradient-to-b from-red-900/90 to-red-950/95 border-red-600 shadow-red-950/60 ring-1 ring-red-500/50'
              : 'bg-gradient-to-b from-slate-900/90 to-slate-950/95 border-slate-800 shadow-black/80'
          }`}
        >
          {/* Subtle Ambient Glow */}
          <div
            className={`absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-15 ${
              isOvertime ? 'bg-red-500' : 'bg-blue-500'
            }`}
          />

          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-2 relative z-10">
            {isOvertime
              ? 'Overtime Elapsed Beyond Schedule'
              : isUpcoming
              ? 'Time Until Scheduled Departure'
              : 'Time Remaining on Current Rental'}
          </span>

          {/* Time digits grid */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 my-3 max-w-xl w-full relative z-10 font-mono">
            {/* Days */}
            <div
              className={`p-3 sm:p-4 rounded-xl border flex flex-col items-center ${
                isOvertime
                  ? 'bg-red-950/80 border-red-700/80 text-red-100'
                  : 'bg-slate-900/90 border-slate-800 text-white'
              }`}
            >
              <span className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tighter">
                {String(timeCalc.daysRemaining).padStart(2, '0')}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                Days
              </span>
            </div>

            {/* Hours */}
            <div
              className={`p-3 sm:p-4 rounded-xl border flex flex-col items-center ${
                isOvertime
                  ? 'bg-red-950/80 border-red-700/80 text-red-100'
                  : 'bg-slate-900/90 border-slate-800 text-white'
              }`}
            >
              <span className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tighter">
                {String(timeCalc.hoursRemaining).padStart(2, '0')}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                Hours
              </span>
            </div>

            {/* Minutes */}
            <div
              className={`p-3 sm:p-4 rounded-xl border flex flex-col items-center ${
                isOvertime
                  ? 'bg-red-950/80 border-red-700/80 text-red-100'
                  : 'bg-slate-900/90 border-slate-800 text-white'
              }`}
            >
              <span className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tighter">
                {String(timeCalc.minutesRemaining).padStart(2, '0')}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                Mins
              </span>
            </div>

            {/* Seconds */}
            <div
              className={`p-3 sm:p-4 rounded-xl border flex flex-col items-center ${
                isOvertime
                  ? 'bg-red-950/80 border-red-700/80 text-red-100'
                  : 'bg-slate-900/90 border-slate-800 text-white'
              }`}
            >
              <span className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tighter text-blue-400">
                {String(timeCalc.secondsRemaining).padStart(2, '0')}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                Secs
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-xl mt-3 relative z-10">
            <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-mono">
              <span>Start: {booking.startDate} {booking.startTime}</span>
              <span>
                Return: {formatDateOnly(timeCalc.endDateTime)} {formatTimeOnly(timeCalc.endDateTime)}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOvertime ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, timeCalc.progressPercentage)}%` }}
              />
            </div>
            {isOvertime && (
              <p className="text-[11px] text-red-300 font-bold mt-2 text-center animate-pulse">
                Vehicle return was scheduled for {formatDateTime(timeCalc.endDateTime)}. Please return immediately or contact dispatch.
              </p>
            )}
          </div>
        </div>

        {/* Detailed Rental Trip Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Route & Passenger Card */}
          <div
            className={`p-4 sm:p-5 rounded-xl border backdrop-blur-xs space-y-3 ${
              isOvertime ? 'bg-red-900/30 border-red-800/80' : 'bg-slate-900/70 border-slate-800'
            }`}
          >
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              Route & Logistics
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block uppercase font-mono">Pickup Hub</span>
                <span className="font-semibold text-white text-xs block mt-0.5">{booking.startLocation}</span>
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block uppercase font-mono">Return Destination</span>
                <span className="font-semibold text-white text-xs block mt-0.5">{booking.destination}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
              <span className="text-slate-400">Total Duration:</span>
              <strong className="text-white font-mono">{booking.noOfDays} Day{booking.noOfDays > 1 ? 's' : ''} ({booking.noOfDays * 24} hrs)</strong>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Passenger Capacity:</span>
              <strong className="text-white">{booking.passengers} Passengers</strong>
            </div>
          </div>

          {/* Vehicle & Renter Verification Card */}
          <div
            className={`p-4 sm:p-5 rounded-xl border backdrop-blur-xs space-y-3 ${
              isOvertime ? 'bg-red-900/30 border-red-800/80' : 'bg-slate-900/70 border-slate-800'
            }`}
          >
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-sky-400" />
              Vehicle & Driver Classification
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Assigned Vehicle:</span>
                <strong className="text-white">{booking.vehicle} ({booking.vehicleModel || 'Standard'})</strong>
              </div>

              {booking.plateNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">License Plate:</span>
                  <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-white font-bold text-[11px] border border-slate-700">
                    {booking.plateNumber}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Driver Mode:</span>
                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                  booking.selfDrive
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                    : 'bg-blue-400/20 text-blue-300 border border-blue-400/30'
                }`}>
                  {booking.selfDrive ? 'Self-Drive (Authorized Driver)' : 'Company Chauffeur Included'}
                </span>
              </div>

              {booking.selfDrive && booking.driversLicenseDetails && (
                <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800 mt-2">
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Driver License File</span>
                  <span className="text-[11px] text-slate-200 font-mono">{booking.driversLicenseDetails}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Reserved For:</span>
              <strong className="text-white">{booking.name}</strong>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Customer Mobile:</span>
              <span className="font-mono text-slate-300">{booking.mobileNo}</span>
            </div>
          </div>
        </div>

        {/* Emergency Dispatch & Return Guidelines */}
        <div
          className={`p-4 sm:p-5 rounded-xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            isOvertime
              ? 'bg-red-950/90 border-red-700 text-red-200'
              : 'bg-slate-900/60 border-slate-800 text-slate-400'
          }`}
        >
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block text-xs sm:text-sm">24/7 Operations Dispatch & Roadside Assistance</strong>
              <p className="mt-0.5 text-slate-400 text-[11px]">
                Need to extend your rental duration or require support? Contact fleet operations immediately.
              </p>
            </div>
          </div>

          <a
            href="tel:+18005550199"
            className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/20 text-xs active:scale-95"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call +1 (800) 555-0199</span>
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 text-center text-[11px] text-slate-500 border-t border-slate-900">
        Miranda Rentals and Services • Live Rental Time Tracker
      </footer>
    </div>
  );
};
