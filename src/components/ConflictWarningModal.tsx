import React from 'react';
import { AlertTriangle, Clock, Calendar, Car, ArrowRight, X } from 'lucide-react';
import { Booking } from '../types';
import { formatDateTime, getBookingStartDateTime, getBookingEndDateTime } from '../utils/dateUtils';

interface ConflictWarningModalProps {
  isOpen: boolean;
  proposedBooking: Partial<Booking>;
  conflictingBookings: Booking[];
  onProceed: () => void;
  onCancel: () => void;
}

export const ConflictWarningModal: React.FC<ConflictWarningModalProps> = ({
  isOpen,
  proposedBooking,
  conflictingBookings,
  onProceed,
  onCancel,
}) => {
  if (!isOpen) return null;

  const proposedStart = proposedBooking.startDate && proposedBooking.startTime
    ? getBookingStartDateTime(proposedBooking as Booking)
    : new Date();
  const proposedEnd = proposedBooking.startDate && proposedBooking.startTime && proposedBooking.noOfDays
    ? getBookingEndDateTime(proposedBooking as Booking)
    : new Date();

  return (
    <div
      id="conflict-warning-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-warning-title"
    >
      <div
        id="conflict-warning-modal-card"
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-sky-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Sky Alert Header */}
        <div className="bg-sky-50 border-b border-sky-200 px-6 py-4 flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-sky-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 id="conflict-warning-title" className="text-base font-bold text-slate-900 leading-snug">
              Schedule Overlap Detected
            </h3>
            <p className="text-[11px] text-sky-900/90 mt-0.5 leading-relaxed">
              The requested time slot for this <strong>{proposedBooking.vehicle || 'Vehicle'}</strong> overlaps with {conflictingBookings.length} existing booking{conflictingBookings.length > 1 ? 's' : ''}.
            </p>
          </div>
          <button
            id="close-conflict-modal-btn"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-sky-100/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Proposed Booking Box */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <div className="flex items-center justify-between text-slate-500 font-medium mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Proposed New Booking</span>
              <span className="font-semibold text-slate-800 text-[11px]">{proposedBooking.vehicle} • {proposedBooking.noOfDays} Day{(proposedBooking.noOfDays || 1) > 1 ? 's' : ''}</span>
            </div>
            <div className="font-semibold text-slate-900 text-sm">
              {proposedBooking.name || 'New Client'}
            </div>
            <div className="text-slate-600 mt-1 flex items-center gap-1.5 font-mono text-[11px]">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatDateTime(proposedStart)}</span>
              <ArrowRight className="w-3 h-3 text-slate-400 inline" />
              <span>{formatDateTime(proposedEnd)}</span>
            </div>
          </div>

          {/* Overlapping Bookings List */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Conflicting Active Schedule ({conflictingBookings.length})
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {conflictingBookings.map((conflict) => {
                const confStart = getBookingStartDateTime(conflict);
                const confEnd = getBookingEndDateTime(conflict);
                return (
                  <div
                    key={conflict.id}
                    className="p-3 bg-red-50/70 border border-red-200 rounded-lg text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-950 flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-red-600" />
                        {conflict.name}
                      </span>
                      <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-semibold text-[10px] font-mono">
                        {conflict.vehicle} ({conflict.plateNumber || conflict.id})
                      </span>
                    </div>
                    <div className="text-red-900/80 flex items-center gap-1 mt-0.5 font-mono text-[11px]">
                      <Calendar className="w-3 h-3 text-red-500" />
                      <span>{formatDateTime(confStart)} &rarr; {formatDateTime(confEnd)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-slate-100/70 rounded-lg text-[11px] text-slate-600">
            <strong>Operational Note:</strong> If your company maintains multiple vehicles under this category or you are manually assigning an auxiliary fleet unit, you may confirm and force-schedule. Otherwise, adjust the start date or duration.
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            id="cancel-conflict-btn"
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
          >
            Adjust Dates / Cancel
          </button>
          <button
            id="force-proceed-conflict-btn"
            type="button"
            onClick={onProceed}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-md shadow-blue-600/20 active:scale-95"
          >
            Override & Schedule Anyway
          </button>
        </div>
      </div>
    </div>
  );
};
