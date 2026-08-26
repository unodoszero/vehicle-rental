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
    <div id="stats-bar" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {/* Overtime Alert Card */}
      <button
        id="stat-card-overtime"
        type="button"
        onClick={onFilterOvertime}
        className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
          overtimeCount > 0
            ? 'bg-red-50/90 border-red-200 hover:bg-red-100/80 text-red-950 shadow-sm'
            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-900 shadow-sm'
        } ${activeFilter === 'overtime' ? 'ring-2 ring-red-500' : ''}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Overtime Alert
          </span>
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              overtimeCount > 0
                ? 'bg-red-600 text-white animate-pulse shadow-sm shadow-red-300'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span
            className={`text-2xl sm:text-3xl font-bold font-mono ${
              overtimeCount > 0 ? 'text-red-600' : 'text-slate-700'
            }`}
          >
            {overtimeCount}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            {overtimeCount === 1 ? 'vehicle delayed' : 'vehicles delayed'}
          </span>
        </div>
      </button>

      {/* Active Rentals Card */}
      <button
        id="stat-card-active"
        type="button"
        onClick={onFilterActive}
        className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
          activeCount > 0
            ? 'bg-emerald-50/90 border-emerald-200 hover:bg-emerald-100/80 text-emerald-950 shadow-sm'
            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-900 shadow-sm'
        } ${activeFilter === 'active' ? 'ring-2 ring-emerald-600' : ''}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Active on Road
          </span>
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
            {activeCount}
          </span>
          <span className="text-xs text-slate-500 font-medium">currently rented</span>
        </div>
      </button>

      {/* Upcoming Bookings Card */}
      <button
        id="stat-card-upcoming"
        type="button"
        onClick={onFilterUpcoming}
        className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between bg-white border-slate-200 hover:bg-slate-50 text-slate-900 shadow-sm ${
          activeFilter === 'upcoming' ? 'ring-2 ring-blue-600' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Upcoming Bookings
          </span>
          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
            {upcomingCount}
          </span>
          <span className="text-xs text-slate-500 font-medium">scheduled</span>
        </div>
      </button>

      {/* Fleet Distribution Card */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Fleet Schedule Total
          </span>
          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <Car className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div>
            <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
              {bookings.length}
            </span>
            <span className="text-xs text-slate-500 font-medium ml-1.5">total</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
            <span>{carsCount} Car</span>
            <span className="text-slate-300">•</span>
            <span>{vansCount} Van</span>
          </div>
        </div>
      </div>
    </div>
  );
};
