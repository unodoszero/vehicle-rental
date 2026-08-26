import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Car, Clock, AlertTriangle, Plus, Filter, LayoutGrid, List, Search, Sparkles,
  MapPin, Users
} from 'lucide-react';
import { Booking, VehicleType } from '../types';
import { 
  getMonthCalendarGrid, isBookingOnDay, calculateBookingTime, 
  toISODateString, formatDateTime, getBookingStartDateTime, getBookingEndDateTime 
} from '../utils/dateUtils';

interface CalendarViewProps {
  bookings: Booking[];
  onSelectBooking: (booking: Booking) => void;
  onAddBookingForDate: (dateString: string) => void;
  vehicleFilter: 'all' | VehicleType;
  statusFilter: 'all' | 'active' | 'upcoming' | 'overtime';
  onVehicleFilterChange: (filter: 'all' | VehicleType) => void;
  onStatusFilterChange: (filter: 'all' | 'active' | 'upcoming' | 'overtime') => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarView: React.FC<CalendarViewProps> = ({
  bookings,
  onSelectBooking,
  onAddBookingForDate,
  vehicleFilter,
  statusFilter,
  onVehicleFilterChange,
  onStatusFilterChange,
}) => {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [searchQuery, setSearchQuery] = useState('');

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Filter bookings based on vehicle, status, and search query
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Vehicle filter
      if (vehicleFilter !== 'all' && b.vehicle !== vehicleFilter) {
        return false;
      }

      // Status filter
      const calc = calculateBookingTime(b, now);
      if (statusFilter === 'active' && !calc.isActive) return false;
      if (statusFilter === 'upcoming' && !calc.isUpcoming) return false;
      if (statusFilter === 'overtime' && !calc.isOvertime) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = b.name.toLowerCase().includes(q);
        const matchId = b.id.toLowerCase().includes(q);
        const matchPlate = (b.plateNumber || '').toLowerCase().includes(q);
        const matchLocation = b.startLocation.toLowerCase().includes(q) || b.destination.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchPlate && !matchLocation) return false;
      }

      return true;
    });
  }, [bookings, vehicleFilter, statusFilter, searchQuery]);

  // Calendar days grid
  const calendarDays = useMemo(() => {
    return getMonthCalendarGrid(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Color mapping helper with Geometric Balance left-border accent ribbons
  const getBadgeStyle = (booking: Booking, isOvertime: boolean) => {
    if (isOvertime) {
      return 'bg-red-100 text-red-900 border-red-200 border-l-4 border-l-red-600 shadow-xs animate-pulse';
    }

    switch (booking.colorTag) {
      case 'emerald':
        return 'bg-emerald-100 text-emerald-900 border-emerald-200 border-l-4 border-l-emerald-600 shadow-xs';
      case 'rose':
        return 'bg-rose-100 text-rose-900 border-rose-200 border-l-4 border-l-rose-600 shadow-xs';
      case 'amber':
        return 'bg-amber-100 text-amber-950 border-amber-200 border-l-4 border-l-amber-500 shadow-xs font-semibold';
      case 'sky':
        return 'bg-sky-100 text-sky-950 border-sky-200 border-l-4 border-l-sky-500 shadow-xs font-semibold';
      case 'violet':
        return 'bg-purple-100 text-purple-950 border-purple-200 border-l-4 border-l-purple-600 shadow-xs';
      case 'teal':
        return 'bg-teal-100 text-teal-950 border-teal-200 border-l-4 border-l-teal-600 shadow-xs';
      case 'indigo':
      default:
        return 'bg-blue-100 text-blue-900 border-blue-200 border-l-4 border-l-blue-600 shadow-xs';
    }
  };

  return (
    <div id="calendar-dashboard-section" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Calendar Controls & Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Month Navigation & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              id="prev-month-btn"
              onClick={handlePrevMonth}
              className="p-1.5 rounded hover:bg-white hover:shadow-xs text-slate-700 hover:text-slate-900 transition-all"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              id="today-btn"
              onClick={handleGoToToday}
              className="px-3 py-1 text-xs font-bold text-slate-800 hover:bg-white hover:shadow-xs rounded transition-all"
            >
              Today
            </button>
            <button
              id="next-month-btn"
              onClick={handleNextMonth}
              className="p-1.5 rounded hover:bg-white hover:shadow-xs text-slate-700 hover:text-slate-900 transition-all"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h2 id="calendar-current-month" className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
            <p className="text-[11px] text-slate-500 italic hidden sm:block">
              Manage your fleet scheduling & active rentals.
            </p>
          </div>
        </div>

        {/* Filters, Search & View Toggles */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              id="booking-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bookings..."
              className="w-full pl-8 pr-3 py-1.5 text-base sm:text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Vehicle Category Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              id="filter-vehicle-all"
              onClick={() => onVehicleFilterChange('all')}
              className={`px-2.5 py-1 rounded transition-all ${
                vehicleFilter === 'all' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All
            </button>
            <button
              id="filter-vehicle-cars"
              onClick={() => onVehicleFilterChange('Car')}
              className={`px-2.5 py-1 rounded transition-all ${
                vehicleFilter === 'Car' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Car
            </button>
            <button
              id="filter-vehicle-vans"
              onClick={() => onVehicleFilterChange('Van')}
              className={`px-2.5 py-1 rounded transition-all ${
                vehicleFilter === 'Van' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Van
            </button>
          </div>

          {/* Status Filter */}
          <select
            id="status-filter-select"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as any)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-100 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="overtime">Overtime Alerts</option>
            <option value="active">Active on Road</option>
            <option value="upcoming">Upcoming</option>
          </select>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              id="viewmode-month-btn"
              onClick={() => setViewMode('month')}
              className={`p-1.5 rounded transition-all ${
                viewMode === 'month' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Month Grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              id="viewmode-list-btn"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-all ${
                viewMode === 'list' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main View: Month Grid or List */}
      {viewMode === 'month' ? (
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            {/* Weekday Column Headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center font-bold text-[10px] uppercase tracking-widest text-slate-400">
              {WEEKDAY_NAMES.map((w, idx) => (
                <div
                  key={w}
                  className={`py-3 border-r border-slate-100 ${
                    idx === 6 ? 'border-r-0' : ''
                  } ${idx === 0 || idx === 6 ? 'text-slate-400 bg-slate-50/80' : 'text-slate-500'}`}
                >
                  {w}
                </div>
              ))}
            </div>

            {/* 7-column Calendar Grid */}
            <div className="grid grid-cols-7 bg-slate-100 gap-[1px]">
              {calendarDays.map((dayInfo) => {
                // Find all bookings overlapping this specific day
                const dayBookings = filteredBookings.filter((b) =>
                  isBookingOnDay(b, dayInfo.dateString)
                );

                return (
                  <div
                    key={dayInfo.dateString}
                    id={`cal-day-${dayInfo.dateString}`}
                    onClick={() => {
                      if (dayBookings.length === 0) {
                        onAddBookingForDate(dayInfo.dateString);
                      }
                    }}
                    className={`min-h-[118px] p-2 bg-white flex flex-col justify-between transition-colors relative group ${
                      !dayInfo.isCurrentMonth
                        ? 'bg-slate-50/60 text-slate-300'
                        : 'text-slate-900'
                    } ${dayInfo.isToday ? 'bg-blue-50/30' : ''}`}
                  >
                    {/* Day Number Header */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-semibold w-6 h-6 rounded flex items-center justify-center ${
                          dayInfo.isToday
                            ? 'bg-blue-600 text-white font-bold shadow-xs'
                            : !dayInfo.isCurrentMonth
                            ? 'text-slate-300'
                            : 'text-slate-700'
                        }`}
                      >
                        {dayInfo.dayOfMonth}
                      </span>

                      {/* Quick Add Button on Hover */}
                      <button
                        id={`quick-add-${dayInfo.dateString}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddBookingForDate(dayInfo.dateString);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                        title={`Add booking on ${dayInfo.dateString}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Bookings Container / Continuous Ribbon Bars */}
                    <div className="space-y-1.5 flex-1 flex flex-col justify-start">
                      {dayBookings.map((b) => {
                        const timeCalc = calculateBookingTime(b, now);
                        const isOvertime = timeCalc.isOvertime;
                        const startDateStr = b.startDate;
                        const endDate = getBookingEndDateTime(b);
                        const endDateStr = toISODateString(endDate);

                        const isStartDay = dayInfo.dateString === startDateStr;
                        const isEndDay = dayInfo.dateString === endDateStr;
                        const isMultiDay = b.noOfDays > 1;

                        const isWeekStart = dayInfo.dayOfWeek === 0;
                        const isWeekEnd = dayInfo.dayOfWeek === 6;

                        let roundedClasses = 'rounded';
                        if (isMultiDay) {
                          if (isStartDay && isEndDay) {
                            roundedClasses = 'rounded';
                          } else if (isStartDay) {
                            roundedClasses = 'rounded-l rounded-r-none';
                          } else if (isEndDay) {
                            roundedClasses = 'rounded-r rounded-l-none';
                          } else if (isWeekStart) {
                            roundedClasses = 'rounded-l-none rounded-r-none';
                          } else if (isWeekEnd) {
                            roundedClasses = 'rounded-r-none rounded-l-none';
                          } else {
                            roundedClasses = 'rounded-none';
                          }
                        }

                        const badgeStyle = getBadgeStyle(b, isOvertime);

                        return (
                          <div
                            key={`${b.id}-${dayInfo.dateString}`}
                            id={`booking-pill-${b.id}-${dayInfo.dateString}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectBooking(b);
                            }}
                            className={`px-2 py-1 text-[10px] font-bold leading-tight cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] border-t border-b border-r ${roundedClasses} ${badgeStyle} flex items-center justify-between gap-1`}
                            title={`${b.name} (${b.vehicle}) - ${b.startDate} to ${formatDateTime(endDate)}`}
                          >
                            <div className="flex items-center gap-1 min-w-0 truncate">
                              {isOvertime ? (
                                <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
                              ) : (
                                <Car className="w-2.5 h-2.5 opacity-70 shrink-0" />
                              )}
                              <span className="truncate">
                                {isOvertime ? `OVERTIME: ${b.name}` : `${b.id}: ${b.name}`}
                              </span>
                            </div>

                            {/* Show time on start day */}
                            {isStartDay && (
                              <span className="text-[9px] font-mono opacity-80 shrink-0 hidden sm:inline">
                                {b.startTime}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* High-Density Operations List View */
        <div className="divide-y divide-slate-100">
          {filteredBookings.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CalendarIcon className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-semibold">No bookings found for selected filter.</p>
            </div>
          ) : (
            filteredBookings.map((b) => {
              const timeCalc = calculateBookingTime(b, now);
              const isOvertime = timeCalc.isOvertime;
              return (
                <div
                  key={b.id}
                  id={`booking-list-row-${b.id}`}
                  onClick={() => onSelectBooking(b)}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                    isOvertime ? 'bg-red-50/60' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-xs ${
                        isOvertime
                          ? 'bg-red-600 text-white animate-pulse'
                          : b.vehicle === 'Car'
                          ? 'bg-blue-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      <Car className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm sm:text-base">
                          {b.name}
                        </span>
                        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {b.id}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          b.vehicle === 'Car' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {b.vehicle}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="flex items-center gap-1.5">
                          <CalendarIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{b.startDate} ({b.startTime}) &rarr; {b.noOfDays} Day{b.noOfDays > 1 ? 's' : ''}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{b.startLocation} &rarr; {b.destination}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{b.passengers} pax</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {isOvertime ? (
                      <span className="px-3 py-1 bg-red-100 text-red-700 border border-red-200 rounded text-xs font-bold flex items-center gap-1.5 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        OVERTIME ({timeCalc.formattedRemaining})
                      </span>
                    ) : timeCalc.isActive ? (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-xs font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Active ({timeCalc.formattedRemaining})
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded text-xs font-semibold border border-slate-200">
                        Upcoming
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
