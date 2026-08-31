import React from 'react';
import { Clock, AlertTriangle, Calendar, Car, ShieldAlert, CheckCircle2, Activity } from 'lucide-react';
import { Booking } from '../types';
import { calculateBookingTime } from '../utils/dateUtils';

interface StatsBarProps {
  bookings: Booking[];
  onFilterOngoing?: () => void;
  onFilterUpcoming?: () => void;
  onFilterCompleted?: () => void;
  activeFilter?: string;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  bookings,
  onFilterOngoing,
  onFilterUpcoming,
  onFilterCompleted,
  activeFilter,
}) => {
  const now = new Date();

  let activeCount = 0;
  let overtimeCount = 0;
  let upcomingCount = 0;
  let completedCount = 0;
  let carsCount = 0;
  let vansCount = 0;

  bookings.forEach((b) => {
    const calc = calculateBookingTime(b, now);
    if (calc.isCompleted) completedCount++;
    else if (calc.isOvertime) overtimeCount++;
    else if (calc.isActive) activeCount++;
    else if (calc.isUpcoming) upcomingCount++;

    if (b.vehicle === 'Car') carsCount++;
    else if (b.vehicle === 'Van') vansCount++;
  });

  const ongoingCount = activeCount + overtimeCount;

  return (
    <div id="stats-bar" className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-4 sm:mb-6">
      {/* 1. Combined Ongoing Panel (Active on road + Overtime) */}
      <button
        id="stat-card-ongoing"
        type="button"
        onClick={onFilterOngoing}
        className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
          overtimeCount > 0
            ? 'bg-gradient-to-br from-amber-50/80 via-white to-red-50/90 border-red-300 hover:border-red-400 text-slate-900 shadow-xs ring-1 ring-red-400/30'
            : activeCount > 0
            ? 'bg-blue-50/70 border-blue-200 hover:bg-blue-100/60 text-slate-900 shadow-xs'
            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-900 shadow-xs'
        } ${activeFilter === 'ongoing' || activeFilter === 'active' || activeFilter === 'overtime' ? 'ring-2 ring-blue-600' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Ongoing
            </span>
            {overtimeCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
            )}
          </div>
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              overtimeCount > 0
                ? 'bg-red-600 text-white animate-pulse shadow-sm shadow-red-300'
                : activeCount > 0
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            {overtimeCount > 0 ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <Activity className="w-4 h-4" />
            )}
          </div>
        </div>

        <div className="mt-2 space-y-1.5">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-bold font-mono ${
                overtimeCount > 0 ? 'text-red-700' : 'text-slate-900'
              }`}
            >
              {ongoingCount}
            </span>
            <span className="text-xs text-slate-500 font-medium truncate">
              {ongoingCount === 1 ? 'rental in progress' : 'rentals in progress'}
            </span>
          </div>

          {/* Triggered sub-indicators */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {activeCount} Active on road
            </span>
            {overtimeCount > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-300 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                {overtimeCount} Overtime
              </span>
            )}
          </div>
        </div>
      </button>

      {/* 2. Upcoming Bookings Card */}
      <button
        id="stat-card-upcoming"
        type="button"
        onClick={onFilterUpcoming}
        className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all flex flex-col justify-between bg-white border-slate-200 hover:bg-slate-50 text-slate-900 shadow-xs cursor-pointer ${
          activeFilter === 'upcoming' ? 'ring-2 ring-blue-600' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Upcoming
          </span>
          <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-2 space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
              {upcomingCount}
            </span>
            <span className="text-xs text-slate-500 font-medium truncate">
              scheduled trips
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block font-medium">
            Pending departure dispatch
          </span>
        </div>
      </button>

      {/* 3. Completed Turnovers Card */}
      <button
        id="stat-card-completed"
        type="button"
        onClick={onFilterCompleted}
        className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all flex flex-col justify-between bg-white border-slate-200 hover:bg-slate-50 text-slate-900 shadow-xs cursor-pointer ${
          activeFilter === 'completed' ? 'ring-2 ring-emerald-600' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Completed
          </span>
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-2 space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-700">
              {completedCount}
            </span>
            <span className="text-xs text-slate-500 font-medium truncate">
              turnovers finalized
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block font-medium">
            Successfully returned vehicles
          </span>
        </div>
      </button>

      {/* 4. Fleet Schedule Distribution Card */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Fleet Schedule
          </span>
          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <Car className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
              {bookings.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">total</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
            <span>{carsCount} Car</span>
            <span className="text-slate-300">•</span>
            <span>{vansCount} Van</span>
          </div>
        </div>
      </div>
    </div>
  );
};

