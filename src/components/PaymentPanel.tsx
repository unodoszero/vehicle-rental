import React, { useState } from 'react';
import { 
  CreditCard, CheckCircle2, Clock, QrCode, Copy, Check, 
  ExternalLink, MessageCircle, AlertCircle, Sparkles, Download, 
  Maximize2, X, ShieldCheck, ArrowRight, Wallet, Receipt
} from 'lucide-react';
import { Booking } from '../types';
import { formatDateOnly, formatTimeOnly, formatDateTime, computeBookingPaymentBreakdown, STANDARD_DEPOSIT_AMOUNT } from '../utils/dateUtils';

interface PaymentPanelProps {
  booking: Booking;
  onUpdatePaymentStatus?: (status: 'pending' | 'paid' | 'partial', details?: Partial<Booking>) => void;
  isAdmin?: boolean;
}

// Official Payment Account Details for Miranda Rentals & Services
export const PAYMENT_ACCOUNT_CONFIG = {
  accountName: 'Miranda Rentals & Services',
  bankName: 'GoTyme Bank (InstaPay / QRPh)',
  acceptedMethods: [
    'GoTyme Bank',
    'GCash',
    'Maya',
    'BDO',
    'BPI',
    'UnionBank',
    'Metrobank',
    'Any Bank / E-Wallet via QRPh'
  ],
  messengerUrl: 'https://m.me/1193134077224088',
  qrAssetUrl: '/miranda-rentals-and-services-payment-qr.png',
};

// SVG GoTyme Bank InstaPay Branded QR Code for Miranda Rentals & Services
export const GoTymePaymentQrSvg: React.FC<{ size?: number; className?: string }> = ({ 
  size = 220, 
  className = '' 
}) => {
  return (
    <div 
      className={`relative flex flex-col items-center justify-center p-3 sm:p-4 bg-gradient-to-b from-[#00E5FF] to-[#00C4DF] rounded-3xl shadow-2xl border-2 border-cyan-300/30 ${className}`}
      style={{ maxWidth: size + 48 }}
    >
      {/* Inner White Card */}
      <div className="w-full bg-white rounded-2xl p-3 sm:p-4 flex flex-col items-center shadow-lg border border-slate-100">
        
        {/* GoTyme Bank Header */}
        <div className="flex items-center justify-center gap-1 mb-1">
          <span className="text-lg sm:text-xl font-black text-[#0C1E3C] tracking-tight flex items-center">
            GO
            <span className="text-cyan-500 font-bold ml-0.5">✦</span>
            <span className="font-normal text-[#0C1E3C] ml-0.5">tyme</span>
          </span>
          <span className="text-[10px] font-bold text-[#0C1E3C] ml-1 uppercase tracking-wider">
            bank
          </span>
        </div>

        {/* Business Title */}
        <div className="text-center mb-2">
          <span className="text-xs sm:text-sm font-black text-slate-900 tracking-widest block font-sans">
            MIRANDA
          </span>
          <span className="text-[9px] font-bold text-slate-500 tracking-wider block -mt-0.5">
            RENTALS + SERVICES
          </span>
          <div className="w-12 h-0.5 bg-amber-400 mx-auto mt-1 rounded-full" />
        </div>

        {/* Main QR Code SVG Matrix with InstaPay Center Emblem */}
        <div className="relative p-1 bg-white rounded-xl">
          <svg
            viewBox="0 0 200 200"
            className="w-full h-auto"
            style={{ width: size - 30, height: size - 30 }}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* White background */}
            <rect width="200" height="200" fill="#FFFFFF" rx="4" />

            {/* Top-Left Position Finder Pattern */}
            <rect x="8" y="8" width="46" height="46" rx="4" fill="#0B132B" />
            <rect x="14" y="14" width="34" height="34" rx="2" fill="#FFFFFF" />
            <rect x="20" y="20" width="22" height="22" rx="2" fill="#0B132B" />

            {/* Top-Right Position Finder Pattern */}
            <rect x="146" y="8" width="46" height="46" rx="4" fill="#0B132B" />
            <rect x="152" y="14" width="34" height="34" rx="2" fill="#FFFFFF" />
            <rect x="158" y="20" width="22" height="22" rx="2" fill="#0B132B" />

            {/* Bottom-Left Position Finder Pattern */}
            <rect x="8" y="146" width="46" height="46" rx="4" fill="#0B132B" />
            <rect x="14" y="152" width="34" height="34" rx="2" fill="#FFFFFF" />
            <rect x="20" y="158" width="22" height="22" rx="2" fill="#0B132B" />

            {/* High Density QR Matrix Pattern */}
            <g fill="#0B132B">
              <rect x="60" y="14" width="6" height="6" rx="1" />
              <rect x="72" y="14" width="6" height="6" rx="1" />
              <rect x="84" y="14" width="6" height="6" rx="1" />
              <rect x="96" y="14" width="6" height="6" rx="1" />
              <rect x="108" y="14" width="6" height="6" rx="1" />
              <rect x="120" y="14" width="6" height="6" rx="1" />
              <rect x="132" y="14" width="6" height="6" rx="1" />

              <rect x="14" y="60" width="6" height="6" rx="1" />
              <rect x="14" y="72" width="6" height="6" rx="1" />
              <rect x="14" y="84" width="6" height="6" rx="1" />
              <rect x="14" y="96" width="6" height="6" rx="1" />
              <rect x="14" y="108" width="6" height="6" rx="1" />
              <rect x="14" y="120" width="6" height="6" rx="1" />
              <rect x="14" y="132" width="6" height="6" rx="1" />

              <rect x="60" y="26" width="6" height="6" rx="1" />
              <rect x="84" y="26" width="6" height="6" rx="1" />
              <rect x="108" y="26" width="6" height="6" rx="1" />
              <rect x="132" y="26" width="6" height="6" rx="1" />

              <rect x="60" y="38" width="6" height="6" rx="1" />
              <rect x="72" y="38" width="6" height="6" rx="1" />
              <rect x="96" y="38" width="6" height="6" rx="1" />
              <rect x="120" y="38" width="6" height="6" rx="1" />

              <rect x="26" y="60" width="6" height="6" rx="1" />
              <rect x="38" y="60" width="6" height="6" rx="1" />
              <rect x="60" y="60" width="6" height="6" rx="1" />
              <rect x="72" y="60" width="6" height="6" rx="1" />
              <rect x="120" y="60" width="6" height="6" rx="1" />
              <rect x="146" y="60" width="6" height="6" rx="1" />
              <rect x="170" y="60" width="6" height="6" rx="1" />
              <rect x="182" y="60" width="6" height="6" rx="1" />

              <rect x="26" y="72" width="6" height="6" rx="1" />
              <rect x="48" y="72" width="6" height="6" rx="1" />
              <rect x="60" y="72" width="6" height="6" rx="1" />
              <rect x="132" y="72" width="6" height="6" rx="1" />
              <rect x="158" y="72" width="6" height="6" rx="1" />
              <rect x="182" y="72" width="6" height="6" rx="1" />

              <rect x="38" y="84" width="6" height="6" rx="1" />
              <rect x="60" y="84" width="6" height="6" rx="1" />
              <rect x="146" y="84" width="6" height="6" rx="1" />
              <rect x="170" y="84" width="6" height="6" rx="1" />

              <rect x="26" y="96" width="6" height="6" rx="1" />
              <rect x="48" y="96" width="6" height="6" rx="1" />
              <rect x="146" y="96" width="6" height="6" rx="1" />
              <rect x="182" y="96" width="6" height="6" rx="1" />

              <rect x="26" y="108" width="6" height="6" rx="1" />
              <rect x="38" y="108" width="6" height="6" rx="1" />
              <rect x="60" y="108" width="6" height="6" rx="1" />
              <rect x="132" y="108" width="6" height="6" rx="1" />
              <rect x="158" y="108" width="6" height="6" rx="1" />

              <rect x="38" y="120" width="6" height="6" rx="1" />
              <rect x="60" y="120" width="6" height="6" rx="1" />
              <rect x="146" y="120" width="6" height="6" rx="1" />
              <rect x="170" y="120" width="6" height="6" rx="1" />
              <rect x="182" y="120" width="6" height="6" rx="1" />

              <rect x="26" y="132" width="6" height="6" rx="1" />
              <rect x="48" y="132" width="6" height="6" rx="1" />
              <rect x="60" y="132" width="6" height="6" rx="1" />
              <rect x="132" y="132" width="6" height="6" rx="1" />
              <rect x="158" y="132" width="6" height="6" rx="1" />
              <rect x="170" y="132" width="6" height="6" rx="1" />

              <rect x="60" y="146" width="6" height="6" rx="1" />
              <rect x="84" y="146" width="6" height="6" rx="1" />
              <rect x="108" y="146" width="6" height="6" rx="1" />
              <rect x="132" y="146" width="6" height="6" rx="1" />
              <rect x="158" y="146" width="6" height="6" rx="1" />
              <rect x="182" y="146" width="6" height="6" rx="1" />

              <rect x="60" y="158" width="6" height="6" rx="1" />
              <rect x="72" y="158" width="6" height="6" rx="1" />
              <rect x="96" y="158" width="6" height="6" rx="1" />
              <rect x="120" y="158" width="6" height="6" rx="1" />
              <rect x="146" y="158" width="6" height="6" rx="1" />
              <rect x="170" y="158" width="6" height="6" rx="1" />

              <rect x="60" y="170" width="6" height="6" rx="1" />
              <rect x="84" y="170" width="6" height="6" rx="1" />
              <rect x="108" y="170" width="6" height="6" rx="1" />
              <rect x="132" y="170" width="6" height="6" rx="1" />
              <rect x="158" y="170" width="6" height="6" rx="1" />
              <rect x="182" y="170" width="6" height="6" rx="1" />

              <rect x="60" y="182" width="6" height="6" rx="1" />
              <rect x="72" y="182" width="6" height="6" rx="1" />
              <rect x="96" y="182" width="6" height="6" rx="1" />
              <rect x="120" y="182" width="6" height="6" rx="1" />
              <rect x="146" y="182" width="6" height="6" rx="1" />
              <rect x="170" y="182" width="6" height="6" rx="1" />
            </g>

            {/* Center InstaPay Emblem Badge */}
            <rect x="74" y="74" width="52" height="52" rx="8" fill="#FFFFFF" stroke="#00C4DF" strokeWidth="2.5" />
            <g transform="translate(78, 83)">
              <text
                x="22"
                y="14"
                fill="#0C2340"
                fontSize="12"
                fontWeight="900"
                textAnchor="middle"
                fontFamily="system-ui, -apple-system, sans-serif"
                letterSpacing="-0.3"
              >
                insta
              </text>
              <text
                x="22"
                y="29"
                fill="#E11D48"
                fontSize="16"
                fontWeight="900"
                textAnchor="middle"
                fontFamily="system-ui, -apple-system, sans-serif"
                letterSpacing="-0.5"
              >
                Pay
              </text>
              <rect x="10" y="32" width="24" height="1.5" fill="#E11D48" rx="0.75" />
            </g>
          </svg>
        </div>

        {/* Bottom Note */}
        <span className="text-[10px] text-slate-500 font-medium mt-2">
          Transfer fees may apply
        </span>
      </div>

      {/* Footer Pill */}
      <div className="mt-2 text-center">
        <span className="text-[10px] font-black text-cyan-950 uppercase tracking-wider px-2.5 py-0.5 bg-white/70 rounded-full inline-block backdrop-blur-xs">
          InstaPay • QRPh Accepted
        </span>
      </div>
    </div>
  );
};

export const PaymentPanel: React.FC<PaymentPanelProps> = ({ 
  booking, 
  onUpdatePaymentStatus,
  isAdmin = false 
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Compute standard payment breakdown with ₱300 deposit deduction
  const breakdown = computeBookingPaymentBreakdown(booking);

  // Normalize payment status: 'paid', 'pending', or 'partial' (defaults to 'pending')
  const paymentStatus = booking.paymentStatus || 'pending';
  const isPaid = paymentStatus === 'paid';
  const isPartial = paymentStatus === 'partial' || (breakdown.isDepositPaid && !isPaid);
  const isPending = paymentStatus === 'pending' && !breakdown.isDepositPaid;

  const copyToClipboard = (text: string, fieldName: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // Format currency display
  const formatAmount = (val?: number | string) => {
    if (!val && val !== 0) return null;
    if (typeof val === 'number') {
      return `₱${val.toLocaleString()}`;
    }
    const clean = String(val).trim();
    if (clean.startsWith('₱') || clean.toLowerCase().startsWith('php')) {
      return clean;
    }
    const num = parseFloat(clean.replace(/[^0-9.]/g, ''));
    if (!isNaN(num)) {
      return `₱${num.toLocaleString()}`;
    }
    return clean;
  };

  // Build direct Messenger link with prefilled context message
  const prefilledMessengerMessage = encodeURIComponent(
    `Hi Miranda Rentals! Sending proof of payment for Booking Reference: ${booking.id} (${booking.name}) [Remaining Balance: ${breakdown.formattedBalance}].`
  );
  const messengerUrl = `${PAYMENT_ACCOUNT_CONFIG.messengerUrl}?text=${prefilledMessengerMessage}`;

  return (
    <div
      id="booking-payment-panel"
      className={`rounded-2xl border transition-all duration-300 shadow-xl overflow-hidden ${
        isPaid
          ? 'bg-gradient-to-b from-slate-900 via-emerald-950/20 to-slate-950 border-emerald-500/40 shadow-emerald-950/20'
          : breakdown.isDepositPaid
          ? 'bg-gradient-to-b from-slate-900 via-sky-950/25 to-slate-950 border-sky-500/40 shadow-sky-950/20'
          : 'bg-gradient-to-b from-slate-900 via-amber-950/15 to-slate-950 border-amber-500/40 shadow-amber-950/20'
      }`}
    >
      {/* Panel Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
              isPaid
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : breakdown.isDepositPaid
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
            }`}
          >
            {isPaid ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : breakdown.isDepositPaid ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <Clock className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                Billing & Settlement (₱300 Deposit Workflow)
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>Payment Information</span>
            </h3>
          </div>
        </div>

        {/* Dynamic Status Pill */}
        <div className="flex items-center gap-2">
          <span
            id="payment-status-badge"
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider font-mono flex items-center gap-1.5 shadow-sm ${
              isPaid
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : breakdown.isDepositPaid
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isPaid ? 'bg-emerald-400' : breakdown.isDepositPaid ? 'bg-sky-400' : 'bg-amber-400 animate-ping'
              }`}
            />
            {isPaid
              ? 'Paid in Full'
              : breakdown.isDepositPaid
              ? '₱300 Deposit Paid • Secured'
              : 'Deposit Pending (₱300)'}
          </span>
        </div>
      </div>

      {/* Panel Body Content */}
      <div className="p-4 sm:p-6 space-y-6">
        {/* If Paid: Highlight Verified Receipt State */}
        {isPaid ? (
          <div className="space-y-4">
            <div className="p-4 sm:p-5 rounded-xl bg-emerald-950/40 border border-emerald-600/40 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 text-center sm:text-left">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0 mx-auto sm:mx-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm sm:text-base flex items-center gap-1.5 justify-center sm:justify-start">
                    <span>Payment Received & Confirmed in Full</span>
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  </h4>
                  <p className="text-xs text-emerald-200/80 mt-1 leading-relaxed">
                    Thank you! Your total payment of <strong className="text-white">{breakdown.formattedTotal}</strong> (including ₱300 security deposit) has been verified. Your reservation is completely confirmed.
                  </p>
                </div>
              </div>

              <div className="sm:text-right shrink-0 p-2.5 sm:p-0 bg-slate-950/60 sm:bg-transparent rounded-lg border sm:border-0 border-emerald-800/40 w-full sm:w-auto">
                <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold block">
                  Amount Settled
                </span>
                <span className="text-xl sm:text-2xl font-black text-white font-mono block mt-0.5">
                  {breakdown.formattedTotal}
                </span>
              </div>
            </div>

            {/* Payment Details Breakdown Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Payment Status</span>
                <span className="font-bold text-emerald-400 block mt-0.5 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  FULL SETTLEMENT
                </span>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Payment Method</span>
                <span className="font-bold text-white block mt-0.5 truncate">
                  {booking.paymentMethod || 'GCash / Online'}
                </span>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Reference No.</span>
                <span className="font-bold text-sky-300 block mt-0.5 truncate">
                  {booking.paymentReference || booking.id}
                </span>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Settled Date</span>
                <span className="font-bold text-slate-200 block mt-0.5 truncate">
                  {booking.paidAt 
                    ? formatDateTime(new Date(booking.paidAt)) 
                    : formatDateOnly(booking.startDate)}
                </span>
              </div>
            </div>

            {booking.paymentNotes && (
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block mb-1">
                  Payment Remarks
                </span>
                <p>{booking.paymentNotes}</p>
              </div>
            )}
          </div>
        ) : (
          /* If Pending / Partial / Deposit Paid: Prominently Showcase 300 Deposit Deduction & QR Code */
          <div className="space-y-6">
            {/* Notice Alert Box */}
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              breakdown.isDepositPaid 
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' 
                : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
            }`}>
              <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 ${breakdown.isDepositPaid ? 'text-emerald-400' : 'text-amber-400'}`} />
              <div className="space-y-1 text-xs leading-relaxed">
                <strong className="text-white block font-bold text-sm">
                  {breakdown.isDepositPaid 
                    ? '₱300 Deposit Received • Vehicle Secured' 
                    : '₱300 Security Deposit Required to Lock In Booking'}
                </strong>
                <p className="text-slate-300">
                  {breakdown.isDepositPaid ? (
                    <>
                      Your <strong className="text-emerald-300 font-semibold">₱300 security deposit</strong> has been recorded and <strong className="text-white">deducted from your total rental fee</strong>. Your remaining balance of <strong className="text-cyan-300 font-mono font-bold">{breakdown.formattedBalance}</strong> can be settled via the QR code below or in cash upon vehicle turnover.
                    </>
                  ) : (
                    <>
                      To secure your vehicle reservation, please pay the <strong className="text-amber-300 font-semibold">₱300 deposit</strong>. Once received, the ₱300 will be subtracted from the total fee of <strong className="text-white">{breakdown.formattedTotal}</strong>.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Main 2-Column Responsive Layout: Left QR Code, Right Account Details & Actions */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              
              {/* QR Code Presentation Column (5 cols) */}
              <div className="md:col-span-5 flex flex-col items-center justify-center text-center space-y-3">
                <div className="relative group cursor-pointer" onClick={() => setIsQrModalOpen(true)}>
                  {/* Exact Uploaded Bank QR Image */}
                  <img 
                    src={booking.paymentQrUrl || PAYMENT_ACCOUNT_CONFIG.qrAssetUrl} 
                    alt="Miranda Rentals & Services GoTyme Bank Payment QR"
                    className="w-full max-w-[250px] h-auto object-contain rounded-2xl shadow-md transition-transform duration-200 group-hover:scale-[1.02]"
                    referrerPolicy="no-referrer"
                  />

                  {/* Hover Overlay to Enlarge */}
                  <div className="absolute inset-0 bg-slate-950/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 backdrop-blur-xs">
                    <Maximize2 className="w-6 h-6 text-cyan-300" />
                    <span className="text-xs font-bold">Click to Enlarge</span>
                  </div>
                </div>

                {/* QR Quick Actions: View Full & Download */}
                <div className="flex items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsQrModalOpen(true)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1.5 hover:underline"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>View Large QR</span>
                  </button>

                  <span className="text-slate-600">•</span>

                  <a
                    href={booking.paymentQrUrl || PAYMENT_ACCOUNT_CONFIG.qrAssetUrl}
                    download="miranda-rentals-payment-qr.png"
                    className="text-xs text-slate-300 hover:text-white font-semibold inline-flex items-center gap-1.5 hover:underline"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Save to Photos</span>
                  </a>
                </div>
              </div>

              {/* Account Breakdown & Step-by-Step Column (7 cols) */}
              <div className="md:col-span-7 space-y-4">
                
                {/* 3-Tier Fee & Deposit Deduction Breakdown Card */}
                <div
                  id="tracker-payment-breakdown-card"
                  className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3 font-mono shadow-inner"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-400">
                      Payment Fee Breakdown
                    </span>
                    <span className="text-[10px] text-cyan-400 font-bold">
                      {booking.durationHours ? `${booking.durationHours} Hours Rental` : `${booking.noOfDays} Days`}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* Row 1: Overall / Total Rental Rate */}
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="font-sans text-slate-400">Total Rental Rate:</span>
                      <span className="font-bold text-white text-sm">{breakdown.formattedTotal}</span>
                    </div>

                    {/* Row 2: ₱300 Deposit Deduction */}
                    <div className="flex items-center justify-between text-emerald-400">
                      <div className="flex items-center gap-1.5">
                        <span className="font-sans text-emerald-400 font-medium">Less Security Deposit:</span>
                        <span className="text-[9px] font-sans px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                          {breakdown.isDepositPaid ? 'PAID & DEDUCTED' : 'TO SECURE'}
                        </span>
                      </div>
                      <span className="font-bold text-emerald-400">
                        {breakdown.isDepositPaid ? `-₱${breakdown.depositDeduction.toLocaleString()}` : `-₱${STANDARD_DEPOSIT_AMOUNT.toLocaleString()}`}
                      </span>
                    </div>

                    {/* Row 3: Remaining Balance Due */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-sans font-bold text-white text-xs block">
                          Remaining Balance Due:
                        </span>
                        <span className="font-sans text-[10px] text-slate-400">
                          {breakdown.isDepositPaid ? 'Payable via QR or at turnover' : 'Payable after ₱300 deposit'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg sm:text-xl font-black text-cyan-300 font-mono block">
                          {breakdown.formattedBalance}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bank & Payment Info Box */}
                <div className="space-y-2 text-xs">
                  {/* Bank & Universal Acceptance Notice */}
                  <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                          GoTyme Bank
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          InstaPay / QRPh
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">Any Bank Accepted</span>
                    </div>

                    <div className="text-slate-300 text-xs leading-relaxed">
                      <strong className="text-white block font-medium">
                        {PAYMENT_ACCOUNT_CONFIG.accountName}
                      </strong>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Scan with <span className="text-slate-200 font-semibold">GCash, Maya, BDO, BPI, UnionBank, Metrobank, SeaBank, Tonik</span> or any Philippine mobile banking app with QR scanning.
                      </p>
                    </div>
                  </div>

                  {/* Reference Number Copy Block */}
                  <div className="p-3 bg-slate-950/70 hover:bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3 transition-colors">
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">
                        Your Booking Reference (Add in Payment Notes)
                      </span>
                      <span className="text-sm font-mono font-bold text-cyan-400 block mt-0.5">
                        {booking.id}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(booking.id, 'bookingId')}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0 active:scale-95 transition-all"
                    >
                      {copiedField === 'bookingId' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy Ref</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Direct Action: Send Proof via Messenger */}
                <div className="pt-2">
                  <a
                    href={messengerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 active:scale-98"
                  >
                    <MessageCircle className="w-4 h-4 fill-current shrink-0" />
                    <span>Send Payment Screenshot to Messenger</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70 ml-1" />
                  </a>
                  <span className="text-[10px] text-slate-400 text-center block mt-1.5">
                    Our team will verify your receipt and update this status to <strong>Paid</strong> immediately.
                  </span>
                </div>
              </div>
            </div>

            {/* 3 Simple Steps Guide */}
            <div className="pt-4 border-t border-slate-800/80">
              <span className="text-[11px] font-mono uppercase font-bold text-slate-400 block mb-3">
                How to Pay via QR Code
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-300">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                  <div className="w-5 h-5 rounded-full bg-cyan-600 text-white font-mono font-bold text-xs flex items-center justify-center mb-1">
                    1
                  </div>
                  <strong className="text-white block font-semibold text-xs">Scan or Save QR</strong>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Open your bank or e-wallet app, tap <strong>Scan QR</strong>, or upload from your saved photos.
                  </p>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                  <div className="w-5 h-5 rounded-full bg-cyan-600 text-white font-mono font-bold text-xs flex items-center justify-center mb-1">
                    2
                  </div>
                  <strong className="text-white block font-semibold text-xs">Confirm & Reference</strong>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Verify account name <strong className="text-slate-200">Miranda Rentals</strong> and include Ref <strong className="text-slate-200 font-mono">{booking.id}</strong>.
                  </p>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                  <div className="w-5 h-5 rounded-full bg-cyan-600 text-white font-mono font-bold text-xs flex items-center justify-center mb-1">
                    3
                  </div>
                  <strong className="text-white block font-semibold text-xs">Send Proof</strong>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Send transfer screenshot to our Messenger. We will mark your booking Paid.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Large QR Modal View */}
      {isQrModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsQrModalOpen(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">GoTyme Official Payment QR</h3>
              </div>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex justify-center py-1">
              <img 
                src={booking.paymentQrUrl || PAYMENT_ACCOUNT_CONFIG.qrAssetUrl} 
                alt="Miranda Rentals Payment QR"
                className="w-full max-w-[300px] h-auto object-contain rounded-2xl shadow-lg"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="space-y-1 text-xs">
              <strong className="text-white block font-semibold">{PAYMENT_ACCOUNT_CONFIG.accountName}</strong>
              <span className="text-cyan-400 font-mono font-bold block pt-0.5">Booking Ref: {booking.id}</span>
              <span className="text-[11px] text-slate-400 block">
                Accepts GCash, Maya, BDO, BPI, UnionBank & All PH Banks
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <a
                href={booking.paymentQrUrl || PAYMENT_ACCOUNT_CONFIG.qrAssetUrl}
                download="miranda-rentals-gotyme-qr.png"
                className="py-2.5 px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Save QR</span>
              </a>

              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
