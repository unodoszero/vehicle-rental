import React, { useState, useEffect } from 'react';
import { 
  X, Copy, Check, ExternalLink, Calendar, Clock, MapPin, 
  Phone, User, Users, Car, ShieldCheck, AlertTriangle, 
  Edit, Trash2, ArrowRight, Sparkles, Navigation, MessageSquare, RotateCcw,
  CheckCircle2, Fuel, Gauge, UserCheck, FileText, CreditCard, Receipt, QrCode, ChevronDown, ChevronUp
} from 'lucide-react';
import { Booking, TurnoverDetails } from '../types';
import { 
  calculateBookingTime, 
  formatDateTime, 
  formatDateOnly, 
  formatTimeOnly, 
  getBookingTurnaroundReadyDateTime,
  computeBookingPaymentBreakdown,
  STANDARD_DEPOSIT_AMOUNT
} from '../utils/dateUtils';
import { TurnoverLogModal } from './TurnoverLogModal';
import { useToast } from './Toast';

interface BookingDetailsDrawerProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (booking: Booking) => void;
  onDelete: (booking: Booking) => void;
  onOpenTracker: (bookingId: string) => void;
  onConfirmTurnover?: (bookingId: string, details: TurnoverDetails) => void;
  onUndoTurnover?: (booking: Booking) => void;
  onUpdatePaymentStatus?: (bookingId: string, paymentData: Partial<Booking>) => void;
}

export const generateBookingConfirmationMessage = (booking: Booking): string => {
  const trackerKey = booking.trackingToken || booking.id;
  const trackerUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/tracker?id=${encodeURIComponent(trackerKey)}`;
  const calc = calculateBookingTime(booking, new Date());
  const breakdown = computeBookingPaymentBreakdown(booking);
  const vehicleDesc = `${booking.vehicle}${booking.vehicleModel ? ` (${booking.vehicleModel})` : ''}${booking.plateNumber ? ` [Plate: ${booking.plateNumber}]` : ''}`;
  const agreementContractUrl = "https://storage.googleapis.com/miranda-rentals-public/Miranda_Rentals_Agreement_Form_Placeholder.pdf";
  const paymentStatusText = booking.paymentStatus === 'paid' ? 'PAID IN FULL' : breakdown.isDepositPaid ? '₱300 DEPOSIT PAID (SECURED)' : 'PENDING ₱300 DEPOSIT';
  const durationDesc = booking.durationHours 
    ? `${booking.durationHours} Hour${booking.durationHours > 1 ? 's' : ''}`
    : `${booking.noOfDays} Day${booking.noOfDays > 1 ? 's' : ''}`;
  
  return `Hi ${booking.name}!

Thank you for choosing Miranda Rentals and Services. Your reservation for the ${vehicleDesc} has been confirmed.

Rental Schedule:
• Start: ${formatDateOnly(booking.startDate)} at ${formatTimeOnly(booking.startTime)}
• Start Location: ${booking.startLocation}
• Expected Return: ${formatDateOnly(calc.endDateTime)} at ${formatTimeOnly(calc.endDateTime)} (${durationDesc})
• Destination: ${booking.destination}
• Service Type: ${booking.selfDrive ? 'Self-Drive' : 'With Driver'}
• Reference No.: ${booking.id}
• Total Rental Rate: ${breakdown.formattedTotal}
• Security Deposit: ${breakdown.isDepositPaid ? '₱300 PAID (Deducted from Total)' : '₱300 (Required to secure)'}
• Remaining Balance Due: ${breakdown.formattedBalance} (${paymentStatusText})

The ${booking.vehicle.toLowerCase()} has been thoroughly cleaned, sanitized, and inspected for your journey.

💳 Payment & QR Code:
You can view our official Payment QR (GCash/Maya/Bank) and track live rental updates anytime on your portal:
${trackerUrl}

📄 Rental Agreement & Contract Notice:
We encourage you to review the Rental Agreement in advance:
${agreementContractUrl}
*Note: This agreement form will need to be physically signed upon the turnover of the vehicle.*

Have a safe and pleasant trip! Please feel free to message us if you need any assistance.`;
};

export const BookingDetailsDrawer: React.FC<BookingDetailsDrawerProps> = ({
  booking,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onOpenTracker,
  onConfirmTurnover,
  onUndoTurnover,
  onUpdatePaymentStatus,
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTurnoverModalOpen, setIsTurnoverModalOpen] = useState(false);
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  
  // Local payment edit state
  const [editPaymentStatus, setEditPaymentStatus] = useState<'pending' | 'paid' | 'partial'>('pending');
  const [editDepositPaid, setEditDepositPaid] = useState<boolean>(true);
  const [editPaymentAmount, setEditPaymentAmount] = useState<string>('');
  const [editDownpayment, setEditDownpayment] = useState<string>('300');
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>('GCash');
  const [editPaymentReference, setEditPaymentReference] = useState<string>('');
  const [editPaymentNotes, setEditPaymentNotes] = useState<string>('');

  // Second-by-second live calculation
  useEffect(() => {
    if (!isOpen || !booking) return;
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, booking]);

  // Sync payment form state when booking changes
  useEffect(() => {
    if (booking) {
      setCustomMessage(generateBookingConfirmationMessage(booking));
      setEditPaymentStatus(booking.paymentStatus || 'pending');
      setEditDepositPaid(booking.depositPaid !== false);
      setEditPaymentAmount(booking.paymentAmount ? String(booking.paymentAmount).replace(/[^0-9.]/g, '') : '');
      setEditDownpayment(booking.downpaymentAmount ? String(booking.downpaymentAmount).replace(/[^0-9.]/g, '') : '300');
      setEditPaymentMethod(booking.paymentMethod || 'GCash');
      setEditPaymentReference(booking.paymentReference || '');
      setEditPaymentNotes(booking.paymentNotes || '');
      setIsEditingPayment(false);
    }
  }, [booking, isOpen]);

  const handleQuickSetStatus = (newStatus: 'pending' | 'paid' | 'partial') => {
    if (!booking || !onUpdatePaymentStatus) return;
    const paymentUpdates: Partial<Booking> = {
      paymentStatus: newStatus,
      paidAt: newStatus === 'paid' ? new Date().toISOString() : undefined,
    };
    onUpdatePaymentStatus(booking.id, paymentUpdates);
  };

  const handleQuickToggleDeposit = (paid: boolean) => {
    if (!booking || !onUpdatePaymentStatus) return;
    const totalNum = typeof booking.paymentAmount === 'number'
      ? booking.paymentAmount
      : parseFloat(String(booking.paymentAmount || '0')) || 0;
    const depositNum = paid ? 300 : 0;
    const calcRemaining = booking.paymentStatus === 'paid' ? 0 : Math.max(0, totalNum - depositNum);

    const paymentUpdates: Partial<Booking> = {
      depositPaid: paid,
      depositAmount: 300,
      downpaymentAmount: paid ? 300 : undefined,
      remainingBalance: calcRemaining,
    };
    onUpdatePaymentStatus(booking.id, paymentUpdates);
    showToast(
      paid ? 'Deposit Marked as Paid' : 'Deposit Marked as Unpaid',
      paid ? '₱300 deposit confirmed. Vehicle secured and deducted from total balance.' : '₱300 deposit marked pending.',
      'info'
    );
  };

  const handleSavePaymentForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking || !onUpdatePaymentStatus) return;
    const parsedAmount = editPaymentAmount ? parseFloat(editPaymentAmount) || editPaymentAmount : undefined;
    const parsedDownpayment = editDepositPaid ? (editDownpayment ? parseFloat(editDownpayment) || 300 : 300) : undefined;

    const totalNum = typeof parsedAmount === 'number' ? parsedAmount : parseFloat(String(parsedAmount || '0')) || 0;
    const depositNum = editDepositPaid ? (typeof parsedDownpayment === 'number' ? parsedDownpayment : 300) : 0;
    const calcRemaining = editPaymentStatus === 'paid' ? 0 : Math.max(0, totalNum - depositNum);

    const paymentUpdates: Partial<Booking> = {
      depositPaid: editDepositPaid,
      depositAmount: 300,
      paymentStatus: editPaymentStatus,
      paymentAmount: parsedAmount,
      downpaymentAmount: parsedDownpayment,
      remainingBalance: calcRemaining,
      paymentMethod: editPaymentMethod,
      paymentReference: editPaymentReference.trim() || undefined,
      paymentNotes: editPaymentNotes.trim() || undefined,
      paidAt: editPaymentStatus === 'paid' ? (booking.paidAt || new Date().toISOString()) : undefined,
    };

    onUpdatePaymentStatus(booking.id, paymentUpdates);
    setIsEditingPayment(false);
  };

  const handleResetMessage = () => {
    if (!booking) return;
    const initial = generateBookingConfirmationMessage(booking);
    setCustomMessage(initial);
    showToast('Message Restored', 'Customer confirmation message has been reset to initial template.', 'info');
  };

  if (!isOpen || !booking) return null;

  const timeCalc = calculateBookingTime(booking, currentTime);

  const trackerKey = booking.trackingToken || booking.id;

  const handleCopyLink = () => {
    // Generate secure tracker link with unguessable cryptographic token
    const trackerUrl = `${window.location.origin}/tracker?id=${encodeURIComponent(trackerKey)}`;
    navigator.clipboard.writeText(trackerUrl).then(() => {
      setCopied(true);
      showToast('Secure Tracker Link Copied!', `Token-secured link for ${booking.name} copied to clipboard.`, 'success');
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      // Fallback
      prompt('Copy this tracker link for the renter:', trackerUrl);
    });
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(customMessage).then(() => {
      setCopiedMessage(true);
      showToast('Message Copied!', `Customer confirmation message for ${booking.name} copied to clipboard.`, 'success');
      setTimeout(() => setCopiedMessage(false), 2500);
    }).catch(() => {
      prompt('Copy customer message:', customMessage);
    });
  };

  return (
    <>
      <div
        id="booking-drawer-backdrop"
        className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs flex justify-end animate-fade-in"
        role="dialog"
        aria-modal="true"
      >
        <div
          id="booking-drawer-content"
          className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden border-l border-slate-200 animate-slide-left"
        >
          {/* Drawer Header */}
          <div className="bg-white border-b border-slate-200 px-6 py-5 shrink-0 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${timeCalc.isCompleted ? 'bg-emerald-600' : 'bg-blue-600'}`}></span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Booking Details
              </h2>
            </div>
            <button
              id="close-drawer-btn"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body Details */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-900">
            
            {/* Live Tracker View Card */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Rental Status
              </h2>
              {timeCalc.isCompleted ? (
                <div className="bg-emerald-700 rounded-xl p-4 text-white shadow-lg shadow-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                      <span className="text-xs font-bold uppercase tracking-wider">Turnover Completed</span>
                    </div>
                    <span className="text-[10px] bg-emerald-800/80 text-emerald-100 px-2 py-0.5 rounded font-mono font-bold">
                      Returned
                    </span>
                  </div>

                  <div className="text-xs space-y-1.5 bg-emerald-800/40 p-3 rounded-lg border border-emerald-600/50">
                    <div className="flex justify-between">
                      <span className="text-emerald-100/80">Turnover Time:</span>
                      <span className="font-semibold font-mono">
                        {booking.turnoverDetails?.returnedAt 
                          ? formatDateTime(new Date(booking.turnoverDetails.returnedAt)) 
                          : booking.completedAt 
                          ? formatDateTime(new Date(booking.completedAt))
                          : 'Recorded'}
                      </span>
                    </div>
                    {booking.turnoverDetails?.fuelLevel && (
                      <div className="flex justify-between">
                        <span className="text-emerald-100/80">Fuel Level:</span>
                        <span className="font-semibold">{booking.turnoverDetails.fuelLevel}</span>
                      </div>
                    )}
                    {booking.turnoverDetails?.odometerReading && (
                      <div className="flex justify-between">
                        <span className="text-emerald-100/80">Odometer:</span>
                        <span className="font-mono font-semibold">{booking.turnoverDetails.odometerReading}</span>
                      </div>
                    )}
                    {booking.turnoverDetails?.receivedBy && (
                      <div className="flex justify-between">
                        <span className="text-emerald-100/80">Received By:</span>
                        <span className="font-semibold">{booking.turnoverDetails.receivedBy}</span>
                      </div>
                    )}
                  </div>

                  {booking.turnoverDetails?.conditionNotes && (
                    <p className="text-[11px] text-emerald-100/90 italic bg-emerald-900/30 p-2 rounded">
                      &ldquo;{booking.turnoverDetails.conditionNotes}&rdquo;
                    </p>
                  )}

                  {timeCalc.canUndoTurnover && onUndoTurnover && (
                    <button
                      id="drawer-undo-turnover-top-btn"
                      type="button"
                      onClick={() => onUndoTurnover(booking)}
                      className="w-full py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-white/20"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Undo Turnover (24h Window)</span>
                    </button>
                  )}
                </div>
              ) : timeCalc.isOvertime ? (
                <div className="bg-red-600 rounded-lg p-4 text-white text-center shadow-lg shadow-red-200">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                    Warning: Overtime
                  </p>
                  <div className="text-3xl font-mono font-bold my-1">
                    +{timeCalc.formattedRemaining}
                  </div>
                  <p className="text-[11px] opacity-90">
                    {booking.name} • {booking.vehicleModel || `${booking.vehicle} Rental`}
                  </p>
                </div>
              ) : timeCalc.isActive ? (
                <div className="bg-blue-600 rounded-lg p-4 text-white text-center shadow-lg shadow-blue-200">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                    Active Rental
                  </p>
                  <div className="text-3xl font-mono font-bold my-1">
                    {timeCalc.formattedRemaining}
                  </div>
                  <p className="text-[11px] opacity-90">
                    {booking.name} • {booking.vehicleModel || `${booking.vehicle} Rental`}
                  </p>
                </div>
              ) : (
                <div className="bg-slate-900 rounded-lg p-4 text-white text-center shadow-md">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                    Scheduled Departure
                  </p>
                  <div className="text-2xl font-mono font-bold my-1">
                    {timeCalc.formattedRemaining}
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Starts {formatDateOnly(booking.startDate)} at {formatTimeOnly(booking.startTime)}
                  </p>
                </div>
              )}
            </div>

            {/* Payment Status & Quick Management Card */}
            {(() => {
              const breakdown = computeBookingPaymentBreakdown(booking);
              return (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Payment & Deposit
                      </h3>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider ${
                      booking.paymentStatus === 'paid'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : breakdown.isDepositPaid
                        ? 'bg-sky-100 text-sky-800 border border-sky-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {booking.paymentStatus === 'paid' ? 'Paid in Full' : breakdown.isDepositPaid ? 'Deposit Settled' : 'Deposit Pending'}
                    </span>
                  </div>

                  {/* Deposit Confirmation Badge */}
                  <div className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 text-xs ${
                    breakdown.isDepositPaid 
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                      : 'bg-amber-50/80 border-amber-200 text-amber-900'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      {breakdown.isDepositPaid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                      <div>
                        <span className="font-bold block">
                          {breakdown.isDepositPaid ? '₱300 Security Deposit Paid' : '₱300 Deposit Unpaid'}
                        </span>
                        <span className="text-[11px] opacity-85 block">
                          {breakdown.isDepositPaid ? 'Vehicle is secured for this reservation' : 'Deposit is required to secure the vehicle'}
                        </span>
                      </div>
                    </div>
                    {onUpdatePaymentStatus && (
                      <button
                        type="button"
                        onClick={() => handleQuickToggleDeposit(!breakdown.isDepositPaid)}
                        className={`text-[11px] font-bold px-2 py-1 rounded transition-colors ${
                          breakdown.isDepositPaid
                            ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        }`}
                      >
                        {breakdown.isDepositPaid ? 'Mark Unpaid' : 'Mark Paid'}
                      </button>
                    )}
                  </div>

                  {/* Summary Details - 3 Column Breakdown */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-mono uppercase block">Total Rate</span>
                      <span className="font-bold font-mono text-slate-900 block mt-0.5">
                        {breakdown.formattedTotal}
                      </span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-mono uppercase block">Deposit Paid</span>
                      <span className={`font-bold font-mono block mt-0.5 ${breakdown.isDepositPaid ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {breakdown.isDepositPaid ? '-₱300' : '₱0'}
                      </span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-mono uppercase block">Balance Due</span>
                      <span className="font-bold font-mono text-blue-700 block mt-0.5">
                        {breakdown.formattedBalance}
                      </span>
                    </div>
                  </div>

                  {/* Quick Status Buttons */}
                  {onUpdatePaymentStatus && !isEditingPayment && (
                    <div className="flex items-center gap-1.5 pt-1">
                      {booking.paymentStatus !== 'paid' ? (
                        <button
                          type="button"
                          onClick={() => handleQuickSetStatus('paid')}
                          className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Full Payment</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleQuickSetStatus('pending')}
                          className="flex-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Set to Pending</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsEditingPayment(true)}
                        className="py-1.5 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Edit className="w-3 h-3 text-slate-500" />
                        <span>Edit Billing</span>
                      </button>
                    </div>
                  )}

                  {/* Expandable Payment Edit Form */}
                  {isEditingPayment && (
                    <form onSubmit={handleSavePaymentForm} className="pt-2 border-t border-slate-200 space-y-2.5 text-xs">
                      {/* Deposit Checkbox */}
                      <label className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editDepositPaid}
                          onChange={(e) => setEditDepositPaid(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-emerald-950 block">Customer Paid ₱300 Deposit</span>
                          <span className="text-[11px] text-emerald-700 block">Secures vehicle & deducts ₱300 from customer balance</span>
                        </div>
                      </label>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Overall Status</label>
                          <select
                            value={editPaymentStatus}
                            onChange={(e) => setEditPaymentStatus(e.target.value as any)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                          >
                            <option value="pending">Pending</option>
                            <option value="paid">Paid in Full</option>
                            <option value="partial">Deposit / Partial</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Total Amount (₱)</label>
                          <input
                            type="number"
                            placeholder="e.g. 1500"
                            value={editPaymentAmount}
                            onChange={(e) => setEditPaymentAmount(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Payment Method</label>
                          <select
                            value={editPaymentMethod}
                            onChange={(e) => setEditPaymentMethod(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                          >
                            <option value="GCash">GCash</option>
                            <option value="Maya">Maya</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cash">Cash</option>
                            <option value="QRPh">QRPh</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Reference No.</label>
                          <input
                            type="text"
                            placeholder="e.g. GCash Ref / Receipt"
                            value={editPaymentReference}
                            onChange={(e) => setEditPaymentReference(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsEditingPayment(false)}
                          className="px-2.5 py-1 text-slate-500 hover:text-slate-700 text-xs font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs"
                        >
                          Save Payment
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })()}

          {/* Structured Booking Info List */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100">
              <span className="text-slate-500">Secure Tracking Ref:</span>
              <span className="font-bold font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{booking.trackingToken || booking.id}</span>
            </div>

            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100">
              <span className="text-slate-500">Customer:</span>
              <span className="font-bold text-slate-900">{booking.name}</span>
            </div>

            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100">
              <span className="text-slate-500">Mobile:</span>
              <a href={`tel:${booking.mobileNo}`} className="font-bold font-mono text-blue-600 hover:underline">
                {booking.mobileNo}
              </a>
            </div>

            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100">
              <span className="text-slate-500">Vehicle:</span>
              <span className="font-bold text-slate-900">{booking.vehicle} — {booking.vehicleModel || 'Standard'}</span>
            </div>

            {booking.plateNumber && (
              <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100">
                <span className="text-slate-500">Plate Number:</span>
                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                  {booking.plateNumber}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100">
              <span className="text-slate-500">Driver Mode:</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                booking.selfDrive ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}>
                {booking.selfDrive ? 'Self-Drive (Customer)' : 'Company Chauffeur'}
              </span>
            </div>

            {booking.selfDrive && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Designated Driver Profile
                </span>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Driver Name:</span>
                    <span className="text-slate-900 font-bold">
                      {booking.driverName || booking.name}
                      {booking.renterIsDriver !== false && (
                        <span className="ml-1.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-semibold">
                          Renter
                        </span>
                      )}
                    </span>
                  </div>
                  {booking.driverBirthdate && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Birthdate:</span>
                      <span className="font-mono text-slate-900 font-semibold">{formatDateOnly(booking.driverBirthdate)}</span>
                    </div>
                  )}
                  {booking.licenseNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">License No:</span>
                      <span className="font-mono text-slate-900 font-semibold">{booking.licenseNumber}</span>
                    </div>
                  )}
                  {booking.licenseExpiration && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Expiration Date:</span>
                      <span className="font-mono text-slate-900 font-semibold">{formatDateOnly(booking.licenseExpiration)}</span>
                    </div>
                  )}
                  {!booking.licenseNumber && booking.driversLicenseDetails && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">License Details:</span>
                      <span className="font-mono text-slate-900 font-semibold">{booking.driversLicenseDetails}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100">
              <span className="text-slate-500">Route:</span>
              <span className="font-semibold text-slate-900">
                {booking.startLocation} &rarr; {booking.destination}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100">
              <span className="text-slate-500">Schedule:</span>
              <span className="font-semibold text-slate-900">
                {formatDateOnly(booking.startDate)} ({formatTimeOnly(booking.startTime)}) • {booking.noOfDays} Day{booking.noOfDays > 1 ? 's' : ''} ({(booking.noOfDays * 24) - 2}h)
              </span>
            </div>

            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100">
              <span className="text-slate-500">Scheduled Return:</span>
              <div className="text-right">
                <span className="font-bold text-slate-900 block">
                  {formatDateOnly(timeCalc.endDateTime)}, {formatTimeOnly(timeCalc.endDateTime)}
                </span>
                <span className="text-[10px] text-emerald-700 block font-mono">
                  Ready for next: {formatTimeOnly(getBookingTurnaroundReadyDateTime(booking))} (4h window)
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs py-1">
              <span className="text-slate-500">Passengers:</span>
              <span className="font-bold text-slate-900">{booking.passengers} Pax</span>
            </div>
          </div>

          {/* Public Tracking Link Box */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">
                Secure Tracking Link
              </label>
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                Token Protected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex-1 truncate bg-slate-100 p-2 rounded text-[11px] font-mono text-slate-600 border border-slate-200">
                {`${window.location.origin}/tracker?id=${trackerKey}`}
              </div>
              <button
                id="copy-tracker-link-btn"
                onClick={handleCopyLink}
                className="p-2 bg-slate-900 text-white rounded hover:bg-slate-800 active:scale-95 transition-transform flex items-center justify-center shrink-0"
                title="Copy tracker link"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-end mt-2">
              <button
                id="open-live-tracker-btn"
                onClick={() => onOpenTracker(trackerKey)}
                className="text-[11px] text-slate-600 hover:text-blue-600 font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                Preview Live Tracker
              </button>
            </div>
          </div>

          {/* Customer Confirmation Message Section */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="customer-message-textarea" className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                Customer Confirmation Message
              </label>
              <span className="text-[10px] font-medium text-slate-500">
                Ready to send
              </span>
            </div>

            <div className="relative rounded-xl border border-slate-200 bg-slate-50 overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <textarea
                id="customer-message-textarea"
                rows={8}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full p-3 text-xs text-slate-800 bg-transparent border-0 resize-y font-sans leading-relaxed focus:outline-none"
                placeholder="Customer confirmation message..."
              />
              <div className="flex items-center justify-between px-3 py-2 bg-slate-100/90 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    id="refresh-customer-message-btn"
                    type="button"
                    onClick={handleResetMessage}
                    title="Restore initial confirmation message template"
                    className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-white rounded-md border border-slate-200/60 hover:border-slate-300 transition-all cursor-pointer flex items-center gap-1.5 text-[11px] font-medium active:scale-95 shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Initial</span>
                  </button>
                  <span className="text-[10px] text-slate-400 italic hidden sm:inline">
                    Editable
                  </span>
                </div>
                <button
                  id="copy-customer-message-btn"
                  type="button"
                  onClick={handleCopyMessage}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer ${
                    copiedMessage 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {copiedMessage ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-white" />
                      <span>Copy Message</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {booking.notes && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Internal Operational Notes
              </span>
              <p className="text-slate-700 italic">{booking.notes}</p>
            </div>
          )}
        </div>

        {/* Drawer Actions */}
        <div className="p-6 border-t border-slate-200 space-y-2.5 bg-white shrink-0">
          {/* Primary Turnover Action */}
          {!timeCalc.isCompleted ? (
            <button
              id="drawer-log-turnover-btn"
              onClick={() => setIsTurnoverModalOpen(true)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Log Successful Turnover (Complete Rental)</span>
            </button>
          ) : timeCalc.canUndoTurnover && onUndoTurnover ? (
            <button
              id="drawer-undo-turnover-btn"
              onClick={() => onUndoTurnover(booking)}
              className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
              <span>Undo Turnover (Restore to Active)</span>
            </button>
          ) : null}

          <button
            id="drawer-edit-booking-btn"
            onClick={() => onEdit(booking)}
            className="w-full py-2.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Edit className="w-3.5 h-3.5 text-slate-600" />
            Edit Booking
          </button>

          <button
            id="drawer-delete-booking-btn"
            onClick={() => onDelete(booking)}
            className="w-full py-2.5 text-red-600 text-xs font-bold hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Booking
          </button>
        </div>
      </div>
    </div>

    {/* Turnover Log Modal */}
    <TurnoverLogModal
      isOpen={isTurnoverModalOpen}
      onClose={() => setIsTurnoverModalOpen(false)}
      booking={booking}
      onConfirmTurnover={(bookingId, details) => {
        if (onConfirmTurnover) {
          onConfirmTurnover(bookingId, details);
        }
        setIsTurnoverModalOpen(false);
      }}
    />
  </>
  );
};
