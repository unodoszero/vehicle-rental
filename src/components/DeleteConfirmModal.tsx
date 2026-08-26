import React from 'react';
import { Trash2, AlertCircle, X } from 'lucide-react';
import { Booking } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  booking: Booking | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  booking,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !booking) return null;

  return (
    <div
      id="delete-confirm-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
    >
      <div
        id="delete-confirm-modal-card"
        className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h3 id="delete-confirm-title" className="text-base font-bold text-slate-900 leading-tight">
                Delete Booking Confirmation
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Are you sure you want to permanently delete this reservation? This action cannot be undone.
              </p>
            </div>
            <button
              id="close-delete-modal-btn"
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
            <div className="font-semibold text-slate-900">{booking.name}</div>
            <div className="text-slate-600">
              {booking.vehicle} • {booking.startDate} at {booking.startTime} ({booking.noOfDays} day{booking.noOfDays > 1 ? 's' : ''})
            </div>
            <div className="text-slate-400 font-mono text-[10px]">ID: {booking.id}</div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            id="cancel-delete-btn"
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
          >
            Keep Booking
          </button>
          <button
            id="confirm-delete-btn"
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-md shadow-red-600/20 active:scale-95"
          >
            Delete Booking
          </button>
        </div>
      </div>
    </div>
  );
};
