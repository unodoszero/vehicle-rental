import React, { useState, useEffect } from 'react';
import { 
  Car, Plus, RotateCcw, ExternalLink, Sparkles, Clock, 
  Calendar, ShieldAlert, ChevronDown
} from 'lucide-react';
import { Booking } from '../types';
import { calculateBookingTime, formatTimeOnly } from '../utils/dateUtils';

interface NavbarProps {
  onOpenAddModal: () => void;
  onResetSeedData: () => void;
  bookings: Booking[];
  onOpenTracker: (bookingId: string) => void;
  isPublicTrackerView: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAddModal,
  onResetSeedData,
  bookings,
  onOpenTracker,
  isPublicTrackerView,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTrackerDropdownOpen, setIsTrackerDropdownOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(currentTime);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Operational Title */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-600/30">
                <Car className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 block leading-tight">
                  Miranda Rentals and Services
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Admin
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Operations & Scheduler</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Navigation & Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Clock Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono text-slate-700">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{formattedDate}</span>
              <span className="text-slate-300">•</span>
              <span className="font-bold text-slate-900">{formatTimeOnly(currentTime)}</span>
            </div>

            {/* Public Tracker Quick Preview Dropdown */}
            <div className="relative">
              <button
                id="tracker-preview-dropdown-btn"
                type="button"
                onClick={() => setIsTrackerDropdownOpen(!isTrackerDropdownOpen)}
                className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-lg transition-all flex items-center gap-1.5"
                title="Preview public renter trackers"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Renter Trackers</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isTrackerDropdownOpen && (
                <div
                  id="tracker-dropdown-menu"
                  className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-fade-in"
                >
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Live Renter Portals
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 py-1">
                    {bookings.length === 0 ? (
                      <div className="py-6 px-4 text-center text-xs text-slate-400">
                        No active bookings in schedule
                      </div>
                    ) : (
                      bookings.map((b) => {
                        const calc = calculateBookingTime(b, currentTime);
                        return (
                          <button
                            key={b.id}
                            onClick={() => {
                              onOpenTracker(b.id);
                              setIsTrackerDropdownOpen(false);
                            }}
                            className="w-full text-left p-2.5 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-bold text-slate-900 block truncate">{b.name}</span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                {b.vehicle} • {b.id}
                              </span>
                            </div>
                            {calc.isOvertime ? (
                              <span className="shrink-0 px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">
                                Overtime
                              </span>
                            ) : calc.isActive ? (
                              <span className="shrink-0 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                                Active
                              </span>
                            ) : (
                              <span className="shrink-0 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                                Upcoming
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Clear All Bookings Button */}
            <button
              id="reset-sample-data-btn"
              type="button"
              onClick={onResetSeedData}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
              title="Clear all bookings from schedule"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Operations User Avatar Badge */}
            <div className="hidden sm:flex items-center space-x-2 pl-3 border-l border-slate-200">
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-900">Angelo Miranda</p>
                <p className="text-[10px] text-slate-500">Admin • Operations</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center justify-center text-xs font-bold shadow-xs">
                AM
              </div>
            </div>

            {/* Primary Action: Add Booking */}
            <button
              id="navbar-add-booking-btn"
              type="button"
              onClick={onOpenAddModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create Booking</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
