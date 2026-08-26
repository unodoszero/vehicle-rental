import React, { useState, useEffect, useRef } from 'react';
import { 
  Car, Plus, RotateCcw, Sparkles, Clock, 
  Search, ShieldAlert, ChevronDown, Cloud, CloudOff, Download, Upload, Database,
  Lock, KeyRound
} from 'lucide-react';
import { Booking } from '../types';
import { calculateBookingTime, formatTimeOnly } from '../utils/dateUtils';
import { exportBookingsToJSON, importBookingsToFirestore } from '../utils/firebaseBookings';

interface NavbarProps {
  onOpenAddModal: () => void;
  onResetSeedData: () => void;
  bookings: Booking[];
  onOpenTracker: (bookingId: string) => void;
  onOpenPublicCalendar?: () => void;
  isPublicTrackerView: boolean;
  isOnline?: boolean;
  isSyncing?: boolean;
  onLockAdmin?: () => void;
  onOpenChangePin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAddModal,
  onResetSeedData,
  bookings,
  onOpenTracker,
  onOpenPublicCalendar,
  isPublicTrackerView,
  isOnline = true,
  isSyncing = false,
  onLockAdmin,
  onOpenChangePin,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTrackerDropdownOpen, setIsTrackerDropdownOpen] = useState(false);
  const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleExportBackup = () => {
    exportBookingsToJSON(bookings);
    setIsDataMenuOpen(false);
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      if (Array.isArray(imported)) {
        await importBookingsToFirestore(imported);
        alert(`Successfully imported ${imported.length} bookings to your cloud database!`);
      } else {
        alert('Invalid file format. Please upload a valid JSON backup.');
      }
    } catch (err) {
      console.error('Failed to import JSON backup', err);
      alert('Error parsing backup file.');
    }
    setIsDataMenuOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(currentTime);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      {/* Hidden file input for backup imports */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Backdrop overlay for mobile dropdowns */}
      {(isTrackerDropdownOpen || isDataMenuOpen) && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-xs sm:bg-transparent sm:backdrop-blur-none"
          onClick={() => {
            setIsTrackerDropdownOpen(false);
            setIsDataMenuOpen(false);
          }}
        />
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Brand & Operational Title */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-600/30 shrink-0">
              <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-base font-bold tracking-tight text-slate-900 block leading-tight truncate">
                Miranda Rentals & Services
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="px-1 sm:px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Admin
                </span>
                <div className="flex items-center gap-1">
                  {isOnline ? (
                    <span className="inline-flex items-center gap-1 px-1 sm:px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200" title="Connected to Firebase Firestore with offline cache">
                      <Cloud className="w-2.5 h-2.5 text-emerald-600" />
                      <span className="hidden xs:inline">Cloud Synced</span>
                      <span className="xs:hidden">Synced</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1 sm:px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200" title="Offline Mode Active: Changes are saved to your device cache and will sync once reconnected">
                      <CloudOff className="w-2.5 h-2.5 text-amber-600" />
                      <span>Offline</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Navigation & Quick Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Live Clock Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono text-slate-700">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{formattedDate}</span>
              <span className="text-slate-300">•</span>
              <span className="font-bold text-slate-900">{formatTimeOnly(currentTime)}</span>
            </div>

            {/* Tracker Dropdown Trigger Button - Search icon on mobile */}
            <div className="relative">
              <button
                id="tracker-preview-dropdown-btn"
                type="button"
                onClick={() => {
                  setIsTrackerDropdownOpen(!isTrackerDropdownOpen);
                  setIsDataMenuOpen(false);
                }}
                className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-lg transition-all flex items-center gap-1 active:scale-95"
                title="Renter Trackers"
              >
                <Search className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span className="hidden sm:inline">Tracker</span>
                <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:inline" />
              </button>

              {isTrackerDropdownOpen && (
                <div
                  id="tracker-dropdown-menu"
                  className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72 bg-white rounded-2xl sm:rounded-xl shadow-2xl sm:shadow-xl border border-slate-200 p-2 z-50 animate-fade-in"
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

            {/* Data & Backup Dropdown Menu */}
            <div className="relative">
              <button
                id="data-backup-menu-btn"
                type="button"
                onClick={() => {
                  setIsDataMenuOpen(!isDataMenuOpen);
                  setIsTrackerDropdownOpen(false);
                }}
                className="p-2 sm:px-2.5 sm:py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-lg transition-all flex items-center gap-1"
                title="Backup and Database Options"
              >
                <Database className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden lg:inline">Backup</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isDataMenuOpen && (
                <div
                  id="data-dropdown-menu"
                  className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-64 bg-white rounded-2xl sm:rounded-xl shadow-2xl sm:shadow-xl border border-slate-200 p-2 z-50 animate-fade-in text-xs"
                >
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Database & iCloud Backup
                  </div>
                  <div className="py-1 space-y-0.5">
                    <button
                      onClick={handleExportBackup}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-slate-700 hover:text-slate-900"
                    >
                      <Download className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <span className="font-semibold block">Export Backup (.json)</span>
                        <span className="text-[10px] text-slate-400">Save copy to Mac, iPhone, or iCloud</span>
                      </div>
                    </button>

                    <button
                      onClick={handleImportClick}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-slate-700 hover:text-slate-900"
                    >
                      <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-semibold block">Import Backup (.json)</span>
                        <span className="text-[10px] text-slate-400">Restore file from Mac or iCloud</span>
                      </div>
                    </button>

                    {onOpenChangePin && (
                      <button
                        onClick={() => {
                          setIsDataMenuOpen(false);
                          onOpenChangePin();
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-slate-700 hover:text-slate-900"
                      >
                        <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <span className="font-semibold block">Change Admin PIN</span>
                          <span className="text-[10px] text-slate-400">Update 4-digit access code</span>
                        </div>
                      </button>
                    )}

                    <div className="pt-1 mt-1 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setIsDataMenuOpen(false);
                          onResetSeedData();
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors flex items-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4 text-red-500 shrink-0" />
                        <div>
                          <span className="font-semibold block">Clear Schedule</span>
                          <span className="text-[10px] text-red-400">Remove all current bookings</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Lock Session Button */}
            {onLockAdmin && (
              <button
                id="navbar-lock-session-btn"
                type="button"
                onClick={onLockAdmin}
                className="p-2 sm:px-2.5 sm:py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-lg transition-all flex items-center gap-1"
                title="Lock admin session"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden xl:inline">Lock</span>
              </button>
            )}

            {/* Primary Action: Add Booking */}
            <button
              id="navbar-add-booking-btn"
              type="button"
              onClick={onOpenAddModal}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-blue-600/20 flex items-center gap-1 active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">New Booking</span>
              <span className="xs:hidden">New</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
