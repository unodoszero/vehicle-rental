import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Car,
  Clock,
  Calendar,
  Fuel,
  Gauge,
  FileText,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { Booking, TurnoverDetails } from '../types';
import {
  formatDateOnly,
  formatTimeOnly,
  getBookingStartDateTime,
  getBookingEndDateTime,
  toISODateString
} from '../utils/dateUtils';

interface TurnoverLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onConfirmTurnover: (bookingId: string, details: TurnoverDetails) => void;
}

export const TurnoverLogModal: React.FC<TurnoverLogModalProps> = ({
  isOpen,
  onClose,
  booking,
  onConfirmTurnover,
}) => {
  const [returnDate, setReturnDate] = useState<string>('');
  const [returnTime, setReturnTime] = useState<string>('');
  const [fuelLevel, setFuelLevel] = useState<string>('Full');
  const [odometerReading, setOdometerReading] = useState<string>('');
  const [conditionNotes, setConditionNotes] = useState<string>('');
  const [receivedBy, setReceivedBy] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Initialize defaults whenever modal opens or booking changes
  useEffect(() => {
    if (isOpen && booking) {
      const now = new Date();
      const nowHours = String(now.getHours()).padStart(2, '0');
      const nowMinutes = String(now.getMinutes()).padStart(2, '0');

      setReturnDate(toISODateString(now));
      setReturnTime(`${nowHours}:${nowMinutes}`);
      setFuelLevel(booking.turnoverDetails?.fuelLevel || 'Full');
      setOdometerReading(booking.turnoverDetails?.odometerReading || '');
      setConditionNotes(booking.turnoverDetails?.conditionNotes || '');
      setReceivedBy(booking.turnoverDetails?.receivedBy || 'Admin Desk');
      setError(null);
    }
  }, [isOpen, booking]);

  if (!isOpen || !booking) return null;

  const startDateTime = getBookingStartDateTime(booking);
  const scheduledEndDateTime = getBookingEndDateTime(booking);

  const handleSetCurrentTime = () => {
    const now = new Date();
    const nowHours = String(now.getHours()).padStart(2, '0');
    const nowMinutes = String(now.getMinutes()).padStart(2, '0');
    setReturnDate(toISODateString(now));
    setReturnTime(`${nowHours}:${nowMinutes}`);
  };

  const handleSetScheduledTime = () => {
    setReturnDate(booking.startDate);
    const end = getBookingEndDateTime(booking);
    const endHours = String(end.getHours()).padStart(2, '0');
    const endMinutes = String(end.getMinutes()).padStart(2, '0');
    setReturnDate(toISODateString(end));
    setReturnTime(`${endHours}:${endMinutes}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnDate || !returnTime) {
      setError('Please provide a valid return date and time.');
      return;
    }

    const isoReturnedAt = `${returnDate}T${returnTime}:00`;
    const details: TurnoverDetails = {
      returnedAt: isoReturnedAt,
      fuelLevel,
      odometerReading: odometerReading.trim() || undefined,
      conditionNotes: conditionNotes.trim() || undefined,
      receivedBy: receivedBy.trim() || undefined,
      loggedAt: new Date().toISOString(),
    };

    onConfirmTurnover(booking.id, details);
    onClose();
  };

  const fuelOptions = [
    { label: 'Full', icon: '⛽ 100%' },
    { label: '3/4', icon: '75%' },
    { label: '1/2', icon: '50%' },
    { label: '1/4', icon: '25%' },
    { label: 'Low / Empty', icon: '⚠️ Low' }
  ];

  return (
    <div
      id="turnover-log-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        id="turnover-log-modal-card"
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-800 px-6 py-4.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 shadow-xs">
              <CheckCircle2 className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Log Successful Turnover</h2>
              <p className="text-xs text-emerald-100/90 font-medium">
                Record vehicle return & mark rental as Completed
              </p>
            </div>
          </div>
          <button
            id="close-turnover-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Summary Strip */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-900">{booking.name}</span>
                <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                  {booking.id}
                </span>
              </div>
              <span className="font-semibold text-slate-700">
                {booking.vehicleModel || (booking.vehicle === 'Car' ? 'Toyota Vios' : 'Toyota Hiace')}
                {booking.plateNumber && ` (${booking.plateNumber})`}
              </span>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-200/60 pt-2 font-mono">
              <span>
                Start: {formatDateOnly(startDateTime)} {formatTimeOnly(startDateTime)}
              </span>
              <span>
                Sched End: {formatDateOnly(scheduledEndDateTime)} {formatTimeOnly(scheduledEndDateTime)}
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actual Return Date & Time */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Actual Turnover Timestamp
              </label>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={handleSetCurrentTime}
                  className="text-blue-600 font-bold hover:underline"
                >
                  Now
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={handleSetScheduledTime}
                  className="text-slate-500 hover:text-slate-700 hover:underline"
                >
                  Scheduled
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Return Date</label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="turnover-return-date"
                    type="date"
                    required
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full pl-8.5 pr-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Return Time</label>
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="turnover-return-time"
                    type="time"
                    required
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                    className="w-full pl-8.5 pr-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Fuel Level Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Fuel className="w-3.5 h-3.5 text-slate-400" />
              Fuel Level Upon Return
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {fuelOptions.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  id={`fuel-btn-${opt.label.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => setFuelLevel(opt.label)}
                  className={`py-2 px-1 text-center rounded-lg border text-xs font-bold transition-all ${
                    fuelLevel === opt.label
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="block text-[11px]">{opt.label}</span>
                  <span className="text-[9px] text-slate-400 font-normal">{opt.icon}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Return Odometer & Admin Staff */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-1.5">
                <Gauge className="w-3.5 h-3.5 text-slate-400" />
                Odometer (Optional)
              </label>
              <input
                id="turnover-odometer"
                type="text"
                value={odometerReading}
                onChange={(e) => setOdometerReading(e.target.value)}
                placeholder="e.g. 45,210 km"
                className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-1.5">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                Received By (Staff)
              </label>
              <input
                id="turnover-received-by"
                type="text"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                placeholder="Admin / Staff name"
                className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Inspection / Turnover Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Vehicle Inspection & Turnover Notes (Optional)
            </label>
            <textarea
              id="turnover-condition-notes"
              rows={2}
              value={conditionNotes}
              onChange={(e) => setConditionNotes(e.target.value)}
              placeholder="e.g., Car inspected and in pristine condition, spare tire & tools complete, returned earlier than scheduled."
              className="w-full p-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              id="turnover-cancel-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              id="turnover-confirm-btn"
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Mark as Completed</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
