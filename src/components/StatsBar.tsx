import React from 'react';
import { Clock, AlertTriangle, Calendar, Car, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Booking } from '../types';
import { calculateBookingTime } from '../utils/dateUtils';

interface StatsBarProps {
  bookings: Booking[];
  onFilterOvertime?: () => void;
  onFilterActive?: () => void;
  onFilterUpcoming?: () => void;
  activeFilter?: string;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  bookings,
  onFilterOvertime,
  onFilterActive,
  onFilterUpcoming,
  activeFilter,
}) => {
  const now = new Date();

  let activeCount = 0;
  let overtimeCount = 0;
  let upcomingCount = 0;
  let carsCount = 0;
  let vansCount = 0;

  bookings.forEach((b) => {
    const calc = calculateBookingTime(b, now);
    if (calc.isOvertime) overtimeCount++;
    else if (calc.isActive) activeCount++;
    else if (calc.isUpcoming) upcomingCount++;

    if (b.vehicle === 'Car') carsCount++;
    else if (b.vehicle === 'Van') vansCount++;
  });

  return (
    <div id="stats-bar" className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
      {/* Overtime Alert Card */}
      <button
        id="stat-card-overtime"
        type="button"
        onClick={onFilterOvertime}
        className={`p-3 sm:p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
          overtimeCount > 0
            ? 'bg-red-50/90 border-red-200 hover:bg-red-100/80 text-red-950 shadow-xs'
            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-900 shadow-xs'
        } ${activeFilter === 'overtime' ? 'ring-2 ring-red-500' : ''}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Overtime Alert
          </span>
          <div
            className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center ${
              overtimeCount > 0
                ? 'bg-red-600 text-white animate-pulse shadow-sm shadow-red-300'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>

        <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
          <span
            className={`text-xl sm:text-3xl font-bold font-mono ${
              overtimeCount > 0 ? 'text-red-600' : 'text-slate-700'
            }`}
          >
            {overtimeCount}
          </span>
          <span className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
            {overtimeCount === 1 ? 'vehicle delayed' : 'delayed'}
          </span>
        </div>
      </button>

      {/* Active Rentals Card */}
      <button
        id="stat-card-active"
        type="button"
        onClick={onFilterActive}
        className={`p-3 sm:p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
          activeCount > 0
            ? 'bg-emerald-50/90 border-emerald-200 hover:bg-emerald-100/80 text-emerald-950 shadow-xs'
            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-900 shadow-xs'
        } ${activeFilter === 'active' ? 'ring-2 ring-emerald-600' : ''}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Active on Road
          </span>
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>

        <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
          <span className="text-xl sm:text-3xl font-bold font-mono text-slate-900">
            {activeCount}
          </span>
          <span className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
            rented
          </span>
        </div>
      </button>

      {/* Upcoming Bookings Card */}
      <button
        id="stat-card-upcoming"
        type="button"
        onClick={onFilterUpcoming}
        className={`p-3 sm:p-4 rounded-xl border text-left transition-all flex flex-col justify-between bg-white border-slate-200 hover:bg-slate-50 text-slate-900 shadow-xs ${
          activeFilter === 'upcoming' ? 'ring-2 ring-blue-600' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Upcoming
          </span>
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>

        <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
          <span className="text-xl sm:text-3xl font-bold font-mono text-slate-900">
            {upcomingCount}
          </span>
          <span className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
            scheduled
          </span>
        </div>
      </button>

      {/* Fleet Distribution Card */}
      <div className="p-3 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Fleet Schedule
          </span>
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>

        <div className="mt-2 sm:mt-3 flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-3xl font-bold font-mono text-slate-900">
              {bookings.length}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium">total</span>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-semibold text-slate-600 bg-slate-50 px-1.5 sm:px-2 py-0.5 rounded border border-slate-200">
            <span>{carsCount} Car</span>
            <span className="text-slate-300">•</span>
            <span>{vansCount} Van</span>
          </div>
        </div>
      </div>
    </div>
  );
};
