import React, { useState, useEffect } from 'react';
import { 
  Clock, ShieldCheck, MapPin, Phone, Car, 
  Calendar, CheckCircle2, Navigation, RefreshCw, 
  User, Info, AlertOctagon, Sparkles, FileText,
  MessageCircle, Facebook, Copy, Check, AlertTriangle,
  ArrowDown, Flag, ExternalLink, Compass, FileCheck
} from 'lucide-react';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Booking } from '../types';
import { calculateBookingTime, formatDateTime, formatDateOnly, formatTimeOnly, getBookingStartDateTime } from '../utils/dateUtils';
import { loadBookings } from '../utils/storage';
import { PaymentPanel } from './PaymentPanel';

// Preset garage pickup hubs with map coordinates / navigation deep-links
export const PICKUP_HUBS = [
  {
    id: 'culipat',
    name: 'Brgy. Culipat Tarlac',
    address: 'Isle of Patmos, Zone 2, Barangay Culipat, Tarlac City, Tarlac',
    matchKeywords: ['culipat', 'isle of patmos'],
    googleMapsUrl: 'https://maps.app.goo.gl/r1SaNkcsxEFfnhPR9?g_st=ic',
    appleMapsUrl: 'https://maps.apple/p/WIFN4EtdnB81Si',
  },
  {
    id: 'fiesta',
    name: 'Brgy. Matatalaib Tarlac',
    address: 'Lot 35 Blk 27 Maasikaso St. Fiesta Communities Matatalaib Tarlac City, Tarlac 2300',
    matchKeywords: ['fiesta', 'matatalaib', 'maasikaso'],
    googleMapsUrl: 'https://maps.app.goo.gl/y6RXCnYA7cf7hZjNA?g_st=ic',
    appleMapsUrl: 'https://maps.apple/p/RjryLea7afa78t',
  }
];

export const findPickupHub = (locationStr?: string) => {
  if (!locationStr) return null;
  const locLower = locationStr.toLowerCase();
  return PICKUP_HUBS.find(hub => 
    locLower.includes(hub.address.toLowerCase()) || 
    hub.matchKeywords.some(kw => locLower.includes(kw))
  ) || null;
};

interface RenterTrackerViewProps {
  booking: Booking | null;
  bookingId?: string | null;
  onNavigateHome?: () => void;
  onNavigateAdmin?: () => void;
  onLookupId?: (id: string) => void;
}

// In-memory cache for looked up tracker bookings to avoid re-hitting database
const trackerMemoryCache = new Map<string, Booking | null>();

export const RenterTrackerView: React.FC<RenterTrackerViewProps> = ({
  booking,
  bookingId,
  onNavigateHome,
  onNavigateAdmin,
  onLookupId,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [remoteBooking, setRemoteBooking] = useState<Booking | null>(() => {
    if (booking) return booking;
    if (bookingId) {
      if (trackerMemoryCache.has(bookingId)) {
        return trackerMemoryCache.get(bookingId) || null;
      }
      // Check local cached bookings
      const local = loadBookings();
      const match = local.find(
        (b) => b.id.toLowerCase() === bookingId.toLowerCase() || 
               (b.trackingToken && b.trackingToken.toLowerCase() === bookingId.toLowerCase())
      );
      if (match) {
        trackerMemoryCache.set(bookingId, match);
        return match;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(!booking && !!bookingId && !trackerMemoryCache.has(bookingId || ''));
  const [copiedLink, setCopiedLink] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchError, setSearchError] = useState('');

  // Precision 1-second live ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch or real-time subscribe from Firestore only if not in local storage / memory
  useEffect(() => {
    if (booking) {
      setRemoteBooking(booking);
      if (bookingId) trackerMemoryCache.set(bookingId, booking);
      setIsLoading(false);
      return;
    }
    if (!bookingId) {
      setIsLoading(false);
      return;
    }

    // 1. Check local storage first to save database hits
    const local = loadBookings();
    const match = local.find(
      (b) => b.id.toLowerCase() === bookingId.toLowerCase() || 
             (b.trackingToken && b.trackingToken.toLowerCase() === bookingId.toLowerCase())
    );
    if (match) {
      setRemoteBooking(match);
      trackerMemoryCache.set(bookingId, match);
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
            const data = snapshot.docs[0].data() as Booking;
            setRemoteBooking(data);
            trackerMemoryCache.set(bookingId, data);
          } else {
            setRemoteBooking(null);
            trackerMemoryCache.set(bookingId, null);
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
          const data = docSnap.data() as Booking;
          setRemoteBooking(data);
          trackerMemoryCache.set(bookingId, data);
          setIsLoading(false);
        } else {
          // Fallback check by trackingToken query
          const q = query(collection(db, 'bookings'), where('trackingToken', '==', bookingId));
          const unsubFallback = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
              const data = snapshot.docs[0].data() as Booking;
              setRemoteBooking(data);
              trackerMemoryCache.set(bookingId, data);
            } else {
              setRemoteBooking(null);
              trackerMemoryCache.set(bookingId, null);
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
    if (navigator.clipboard && activeBooking) {
      const trackerKey = activeBooking.trackingToken || activeBooking.id;
      const trackerUrl = `${window.location.origin}/tracker?id=${encodeURIComponent(trackerKey)}`;
      navigator.clipboard.writeText(trackerUrl);
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
    const handleSearchSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const clean = searchInput.trim();
      if (!clean) {
        setSearchError('Please enter your Booking ID or Tracking Reference');
        return;
      }
      setSearchError('');
      if (onLookupId) {
        onLookupId(clean);
      } else {
        window.history.pushState({}, '', `/tracker?id=${encodeURIComponent(clean)}`);
        window.location.reload();
      }
    };

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8">
        {/* Top Minimal Header */}
        <div className="max-w-md w-full mx-auto flex items-center justify-between">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <Car className="w-4 h-4 text-blue-500" />
            <span>Miranda Rentals</span>
          </button>
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-4"
            >
              Public Calendar
            </button>
          )}
        </div>

        {/* Center Search / Lookup Card */}
        <div className="max-w-md w-full mx-auto my-auto py-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mx-auto shadow-xl">
            <Car className="w-8 h-8 text-blue-500" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Live Rental Tracker</h1>
          </div>

          <form onSubmit={handleSearchSubmit} className="space-y-3.5 text-left">
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (searchError) setSearchError('');
                }}
                placeholder="e.g. MR-1001 or trk_..."
                className="w-full px-4 py-3.5 bg-slate-900 border border-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-base text-white placeholder-slate-500 outline-none transition-all"
              />
            </div>

            {/* Notice placed below the textbox only when there is an invalid bookingId or search error */}
            {(bookingId || searchError) && (
              <div className="p-4 bg-sky-500/10 border border-sky-500/30 rounded-2xl text-left flex items-start gap-3 shadow-lg shadow-sky-950/20">
                <AlertTriangle className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">
                    Notice
                  </span>
                  <p className="text-xs sm:text-sm text-sky-100 font-medium leading-relaxed">
                    {bookingId ? (
                      <>Booking ID &ldquo;<span className="font-mono text-sky-300 font-semibold">{bookingId}</span>&rdquo; could not be located. Enter a valid Booking ID below</>
                    ) : (
                      searchError
                    )}
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <Navigation className="w-4 h-4" />
              <span>Track Live Rental</span>
            </button>
          </form>

          {/* Friendly Guidance Note */}
          <div className="p-3.5 bg-slate-900/90 border border-slate-800/90 rounded-xl text-left flex items-start gap-2.5 shadow-xs">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-white font-semibold">Note:</strong> You can find your <span className="text-blue-300 font-mono">Booking ID</span> or <span className="text-blue-300 font-mono">Tracking Reference</span> in the booking confirmation details sent to you. If you haven't received yours yet, please reach out to us via our communication channels below.
            </p>
          </div>

          {/* Social / Direct Channels */}
          <div className="pt-4 border-t border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-3">
              Need assistance with your booking?
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <a
                href="https://m.me/1193134077224088"
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4 text-blue-400" />
                <span>Messenger</span>
              </a>
              <a
                href="https://www.facebook.com/share/1HMfSvhijx/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl transition-all border border-slate-800 flex items-center justify-center gap-2"
              >
                <Facebook className="w-4 h-4 text-blue-500" />
                <span>Facebook</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Footer Note */}
        <div className="max-w-md w-full mx-auto text-center text-xs text-slate-600 pt-4">
          <span>Miranda Rentals and Services • Customer Portal</span>
        </div>
      </div>
    );
  }

  const timeCalc = calculateBookingTime(activeBooking, currentTime);
  const startDateTime = getBookingStartDateTime(activeBooking);
  const isCompleted = timeCalc.isCompleted;
  const isOvertime = !isCompleted && timeCalc.isOvertime;
  const isUpcoming = !isCompleted && timeCalc.isUpcoming;
  const isActive = !isCompleted && timeCalc.isActive;

  // Extract license number & expiration safely
  const licenseNum = activeBooking.licenseNumber || (activeBooking.driversLicenseDetails ? activeBooking.driversLicenseDetails.split(/,\s*(?:Exp:?\s*|Expiration:?\s*)?/i)[0] : '');
  const licenseExp = activeBooking.licenseExpiration || (activeBooking.driversLicenseDetails ? activeBooking.driversLicenseDetails.split(/,\s*(?:Exp:?\s*|Expiration:?\s*)?/i)[1] : '');

  return (
    <div
      id="renter-tracker-page"
      className={`min-h-screen transition-colors duration-500 flex flex-col justify-between selection:bg-blue-600 selection:text-white ${
        isCompleted
          ? 'bg-slate-950 text-emerald-50'
          : isOvertime
          ? 'bg-slate-950 text-red-50'
          : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Top Renter Branding Header */}
      <header
        className={`px-3.5 sm:px-8 py-3 border-b sticky top-0 z-30 transition-colors duration-500 backdrop-blur-md ${
          isCompleted
            ? 'bg-emerald-950/80 border-emerald-900/60'
            : isOvertime
            ? 'bg-red-950/90 border-red-900/80'
            : 'bg-slate-950/90 border-slate-800/80'
        }`}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-lg shrink-0 transition-transform ${
                isCompleted
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                  : isOvertime
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-gradient-to-tr from-blue-700 to-sky-500 text-white shadow-blue-600/30'
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Car className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </div>
            <div className="min-w-0">
              <span className={`text-[10px] font-bold uppercase tracking-wider block leading-tight truncate ${isCompleted ? 'text-emerald-400' : 'text-blue-400'}`}>
                Miranda Rentals & Services
              </span>
              <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-tight truncate">
                {isCompleted ? 'Turnover Completed' : 'Live Rental Time Tracker'}
              </h1>
            </div>
          </div>

          {/* Right Header: Navigation & Non-wrapping Booking ID Pill + Share Action */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onNavigateHome && (
              <button
                onClick={onNavigateHome}
                className="hidden sm:flex px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-800 transition-colors items-center gap-1 shadow-xs"
              >
                <span>Calendar</span>
              </button>
            )}

            <span className={`px-2 py-1 border rounded-lg text-xs font-mono font-bold whitespace-nowrap shadow-xs ${
              isCompleted 
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80' 
                : 'bg-slate-900 text-slate-200 border-slate-800'
            }`}>
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
            isCompleted
              ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-emerald-100 border-emerald-600/60 shadow-emerald-950/50'
              : isOvertime
              ? 'bg-gradient-to-r from-red-950 via-red-900 to-red-950 text-white border-red-600 shadow-red-950/60 ring-1 ring-red-500/40'
              : isActive
              ? 'bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/60 text-slate-100 border-slate-800 shadow-black/60'
              : 'bg-gradient-to-r from-slate-900 via-slate-900/90 to-sky-950/60 text-sky-200 border-sky-900/60 shadow-sky-950/30'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                isCompleted
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : isOvertime
                  ? 'bg-red-500 text-white font-bold animate-bounce'
                  : isActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              ) : isOvertime ? (
                <AlertOctagon className="w-5 h-5" />
              ) : isActive ? (
                <Clock className="w-5 h-5" />
              ) : (
                <Calendar className="w-5 h-5" />
              )}
            </div>

            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider block opacity-75">
                {isCompleted ? 'Turnover Logged' : isOvertime ? 'Urgent Alert' : 'Status'}
              </span>
              <h2 className="text-sm sm:text-base font-bold tracking-tight leading-snug">
                {isCompleted
                  ? 'Successful Turnover • Rental Period Completed'
                  : isOvertime
                  ? 'Rental Time Limit Exceeded'
                  : isActive
                  ? 'Active Rental — Timer Running'
                  : 'Scheduled Trip — Ready for Dispatch'}
              </h2>
            </div>
          </div>
        </div>

        {/* Hero Section: Completed Gratitude Showcase OR Live Countdown Display */}
        {isCompleted ? (
          <div
            id="tracker-completed-showcase"
            className="p-6 sm:p-8 rounded-2xl border border-emerald-600/40 bg-gradient-to-b from-slate-900/95 via-emerald-950/30 to-slate-950 text-center shadow-2xl relative overflow-hidden space-y-6"
          >
            {/* Ambient Emerald Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none bg-emerald-500/15" />

            <div className="relative z-10 max-w-lg mx-auto space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-400/50 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.35)]">
                <Sparkles className="w-8 h-8 text-emerald-300 animate-pulse" />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-emerald-400 block">
                  Rental Finished • Vehicle Checked In
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Thank You for Choosing Miranda Rentals!
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                We sincerely appreciate your prompt turnover of the vehicle. We hope you had a safe and enjoyable journey with our fleet!
              </p>
            </div>

            {/* Turnover Inspection & Verification Breakdown */}
            <div className="relative z-10 max-w-xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left font-mono">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Returned At</span>
                <span className="text-xs font-bold text-white block mt-0.5 truncate">
                  {activeBooking.turnoverDetails?.returnedAt 
                    ? formatDateTime(new Date(activeBooking.turnoverDetails.returnedAt)) 
                    : activeBooking.completedAt 
                    ? formatDateTime(new Date(activeBooking.completedAt))
                    : 'Turnover Verified'}
                </span>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Fuel Status</span>
                <span className="text-xs font-bold text-emerald-300 block mt-0.5 truncate">
                  {activeBooking.turnoverDetails?.fuelLevel || 'Verified OK'}
                </span>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Odometer</span>
                <span className="text-xs font-bold text-sky-300 block mt-0.5 truncate">
                  {activeBooking.turnoverDetails?.odometerReading || 'Checked'}
                </span>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Handled By</span>
                <span className="text-xs font-bold text-slate-200 block mt-0.5 truncate">
                  {activeBooking.turnoverDetails?.receivedBy || 'Miranda Rentals'}
                </span>
              </div>
            </div>

            {activeBooking.turnoverDetails?.conditionNotes && (
              <div className="relative z-10 max-w-xl mx-auto p-3 bg-slate-950/70 rounded-xl border border-emerald-900/40 text-left">
                <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold block mb-1">
                  Turnover Inspection Notes
                </span>
                <p className="text-xs text-slate-300 italic">
                  &ldquo;{activeBooking.turnoverDetails.conditionNotes}&rdquo;
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Hero Countdown Timer Display */
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

            {/* Time digits grid */}
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
        )}

        {/* Dedicated Payment & Settlement Panel */}
        <PaymentPanel booking={activeBooking} />

        {/* Organized Booking Details Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Trip Logistics Card */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            {/* Header with Duration Pill */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                Trip Itinerary & Hubs
              </h3>
              <span className="text-[11px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg shadow-xs">
                {activeBooking.durationHours ? `${activeBooking.durationHours} HOUR${activeBooking.durationHours > 1 ? 'S' : ''}` : `${activeBooking.noOfDays} DAY${activeBooking.noOfDays > 1 ? 'S' : ''}`}
              </span>
            </div>

            {/* Stepper & Cards Layout */}
            {(() => {
              const pickupHub = findPickupHub(activeBooking.startLocation);
              const startDisplayTitle = pickupHub ? pickupHub.name : activeBooking.startLocation;
              const routeDirectionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(activeBooking.startLocation)}&destination=${encodeURIComponent(activeBooking.destination)}`;

              return (
                <div className="space-y-4">
                  {/* Timeline Stepper Container */}
                  <div className="relative flex items-stretch gap-3.5 pt-1">
                    {/* Left Luminous Timeline Bar */}
                    <div className="w-6 flex flex-col items-center shrink-0 select-none py-1">
                      {/* Top Luminous Node */}
                      <div className="w-5 h-5 rounded-full bg-slate-950 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_12px_rgba(34,211,238,0.55)] ring-4 ring-cyan-500/20 shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
                      </div>

                      {/* Continuous Cyan Connecting Line with Midpoint Downward Arrow Node */}
                      <div className="w-0.5 flex-1 min-h-[48px] bg-cyan-400 flex items-center justify-center my-0.5 relative">
                        <div className="w-4 h-4 rounded-full bg-slate-950 border border-cyan-400 flex items-center justify-center shadow-[0_0_8px_rgba(34,211,238,0.4)]">
                          <ArrowDown className="w-2.5 h-2.5 text-cyan-300 stroke-[3]" />
                        </div>
                      </div>

                      {/* Bottom Luminous Node */}
                      <div className="w-5 h-5 rounded-full bg-slate-950 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_12px_rgba(34,211,238,0.55)] ring-4 ring-cyan-500/20 shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
                      </div>
                    </div>

                    {/* Right Cards Stack */}
                    <div className="flex-1 min-w-0 space-y-3.5">
                      {/* Top Card: Rental Start */}
                      <div className="p-3.5 bg-slate-950/75 hover:bg-slate-950/90 rounded-xl border border-slate-800/90 hover:border-slate-700/80 transition-colors shadow-inner space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-cyan-400">
                            <Clock className="w-3.5 h-3.5" />
                            <MapPin className="w-3.5 h-3.5" />
                          </div>
                          {pickupHub && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-300">
                              <Compass className="w-2.5 h-2.5" />
                              Garage Hub
                            </span>
                          )}
                        </div>

                        <div>
                          <span className="text-white font-extrabold text-sm block tracking-tight leading-tight">
                            START LOCATION • {startDisplayTitle}
                          </span>
                          <span className="text-slate-400 text-xs font-medium block mt-1">
                            {formatDateOnly(startDateTime)}, {formatTimeOnly(startDateTime)}
                          </span>
                          {pickupHub && (
                            <span className="text-slate-400 text-[11px] block mt-1 leading-relaxed">
                              {activeBooking.startLocation}
                            </span>
                          )}
                        </div>

                        {/* Navigation Buttons for Hub - Equal 50/50 Columns in 1 Row */}
                        {pickupHub && (
                          <div className="pt-2.5 border-t border-slate-800/80 grid grid-cols-2 gap-2 w-full">
                            <a
                              href={pickupHub.googleMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 hover:border-emerald-500/60 text-xs font-semibold text-emerald-300 transition-all shadow-xs text-center group"
                            >
                              <svg className="w-3.5 h-3.5 fill-emerald-400 shrink-0" viewBox="0 0 24 24">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                              </svg>
                              <span>Google Maps</span>
                              <ExternalLink className="w-3 h-3 text-emerald-400/60 group-hover:text-emerald-300 transition-colors" />
                            </a>

                            <a
                              href={pickupHub.appleMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-sky-500/30 hover:border-sky-500/60 text-xs font-semibold text-sky-300 transition-all shadow-xs text-center group"
                            >
                              <Compass className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              <span>Apple Maps</span>
                              <ExternalLink className="w-3 h-3 text-sky-400/60 group-hover:text-sky-300 transition-colors" />
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Bottom Card: Return */}
                      <div className="p-3.5 bg-slate-950/75 hover:bg-slate-950/90 rounded-xl border border-slate-800/90 hover:border-slate-700/80 transition-colors shadow-inner space-y-1.5">
                        <div className="flex items-center gap-1.5 text-cyan-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <Flag className="w-3.5 h-3.5" />
                        </div>

                        <div>
                          <span className="text-white font-extrabold text-sm block tracking-tight leading-tight">
                            RETURN • {activeBooking.destination}
                          </span>
                          <span className="text-slate-400 text-xs font-medium block mt-1">
                            {formatDateOnly(timeCalc.endDateTime)}, {formatTimeOnly(timeCalc.endDateTime)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Route Navigation Link Footer */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center">
                    <a
                      href={routeDirectionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors py-1 px-3 rounded-lg hover:bg-cyan-500/10"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>View full route on Google Maps</span>
                      <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
                    </a>
                  </div>
                </div>
              );
            })()}
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
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
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

              {/* Designated Driver Info (for Self-Drive) */}
              {activeBooking.selfDrive && (
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] uppercase font-mono">Designated Driver</span>
                    <strong className="text-white text-xs">
                      {activeBooking.driverName || activeBooking.name}
                      {activeBooking.renterIsDriver !== false && (
                        <span className="ml-1.5 text-[10px] text-sky-400 font-normal">(Renter)</span>
                      )}
                    </strong>
                  </div>
                  {activeBooking.driverBirthdate && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[10px] uppercase font-mono">Driver Birthdate</span>
                      <span className="font-mono text-slate-200 text-xs">{formatDateOnly(activeBooking.driverBirthdate)}</span>
                    </div>
                  )}
                </div>
              )}

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
                        {formatDateOnly(licenseExp)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Rental Contract & Agreement Notice */}
              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex items-center">
                  <span className="text-slate-400 text-[10px] uppercase font-mono flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
                    Rental Contract Agreement
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  We encourage you to review the agreement beforehand. This document will need to be signed upon turnover of the vehicle.
                </p>
                <a
                  href="https://storage.googleapis.com/miranda-rentals-public/Miranda_Rentals_Agreement_Form_Placeholder.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-xs font-semibold text-cyan-300 transition-colors shadow-xs active:scale-98"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Read Agreement Contract (PDF)</span>
                  <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Notes & Special Instructions Card */}
          {activeBooking.notes && activeBooking.notes.trim() && (
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-2.5">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <FileText className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Rental Notes & Special Instructions
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 font-normal">
                {activeBooking.notes}
              </p>
            </div>
          )}
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
              <Facebook className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 shrink-0" />
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
