import React, { useState, useEffect } from 'react';
import { 
  Clock, ShieldCheck, MapPin, Phone, Car, 
  Calendar, CheckCircle2, Navigation, RefreshCw, 
  User, Info, AlertOctagon, ExternalLink, Sparkles,
  MessageCircle, Copy, Check
} from 'lucide-react';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Booking } from '../types';
import { calculateBookingTime, formatDateTime, formatDateOnly, formatTimeOnly, getBookingStartDateTime } from '../utils/dateUtils';

interface RenterTrackerViewProps {
  booking: Booking | null;
  bookingId?: string | null;
}

export const RenterTrackerView: React.FC<RenterTrackerViewProps> = ({
  booking,
  bookingId,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [remoteBooking, setRemoteBooking] = useState<Booking | null>(booking);
  const [isLoading, setIsLoading] = useState(!booking && !!bookingId);
  const [copiedLink, setCopiedLink] = useState(false);

  // Precision 1-second live ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch or real-time subscribe from Firestore if not in local memory
  useEffect(() => {
    if (booking) {
      setRemoteBooking(booking);
      setIsLoading(false);
      return;
    }
    if (!bookingId) {
      setIsLoading(false);
      return;
    }

    let isSubscribed = true;

    // First try querying by trackingToken if token-like
    if (bookingId.startsWith('trk_')) {
      const q = query(collection(db, 'bookings'), where('trackingToken', '==', bookingId));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!isSubscribed) return;
          if (!snapshot.empty) {
            setRemoteBooking(snapshot.docs[0].data() as Booking);
          } else {
            setRemoteBooking(null);
          }
          setIsLoading(false);
        },
        (err) => {
          console.warn('Error querying booking by trackingToken:', err);
          setIsLoading(false);
        }
      );
      return () => {
        isSubscribed = false;
        unsubscribe();
      };
    }

    // Try direct document ID
    const docRef = doc(db, 'bookings', bookingId);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (!isSubscribed) return;
        if (docSnap.exists()) {
          setRemoteBooking(docSnap.data() as Booking);
          setIsLoading(false);
        } else {
          // Fallback check by trackingToken query
          const q = query(collection(db, 'bookings'), where('trackingToken', '==', bookingId));
          const unsubFallback = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
              setRemoteBooking(snapshot.docs[0].data() as Booking);
            } else {
              setRemoteBooking(null);
            }
            setIsLoading(false);
          }, () => setIsLoading(false));
          return () => unsubFallback();
        }
      },
      (err) => {
        console.warn('Error fetching booking tracker document:', err);
        setIsLoading(false);
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [booking, bookingId]);

  const activeBooking = remoteBooking || booking;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Mask license number for customer privacy (e.g. DL-8893021 -> DL-889****)
  const maskLicenseNumber = (license?: string) => {
    if (!license) return '';
    const clean = license.trim();
    if (clean.length <= 4) return '****';
    const visiblePrefix = clean.slice(0, Math.max(3, clean.length - 4));
    return `${visiblePrefix}****`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-300">Status...</p>
        <span className="text-xs text-slate-500 mt-1">Miranda Rentals and Services</span>
      </div>
    );
  }

  if (!activeBooking) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4 shadow-xl">
          <Car className="w-8 h-8 text-slate-400" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Booking Not Found</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-sm">
          This rental tracker identifier could not be located or has expired. Please contact Miranda Rentals and Services for assistance.
        </p>

        {/* Contact Links */}
        <div className="mt-8 grid grid-cols-2 gap-2.5 w-full max-w-xs">
          <a
            href="https://m.me/1193134077224088"
            target="_blank"
            rel="noopener noreferrer"
            className="py-3 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Messenger</span>
          </a>
          <a
            href="https://www.facebook.com/share/1HMfSvhijx/?mibextid=wwXIfr"
            target="_blank"
            rel="noopener noreferrer"
            className="py-3 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Facebook</span>
          </a>
        </div>
      </div>
    );
  }

  const timeCalc = calculateBookingTime(activeBooking, currentTime);
  const startDateTime = getBookingStartDateTime(activeBooking);
  const isOvertime = timeCalc.isOvertime;
  const isUpcoming = timeCalc.isUpcoming;
  const isActive = timeCalc.isActive;

  // Extract license number & expiration safely
  const licenseNum = activeBooking.licenseNumber || (activeBooking.driversLicenseDetails ? activeBooking.driversLicenseDetails.split(/,\s*(?:Exp:?\s*|Expiration:?\s*)?/i)[0] : '');
  const licenseExp = activeBooking.licenseExpiration || (activeBooking.driversLicenseDetails ? activeBooking.driversLicenseDetails.split(/,\s*(?:Exp:?\s*|Expiration:?\s*)?/i)[1] : '');

  return (
    <div
      id="renter-tracker-page"
      className={`min-h-screen transition-colors duration-500 flex flex-col justify-between selection:bg-blue-600 selection:text-white ${
        isOvertime
          ? 'bg-slate-950 text-red-50'
          : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Top Renter Branding Header */}
      <header
        className={`px-3.5 sm:px-8 py-3 border-b sticky top-0 z-30 transition-colors duration-500 backdrop-blur-md ${
          isOvertime
            ? 'bg-red-950/90 border-red-900/80'
            : 'bg-slate-950/90 border-slate-800/80'
        }`}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-lg shrink-0 transition-transform ${
                isOvertime
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-gradient-to-tr from-blue-700 to-sky-500 text-white shadow-blue-600/30'
              }`}
            >
              <Car className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block leading-tight truncate">
                Miranda Rentals & Services
              </span>
              <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-tight truncate">
                Live Rental Time Tracker
              </h1>
            </div>
          </div>

          {/* Right Header: Non-wrapping Booking ID Pill + Share Action */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2 py-1 bg-slate-900 text-slate-200 border border-slate-800 rounded-lg text-xs font-mono font-bold whitespace-nowrap shadow-xs">
              {activeBooking.id}
            </span>

            <button
              onClick={handleCopyLink}
              className="p-1.5 sm:px-2.5 sm:py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-800 transition-colors flex items-center gap-1 shadow-xs active:scale-95"
              title="Copy tracker link"
              aria-label="Copy tracker link"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="hidden sm:inline text-emerald-400 text-[11px] font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="hidden sm:inline text-[11px]">Share</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl w-full mx-auto px-4 py-5 sm:py-8 flex-1 flex flex-col space-y-6">
        
        {/* Dynamic Status Alert Banner */}
        <div
          id="tracker-status-banner"
          className={`p-4 sm:p-5 rounded-2xl border transition-all duration-500 shadow-xl ${
            isOvertime
              ? 'bg-gradient-to-r from-red-950 via-red-900 to-red-950 text-white border-red-600 shadow-red-950/60 ring-1 ring-red-500/40'
              : isActive
              ? 'bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/60 text-slate-100 border-slate-800 shadow-black/60'
              : 'bg-gradient-to-r from-slate-900 via-slate-900/90 to-sky-950/60 text-sky-200 border-sky-900/60 shadow-sky-950/30'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                isOvertime
                  ? 'bg-red-500 text-white font-bold animate-bounce'
                  : isActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
              }`}
            >
              {isOvertime ? (
                <AlertOctagon className="w-5 h-5" />
              ) : isActive ? (
                <Clock className="w-5 h-5" />
              ) : (
                <Calendar className="w-5 h-5" />
              )}
            </div>

            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider block opacity-75">
                {isOvertime ? 'Urgent Alert' : 'Status'}
              </span>
              <h2 className="text-sm sm:text-base font-bold tracking-tight leading-snug">
                {isOvertime
                  ? 'Rental Time Limit Exceeded'
                  : isActive
                  ? 'Active Rental — Timer Running'
                  : 'Scheduled Trip — Ready for Dispatch'}
              </h2>
            </div>
          </div>
        </div>

        {/* Hero Countdown Timer Display */}
        <div
          id="tracker-timer-container"
          className={`p-6 sm:p-8 rounded-2xl border transition-all duration-500 flex flex-col items-center text-center shadow-2xl relative overflow-hidden ${
            isOvertime
              ? 'bg-gradient-to-b from-red-950/90 to-slate-950 border-red-700/80 shadow-red-950/60 ring-1 ring-red-500/30'
              : 'bg-gradient-to-b from-slate-900/90 to-slate-950 border-slate-800/90 shadow-black/80'
          }`}
        >
          {/* Subtle Ambient Glow */}
          <div
            className={`absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20 ${
              isOvertime ? 'bg-red-500' : 'bg-blue-600'
            }`}
          />

          <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-slate-400 mb-2 relative z-10 font-bold">
            {isOvertime
              ? 'Overtime Elapsed'
              : isUpcoming
              ? 'Time Until Trip Starts'
              : 'Time Remaining on Rental'}
          </span>

          {/* Time digits grid (Mobile-Optimized Single-Tap Clarity) */}
          <div className="grid grid-cols-4 gap-2 sm:gap-4 my-3 max-w-xl w-full relative z-10 font-mono">
            {/* Days */}
            <div
              className={`p-3 sm:p-5 rounded-2xl border flex flex-col items-center transition-transform hover:scale-102 ${
                isOvertime
                  ? 'bg-red-950/90 border-red-700 text-red-100 shadow-md'
                  : 'bg-slate-900/90 border-slate-800 text-white shadow-md'
              }`}
            >
              <span className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tighter">
                {String(timeCalc.daysRemaining).padStart(2, '0')}
              </span>
              <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                Days
              </span>
            </div>

            {/* Hours */}
            <div
              className={`p-3 sm:p-5 rounded-2xl border flex flex-col items-center transition-transform hover:scale-102 ${
                isOvertime
                  ? 'bg-red-950/90 border-red-700 text-red-100 shadow-md'
                  : 'bg-slate-900/90 border-slate-800 text-white shadow-md'
              }`}
            >
              <span className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tighter">
                {String(timeCalc.hoursRemaining).padStart(2, '0')}
              </span>
              <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                Hours
              </span>
            </div>

            {/* Minutes */}
            <div
              className={`p-3 sm:p-5 rounded-2xl border flex flex-col items-center transition-transform hover:scale-102 ${
                isOvertime
                  ? 'bg-red-950/90 border-red-700 text-red-100 shadow-md'
                  : 'bg-slate-900/90 border-slate-800 text-white shadow-md'
              }`}
            >
              <span className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tighter">
                {String(timeCalc.minutesRemaining).padStart(2, '0')}
              </span>
              <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                Mins
              </span>
            </div>

            {/* Seconds */}
            <div
              className={`p-3 sm:p-5 rounded-2xl border flex flex-col items-center transition-transform hover:scale-102 ${
                isOvertime
                  ? 'bg-red-950/90 border-red-700 text-red-200 shadow-md'
                  : 'bg-slate-900/90 border-slate-800 text-blue-400 shadow-md'
              }`}
            >
              <span className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tighter animate-pulse">
                {String(timeCalc.secondsRemaining).padStart(2, '0')}
              </span>
              <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                Secs
              </span>
            </div>
          </div>

          {/* Progress Bar & Scheduled Window */}
          <div className="w-full max-w-xl mt-3 relative z-10 space-y-2">
            <div className="flex justify-between items-center text-[10px] sm:text-xs text-slate-300 font-mono">
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-slate-500 uppercase font-sans font-bold text-[9px] sm:text-[10px] tracking-wider shrink-0">Start:</span>
                <span className="text-slate-200 font-semibold truncate">{formatDateOnly(startDateTime)} • {formatTimeOnly(startDateTime)}</span>
              </div>
              <div className="flex items-center gap-1 min-w-0 text-right justify-end">
                <span className="text-slate-500 uppercase font-sans font-bold text-[9px] sm:text-[10px] tracking-wider shrink-0">Return:</span>
                <span className="text-slate-200 font-semibold truncate">{formatDateOnly(timeCalc.endDateTime)} • {formatTimeOnly(timeCalc.endDateTime)}</span>
              </div>
            </div>
            <div className="w-full h-3 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOvertime ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-blue-500 to-sky-400'
                }`}
                style={{ width: `${Math.min(100, timeCalc.progressPercentage)}%` }}
              />
            </div>
            {isOvertime && (
              <p className="text-xs text-red-300 font-semibold text-center pt-1">
                Vehicle return was scheduled for {formatDateOnly(timeCalc.endDateTime)} at {formatTimeOnly(timeCalc.endDateTime)}.
              </p>
            )}
          </div>
        </div>

        {/* Organized Booking Details Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Trip Logistics Card */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-400" />
                Trip Itinerary & Hubs
              </h3>
              <span className="text-[11px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md">
                {activeBooking.noOfDays} Day{activeBooking.noOfDays > 1 ? 's' : ''} ({activeBooking.noOfDays * 24}h)
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 text-[10px] block uppercase font-mono tracking-wider">
                  Pickup / Start Location
                </span>
                <span className="font-bold text-white text-sm block mt-0.5">
                  {activeBooking.startLocation}
                </span>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 text-[10px] block uppercase font-mono tracking-wider">
                  Destination / Return Point
                </span>
                <span className="font-bold text-white text-sm block mt-0.5">
                  {activeBooking.destination}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="p-2.5 bg-slate-950/50 rounded-lg border border-slate-800/60">
                <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">Scheduled Start</span>
                <strong className="text-slate-200 font-mono block mt-0.5 text-xs">
                  {formatDateOnly(startDateTime)} • {formatTimeOnly(startDateTime)}
                </strong>
              </div>
              <div className="p-2.5 bg-slate-950/50 rounded-lg border border-slate-800/60">
                <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">Expected Return</span>
                <strong className="text-slate-200 font-mono block mt-0.5 text-xs">
                  {formatDateOnly(timeCalc.endDateTime)} • {formatTimeOnly(timeCalc.endDateTime)}
                </strong>
              </div>
            </div>
          </div>

          {/* Vehicle & Renter Verification Card */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Car className="w-4 h-4 text-sky-400" />
                Vehicle & Driver Profile
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                activeBooking.selfDrive
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
              }`}>
                {activeBooking.selfDrive ? 'Self-Drive Rental' : 'With Chauffeur'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-mono">Assigned Vehicle</span>
                  <span className="font-bold text-white text-sm block mt-0.5">
                    {activeBooking.vehicleModel || (activeBooking.vehicle === 'Van' ? 'Toyota Hiace Commuter Van' : 'Toyota Vios')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] block uppercase font-mono">Type & Seats</span>
                  <span className="text-slate-200 font-semibold block mt-0.5">
                    {activeBooking.vehicle} • {activeBooking.passengers} Pax
                  </span>
                </div>
              </div>

              {/* Renter Contact Info */}
              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px] uppercase font-mono">Renter Name</span>
                  <strong className="text-white text-xs">{activeBooking.name}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px] uppercase font-mono">Mobile Number</span>
                  <span className="font-mono text-slate-200 text-xs">{activeBooking.mobileNo}</span>
                </div>
              </div>

              {/* Driver's License Details (Masked for Privacy) */}
              {activeBooking.selfDrive && (licenseNum || licenseExp) && (
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] uppercase font-mono flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Authorized Driver License
                    </span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
                      Verified
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400 text-xs">License No:</span>
                    <span className="font-mono font-bold text-slate-200 text-xs">
                      {maskLicenseNumber(licenseNum)}
                    </span>
                  </div>
                  {licenseExp && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs">Expiration Date:</span>
                      <span className="font-mono text-slate-300 text-xs">
                        {licenseExp}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dedicated Miranda Rentals Reach & Assistance Hub */}
        <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 min-w-0">
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Need Assistance?</span>
            </h3>
            <span className="text-[10px] sm:text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 sm:px-2.5 py-1 rounded-full flex items-center gap-1.5 shrink-0 ml-auto whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Online & Ready
            </span>
          </div>

          {/* Social Reach Buttons (2 in a row on all screen sizes) */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {/* Messenger Button */}
            <a
              id="reach-messenger-btn"
              href="https://m.me/1193134077224088"
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-3 sm:px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 fill-current shrink-0" />
              <span>Messenger</span>
            </a>

            {/* Official Facebook Page Button */}
            <a
              id="reach-facebook-btn"
              href="https://www.facebook.com/share/1HMfSvhijx/?mibextid=wwXIfr"
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-3 sm:px-4 bg-slate-800 hover:bg-slate-700 text-slate-100 hover:text-white font-bold text-xs sm:text-sm rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 shadow-md active:scale-98"
            >
              <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>Facebook</span>
            </a>
          </div>
        </div>
      </main>

      {/* Renter Dedicated Footer */}
      <footer className="py-5 text-center text-xs text-slate-500 border-t border-slate-900 bg-slate-950/80">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Miranda Rentals and Services</span>
          <span className="text-[11px] text-slate-600">
            Booking ID: {activeBooking.id} • Live Customer Renter Portal
          </span>
        </div>
      </footer>
    </div>
  );
};
