import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, KeyRound, ShieldCheck, Car, Search, ArrowRight, 
  AlertCircle, Sparkles, MessageCircle, ExternalLink, HelpCircle
} from 'lucide-react';
import { verifyAdminPin, getAdminPin, DEFAULT_ADMIN_PIN } from '../utils/storage';

interface AdminLockScreenProps {
  onUnlock: () => void;
  onLookupTracker: (identifier: string) => void;
}

export const AdminLockScreen: React.FC<AdminLockScreenProps> = ({
  onUnlock,
  onLookupTracker,
}) => {
  const [activeTab, setActiveTab] = useState<'admin' | 'tracker'>('admin');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [trackerInput, setTrackerInput] = useState('');
  const [trackerError, setTrackerError] = useState('');
  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'admin') {
      pinInputRef.current?.focus();
    }
  }, [activeTab]);

  const handlePinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    if (!pin.trim()) {
      setError('Please enter your 4-digit Admin PIN');
      triggerShake();
      return;
    }

    if (verifyAdminPin(pin)) {
      onUnlock();
    } else {
      setError('Incorrect Admin PIN. Please try again.');
      triggerShake();
      setPin('');
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleKeypadPress = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError('');
      if (nextPin.length === 4) {
        // Auto-check on 4 digits
        if (verifyAdminPin(nextPin)) {
          setTimeout(() => onUnlock(), 150);
        }
      }
    }
  };

  const handleKeypadBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleTrackerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTrackerError('');
    const clean = trackerInput.trim();
    if (!clean) {
      setTrackerError('Please enter your Booking ID or Tracking Reference');
      return;
    }
    onLookupTracker(clean);
  };

  const isDefaultPin = getAdminPin() === DEFAULT_ADMIN_PIN;

  return (
    <div
      id="admin-lock-screen"
      className="min-h-screen bg-slate-950 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-hidden font-sans text-slate-100"
    >
      {/* Ambient background glows */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 right-10 w-[400px] h-[400px] bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <header className="px-4 sm:px-8 py-4 border-b border-slate-900/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-700 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-blue-600/25">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block leading-tight">
                Miranda Rentals & Services
              </span>
              <span className="text-xs sm:text-sm font-bold text-white tracking-tight leading-tight block">
                Fleet Management & Operations
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Secure Access</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 my-4">
        <div
          className={`w-full max-w-md bg-slate-900/90 border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl transition-transform ${
            isShaking ? 'animate-bounce' : ''
          }`}
        >
          {/* Navigation Tabs (Admin Gate vs Customer Tracker Lookup) */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-950/80 border-b border-slate-800 text-xs font-bold">
            <button
              id="admin-auth-tab-btn"
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setError('');
              }}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Admin Passkey</span>
            </button>

            <button
              id="renter-lookup-tab-btn"
              type="button"
              onClick={() => {
                setActiveTab('tracker');
                setTrackerError('');
              }}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'tracker'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Renter Tracker</span>
            </button>
          </div>

          {/* TAB 1: ADMIN PASSKEY UNLOCK */}
          {activeTab === 'admin' && (
            <div className="p-6 sm:p-7 space-y-5">
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Manager Security Verification
                </h2>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Enter your Administrator PIN to view fleet schedules, customer data, and booking records.
                </p>
              </div>

              {/* PIN Visual Digits Display */}
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div className="flex justify-center items-center gap-3 my-2">
                  {[0, 1, 2, 3].map((idx) => {
                    const filled = pin.length > idx;
                    return (
                      <div
                        key={idx}
                        className={`w-12 h-14 sm:w-14 sm:h-16 rounded-xl border flex items-center justify-center font-mono text-2xl font-bold transition-all ${
                          filled
                            ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-md shadow-blue-600/20 scale-105'
                            : 'bg-slate-950/80 border-slate-800 text-slate-600'
                        }`}
                      >
                        {filled ? '•' : ''}
                      </div>
                    );
                  })}
                </div>

                {/* Hidden input for physical keyboard entry */}
                <input
                  ref={pinInputRef}
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPin(val);
                    setError('');
                    if (val.length === 4 && verifyAdminPin(val)) {
                      setTimeout(() => onUnlock(), 100);
                    }
                  }}
                  className="sr-only"
                  autoFocus
                />

                {error && (
                  <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl flex items-center gap-2 text-xs text-red-200 animate-fade-in">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* On-screen Numeric Keypad */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleKeypadPress(digit)}
                      className="py-3 bg-slate-950/60 hover:bg-slate-800 active:bg-blue-600/30 border border-slate-800/80 hover:border-slate-700 rounded-xl text-lg font-bold font-mono text-slate-200 hover:text-white transition-all active:scale-95 shadow-sm"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPin('')}
                    className="py-3 bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all active:scale-95"
                  >
                    Clear
                  </button>
                  <button
                    key="0"
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="py-3 bg-slate-950/60 hover:bg-slate-800 active:bg-blue-600/30 border border-slate-800/80 hover:border-slate-700 rounded-xl text-lg font-bold font-mono text-slate-200 hover:text-white transition-all active:scale-95 shadow-sm"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleKeypadBackspace}
                    className="py-3 bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all active:scale-95"
                  >
                    Delete
                  </button>
                </div>

                <button
                  id="admin-unlock-submit-btn"
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-blue-600/25 active:scale-98 flex items-center justify-center gap-2 mt-3"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Unlock Admin Dashboard</span>
                </button>
              </form>

              {/* Default PIN Helper Note */}
              {isDefaultPin && (
                <div className="p-3 bg-blue-950/40 border border-blue-900/50 rounded-xl text-[11px] text-blue-300 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-blue-200">Default Access PIN: 1234</span>
                    <span>You can change this PIN anytime in the Admin Data & Backup menu.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RENTER LIVE TRACKER LOOKUP */}
          {activeTab === 'tracker' && (
            <div className="p-6 sm:p-7 space-y-5">
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 rounded-2xl bg-sky-600/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto mb-2">
                  <Search className="w-6 h-6" />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Track Your Rental
                </h2>
                <div className="text-xs text-slate-300 max-w-sm mx-auto space-y-1.5 leading-relaxed">
                  <p>
                    Looking for your vehicle status or live return countdown? Enter your booking reference number below.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">Note:</span> Your booking reference is provided by the Admin. If you haven't received yours yet, please contact our support team below. Thank you!
                  </p>
                </div>
              </div>

              <form onSubmit={handleTrackerSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Booking ID or Tracking Code
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      id="tracker-lookup-input"
                      type="text"
                      value={trackerInput}
                      onChange={(e) => {
                        setTrackerInput(e.target.value);
                        setTrackerError('');
                      }}
                      placeholder="e.g. BK-0001 or trk_..."
                      className="w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                    />
                  </div>
                  {trackerError && (
                    <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {trackerError}
                    </p>
                  )}
                </div>

                <button
                  id="submit-renter-lookup-btn"
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-blue-600/25 active:scale-98 flex items-center justify-center gap-2"
                >
                  <span>Open Live Rental Tracker</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Direct Support Assistance */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="text-[11px] text-slate-400 font-medium block text-center">
                  Don't have your tracking link? Reach Miranda Rentals:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href="https://m.me/1193134077224088"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
                    <span>Messenger</span>
                  </a>
                  <a
                    href="https://www.facebook.com/share/1HMfSvhijx/?mibextid=wwXIfr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                    <span>Facebook</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-600 border-t border-slate-900 bg-slate-950/80">
        <div className="max-w-4xl mx-auto px-4">
          <span>Miranda Rentals and Services • Protected Fleet Portal</span>
        </div>
      </footer>
    </div>
  );
};
