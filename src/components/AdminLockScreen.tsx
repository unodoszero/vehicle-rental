import React, { useState, useEffect, useRef } from 'react';
import { 
  KeyRound, ShieldCheck, Car, Search, 
  AlertCircle, Loader2
} from 'lucide-react';
import { verifyAdminPinAsync } from '../utils/storage';
import { Booking } from '../types';

interface AdminLockScreenProps {
  onUnlock: () => void;
  onLookupTracker: (identifier: string) => void;
  onNavigateHome?: () => void;
  onNavigateTracker?: () => void;
  bookings?: Booking[];
}

export const AdminLockScreen: React.FC<AdminLockScreenProps> = ({
  onUnlock,
  onLookupTracker,
  onNavigateHome,
  onNavigateTracker,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    pinInputRef.current?.focus();
  }, []);

  const performVerification = async (pinToVerify: string) => {
    if (isVerifying) return;
    setIsVerifying(true);
    setError('');

    try {
      const isValid = await verifyAdminPinAsync(pinToVerify);
      if (isValid) {
        onUnlock();
      } else {
        setError('Incorrect Admin PIN. Access Denied.');
        triggerShake();
        setPin('');
      }
    } catch {
      setError('Verification service unavailable');
      triggerShake();
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    if (!pin.trim()) {
      setError('Please enter your 4-digit Admin PIN');
      triggerShake();
      return;
    }

    performVerification(pin);
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleKeypadPress = (digit: string) => {
    if (isVerifying) return;
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError('');
      if (nextPin.length === 4) {
        // Auto-verify on 4 digits
        performVerification(nextPin);
      }
    }
  };

  const handleKeypadBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleGoTracker = () => {
    if (onNavigateTracker) {
      onNavigateTracker();
    } else {
      onLookupTracker('');
    }
  };

  return (
    <div
      id="admin-lock-screen"
      className="min-h-screen bg-slate-950 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-hidden font-sans text-slate-100"
    >
      {/* Ambient background glows */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 right-10 w-[400px] h-[400px] bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <header className="px-4 sm:px-8 py-3.5 border-b border-slate-900/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Brand - Just Miranda Rentals & Services */}
          <div 
            onClick={onNavigateHome}
            className={`flex items-center gap-2.5 min-w-0 ${onNavigateHome ? 'cursor-pointer' : ''}`}
            title={onNavigateHome ? 'Return to Home' : undefined}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-700 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-blue-600/25 shrink-0">
              <Car className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-white tracking-tight leading-tight truncate">
              Miranda Rentals & Services
            </span>
          </div>

          {/* Navigation Buttons: Tracker */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="header-tracker-view-btn"
              type="button"
              onClick={handleGoTracker}
              className="px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              title="Tracker Lookup"
            >
              <Search className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Tracker</span>
            </button>

            <div className="hidden md:flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Secure Access</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container - Dedicated PIN Passkey Verification */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 my-4">
        <div
          className={`w-full max-w-md bg-slate-900/90 border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl transition-transform ${
            isShaking ? 'animate-bounce' : ''
          }`}
        >
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
                  if (val.length === 4) {
                    performVerification(val);
                  }
                }}
                className="sr-only"
                autoFocus
              />

              {/* On-screen Numeric Keypad */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleKeypadPress(digit)}
                    className="py-3 bg-slate-950/60 hover:bg-slate-800 active:bg-blue-600/30 border border-slate-800/80 hover:border-slate-700 rounded-xl text-lg font-bold font-mono text-slate-200 hover:text-white transition-all active:scale-95 shadow-sm cursor-pointer"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPin('')}
                  className="py-3 bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all active:scale-95 cursor-pointer"
                >
                  Clear
                </button>
                <button
                  key="0"
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="py-3 bg-slate-950/60 hover:bg-slate-800 active:bg-blue-600/30 border border-slate-800/80 hover:border-slate-700 rounded-xl text-lg font-bold font-mono text-slate-200 hover:text-white transition-all active:scale-95 shadow-sm cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleKeypadBackspace}
                  className="py-3 bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all active:scale-95 cursor-pointer"
                >
                  Delete
                </button>
              </div>

              {/* Access Denied Notification (placed below Clear, 0, Delete) */}
              {error && (
                <div className="p-3 bg-red-950/70 border border-red-800/90 rounded-xl flex items-center justify-center gap-2 text-xs text-red-200 animate-fade-in shadow-sm">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="font-medium text-center">{error}</span>
                </div>
              )}

              <button
                id="admin-unlock-submit-btn"
                type="submit"
                disabled={isVerifying}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/60 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-blue-600/25 active:scale-98 flex items-center justify-center gap-2 mt-3 cursor-pointer disabled:cursor-not-allowed"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Verifying Passcode...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Unlock Admin Dashboard</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-600 border-t border-slate-900 bg-slate-950/80">
        <div className="max-w-4xl mx-auto px-4">
          <span>Miranda Rentals & Services • Protected Fleet Portal</span>
        </div>
      </footer>
    </div>
  );
};
