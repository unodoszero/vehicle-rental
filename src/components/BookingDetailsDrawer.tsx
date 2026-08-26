import React, { useState, useEffect } from 'react';
import { 
  X, Copy, Check, ExternalLink, Calendar, Clock, MapPin, 
  Phone, User, Users, Car, ShieldCheck, AlertTriangle, 
  Edit, Trash2, ArrowRight, Sparkles, Navigation
} from 'lucide-react';
import { Booking } from '../types';
import { calculateBookingTime, formatDateTime, formatDateOnly, formatTimeOnly } from '../utils/dateUtils';
import { useToast } from './Toast';

interface BookingDetailsDrawerProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (booking: Booking) => void;
  onDelete: (booking: Booking) => void;
  onOpenTracker: (bookingId: string) => void;
}

export const BookingDetailsDrawer: React.FC<BookingDetailsDrawerProps> = ({
  booking,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onOpenTracker,
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Second-by-second live calculation
  useEffect(() => {
    if (!isOpen || !booking) return;
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, booking]);

  if (!isOpen || !booking) return null;

  const timeCalc = calculateBookingTime(booking, currentTime);

  const handleCopyLink = () => {
    // Generate tracker link with query param or hash for client-side routing
    const trackerUrl = `${window.location.origin}${window.location.pathname}?tracker=${booking.id}`;
    navigator.clipboard.writeText(trackerUrl).then(() => {
      setCopied(true);
      showToast('Tracker Link Copied!', `Public link for ${booking.name} copied to clipboard.`, 'success');
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      // Fallback
      prompt('Copy this tracker link for the renter:', trackerUrl);
    });
  };

  return (
    <div
      id="booking-drawer-backdrop"
      className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs flex justify-end animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div
        id="booking-drawer-content"
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden border-l border-slate-200 animate-slide-left"
      >
        {/* Drawer Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-5 shrink-0 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Booking Details
            </h2>
          </div>
          <button
            id="close-drawer-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body Details */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-900">
          
          {/* Live Tracker View Card (Geometric Balance Archetype) */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Live Tracker View
            </h2>
            {timeCalc.isOvertime ? (
              <div className="bg-red-600 rounded-lg p-4 text-white text-center shadow-lg shadow-red-200">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                  Warning: Overtime
                </p>
                <div className="text-3xl font-mono font-bold my-1">
                  +{timeCalc.formattedRemaining}
                </div>
                <p className="text-[11px] opacity-90">
                  {booking.name} • {booking.vehicleModel || `${booking.vehicle} Rental`}
                </p>
              </div>
            ) : timeCalc.isActive ? (
              <div className="bg-blue-600 rounded-lg p-4 text-white text-center shadow-lg shadow-blue-200">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                  Active Rental
                </p>
                <div className="text-3xl font-mono font-bold my-1">
                  {timeCalc.formattedRemaining}
                </div>
                <p className="text-[11px] opacity-90">
                  {booking.name} • {booking.vehicleModel || `${booking.vehicle} Rental`}
                </p>
              </div>
            ) : (
              <div className="bg-slate-900 rounded-lg p-4 text-white text-center shadow-md">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                  Scheduled Departure
                </p>
                <div className="text-2xl font-mono font-bold my-1">
                  {timeCalc.formattedRemaining}
                </div>
                <p className="text-[11px] text-slate-300">
                  Starts {booking.startDate} at {booking.startTime}
                </p>
              </div>
            )}
          </div>

          {/* Structured Booking Info List */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100">
              <span className="text-slate-500">Booking ID:</span>
              <span className="font-bold font-mono text-slate-900">#{booking.id}</span>
            </div>

            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100">
              <span className="text-slate-500">Customer:</span>
              <span className="font-bold text-slate-900">{booking.name}</span>
            </div>

            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100">
              <span className="text-slate-500">Mobile:</span>
              <a href={`tel:${booking.mobileNo}`} className="font-bold font-mono text-blue-600 hover:underline">
                {booking.mobileNo}
              </a>
            </div>

            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100">
              <span className="text-slate-500">Vehicle:</span>
              <span className="font-bold text-slate-900">{booking.vehicle} — {booking.vehicleModel || 'Standard'}</span>
            </div>

            {booking.plateNumber && (
              <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100">
                <span className="text-slate-500">Plate Number:</span>
                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                  {booking.plateNumber}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100">
              <span className="text-slate-500">Driver Mode:</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                booking.selfDrive ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
              }`}>
                {booking.selfDrive ? 'Self-Drive (Customer)' : 'Company Chauffeur'}
              </span>
            </div>

            {booking.selfDrive && booking.driversLicenseDetails && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Driver License File
                </span>
                <span className="font-mono text-slate-800 font-semibold">{booking.driversLicenseDetails}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100">
              <span className="text-slate-500">Route:</span>
              <span className="font-semibold text-slate-900">
                {booking.startLocation} &rarr; {booking.destination}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100">
              <span className="text-slate-500">Schedule:</span>
              <span className="font-semibold text-slate-900">
                {booking.startDate} ({booking.startTime}) • {booking.noOfDays} Day{booking.noOfDays > 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100">
              <span className="text-slate-500">End Date / Return:</span>
              <span className="font-bold text-slate-900">
                {formatDateOnly(timeCalc.endDateTime)}, {formatTimeOnly(timeCalc.endDateTime)}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs py-1">
              <span className="text-slate-500">Passengers:</span>
              <span className="font-bold text-slate-900">{booking.passengers} Pax</span>
            </div>
          </div>

          {/* Public Tracking Link Box */}
          <div className="pt-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-2">
              Public Tracking Link
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 truncate bg-slate-100 p-2 rounded text-[11px] font-mono text-slate-600 border border-slate-200">
                {`${window.location.origin}${window.location.pathname}?tracker=${booking.id}`}
              </div>
              <button
                id="copy-tracker-link-btn"
                onClick={handleCopyLink}
                className="p-2 bg-slate-900 text-white rounded hover:bg-slate-800 active:scale-95 transition-transform flex items-center justify-center shrink-0"
                title="Copy tracker link"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <button
                onClick={handleCopyLink}
                className="text-[11px] text-blue-600 font-semibold hover:underline"
              >
                {copied ? 'Copied with Token' : 'Copy Link with Token'}
              </button>

              <button
                id="open-live-tracker-btn"
                onClick={() => onOpenTracker(booking.id)}
                className="text-[11px] text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3 text-slate-400" />
                Preview Live Tracker
              </button>
            </div>
          </div>

          {booking.notes && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Internal Operational Notes
              </span>
              <p className="text-slate-700 italic">{booking.notes}</p>
            </div>
          )}
        </div>

        {/* Drawer Actions */}
        <div className="p-6 border-t border-slate-200 space-y-2.5 bg-white shrink-0">
          <button
            id="drawer-edit-booking-btn"
            onClick={() => onEdit(booking)}
            className="w-full py-2.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Edit className="w-3.5 h-3.5 text-slate-600" />
            Edit Booking
          </button>

          <button
            id="drawer-delete-booking-btn"
            onClick={() => onDelete(booking)}
            className="w-full py-2.5 text-red-600 text-xs font-bold hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Booking
          </button>
        </div>
      </div>
    </div>
  );
};
