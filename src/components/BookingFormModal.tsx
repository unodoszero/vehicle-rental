import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Calendar, Clock, MapPin, Phone, User, Users, Car, 
  ShieldCheck, FileText, AlertCircle, Info, Sparkles, Hash, AlertTriangle,
  Building2, Edit3, ToggleLeft, ToggleRight, CreditCard, DollarSign,
  Zap, Check, ArrowRight
} from 'lucide-react';
import { Booking, VehicleType } from '../types';
import { generateBookingId, getRandomColorTag, generateTrackingToken } from '../utils/storage';
import { 
  getBookingStartDateTime, 
  getBookingEndDateTime, 
  getBookingTurnaroundReadyDateTime,
  formatDateTime, 
  formatDateOnly,
  formatTimeOnly,
  toISODateString,
  checkBookingConflicts,
  getSuggestedRate,
  formatDurationDisplay,
  TURNOVER_CLEANING_HOURS,
  RENTAL_RATES
} from '../utils/dateUtils';

export const PRESET_PICKUP_LOCATIONS = [
  'Isle of Patmos, Zone 2, Barangay Culipat, Tarlac City, Tarlac',
  'Lot 35 Blk 27 Maasikaso St. Fiesta Communities Matatalaib Tarlac City, Tarlac 2300'
];

interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (bookingData: Booking, isOverride?: boolean) => void;
  editingBooking?: Booking | null;
  initialDate?: string; // Pre-fills date when clicking empty calendar slot
  allBookings?: Booking[];
}

export const BookingFormModal: React.FC<BookingFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingBooking,
  initialDate,
  allBookings = [],
}) => {
  const [name, setName] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [vehicle, setVehicle] = useState<VehicleType>('Car');
  const [vehicleModel, setVehicleModel] = useState('Toyota Vios');
  const [plateNumber, setPlateNumber] = useState('');
  const [selfDrive, setSelfDrive] = useState(true);
  const [renterIsDriver, setRenterIsDriver] = useState(true);
  const [driverName, setDriverName] = useState('');
  const [driverBirthdate, setDriverBirthdate] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiration, setLicenseExpiration] = useState('');
  const [passengers, setPassengers] = useState<number | string>(2);
  const [isPickupPreset, setIsPickupPreset] = useState(true);
  const [startLocation, setStartLocation] = useState(PRESET_PICKUP_LOCATIONS[0]);
  const [destination, setDestination] = useState('');
  
  // Flexible Timing & Schedule state
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('20:00');
  const [durationHours, setDurationHours] = useState<number>(12);
  const [bookingMode, setBookingMode] = useState<'preset' | 'custom'>('preset');

  const [notes, setNotes] = useState('');
  const [colorTag, setColorTag] = useState('indigo');

  // Payment Form Fields
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'partial'>('partial');
  const [depositPaid, setDepositPaid] = useState<boolean>(true);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [downpaymentAmount, setDownpaymentAmount] = useState<string>('300');
  const [paymentMethod, setPaymentMethod] = useState<string>('GCash');
  const [paymentReference, setPaymentReference] = useState<string>('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Helper to sync end date/time given start and hours
  const calculateEndFromDuration = (sDate: string, sTime: string, hours: number) => {
    if (!sDate || !sTime || hours <= 0) return { endDate: sDate, endTime: sTime };
    const [y, m, d] = sDate.split('-').map(Number);
    const [h, min] = sTime.split(':').map(Number);
    const start = new Date(y, m - 1, d, h, min, 0, 0);
    const end = new Date(start.getTime() + (hours * 60 * 60 * 1000));
    return {
      endDate: toISODateString(end),
      endTime: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
    };
  };

  useEffect(() => {
    if (editingBooking) {
      setName(editingBooking.name);
      setMobileNo(editingBooking.mobileNo);
      setVehicle(editingBooking.vehicle);
      setVehicleModel(editingBooking.vehicleModel || (editingBooking.vehicle === 'Van' ? 'Toyota Hiace Commuter Van' : 'Toyota Vios'));
      setPlateNumber(editingBooking.plateNumber || '');
      setSelfDrive(editingBooking.selfDrive);
      setRenterIsDriver(editingBooking.renterIsDriver ?? (editingBooking.driverName && editingBooking.driverName !== editingBooking.name ? false : true));
      setDriverName(editingBooking.driverName || '');
      setDriverBirthdate(editingBooking.driverBirthdate || '');

      if (editingBooking.licenseNumber || editingBooking.licenseExpiration) {
        setLicenseNumber(editingBooking.licenseNumber || '');
        setLicenseExpiration(editingBooking.licenseExpiration || '');
      } else if (editingBooking.driversLicenseDetails) {
        const parts = editingBooking.driversLicenseDetails.split(/,\s*(?:Exp:?\s*|Expiration:?\s*)?/i);
        setLicenseNumber(parts[0] || editingBooking.driversLicenseDetails);
        setLicenseExpiration(parts[1] || '');
      } else {
        setLicenseNumber('');
        setLicenseExpiration('');
      }

      setPassengers(editingBooking.passengers);
      const existingStart = editingBooking.startLocation || '';
      setStartLocation(existingStart);
      if (existingStart && PRESET_PICKUP_LOCATIONS.includes(existingStart)) {
        setIsPickupPreset(true);
      } else if (existingStart) {
        setIsPickupPreset(false);
      } else {
        setIsPickupPreset(true);
        setStartLocation(PRESET_PICKUP_LOCATIONS[0]);
      }
      setDestination(editingBooking.destination);
      setStartDate(editingBooking.startDate);
      setStartTime(editingBooking.startTime || '08:00');

      // Handle duration & end date/time
      const sDate = editingBooking.startDate;
      const sTime = editingBooking.startTime || '08:00';
      if (editingBooking.endDate && editingBooking.endTime) {
        setEndDate(editingBooking.endDate);
        setEndTime(editingBooking.endTime);
        const [sy, sm, sd] = sDate.split('-').map(Number);
        const [sh, smin] = sTime.split(':').map(Number);
        const [ey, em, ed] = editingBooking.endDate.split('-').map(Number);
        const [eh, emin] = editingBooking.endTime.split(':').map(Number);
        const startDt = new Date(sy, sm - 1, sd, sh, smin, 0, 0);
        const endDt = new Date(ey, em - 1, ed, eh, emin, 0, 0);
        const calculatedHours = Math.max(1, Math.round(((endDt.getTime() - startDt.getTime()) / (1000 * 3600)) * 10) / 10);
        setDurationHours(calculatedHours);
        setBookingMode('custom');
      } else if (editingBooking.durationHours) {
        setDurationHours(editingBooking.durationHours);
        const { endDate: calculatedEndD, endTime: calculatedEndT } = calculateEndFromDuration(sDate, sTime, editingBooking.durationHours);
        setEndDate(calculatedEndD);
        setEndTime(calculatedEndT);
        setBookingMode('preset');
      } else {
        const days = editingBooking.noOfDays || 1;
        const hours = days * 24;
        setDurationHours(hours);
        const { endDate: calculatedEndD, endTime: calculatedEndT } = calculateEndFromDuration(sDate, sTime, hours);
        setEndDate(calculatedEndD);
        setEndTime(calculatedEndT);
        setBookingMode('preset');
      }

      setNotes(editingBooking.notes || '');
      setColorTag(editingBooking.colorTag || 'indigo');

      // Payment details
      const isDepPaid = editingBooking.depositPaid !== false && (
        editingBooking.depositPaid === true ||
        editingBooking.paymentStatus === 'paid' ||
        editingBooking.paymentStatus === 'partial' ||
        Boolean(editingBooking.downpaymentAmount)
      );
      setDepositPaid(isDepPaid);
      setPaymentStatus(editingBooking.paymentStatus || (isDepPaid ? 'partial' : 'pending'));
      setPaymentAmount(editingBooking.paymentAmount ? String(editingBooking.paymentAmount).replace(/[^0-9.]/g, '') : '');
      setDownpaymentAmount(editingBooking.downpaymentAmount ? String(editingBooking.downpaymentAmount).replace(/[^0-9.]/g, '') : (isDepPaid ? '300' : ''));
      setPaymentMethod(editingBooking.paymentMethod || 'GCash');
      setPaymentReference(editingBooking.paymentReference || '');
    } else {
      // Default reset for new booking
      const today = new Date();
      const defaultDateStr = initialDate || toISODateString(today);
      setName('');
      setMobileNo('');
      setVehicle('Car');
      setVehicleModel('Toyota Vios');
      setPlateNumber('');
      setSelfDrive(true);
      setRenterIsDriver(true);
      setDriverName('');
      setDriverBirthdate('');
      setLicenseNumber('');
      setLicenseExpiration('');
      setPassengers(2);
      setIsPickupPreset(true);
      setStartLocation(PRESET_PICKUP_LOCATIONS[0]);
      setDestination('');
      setStartDate(defaultDateStr);
      setStartTime('08:00');

      // Default 12 hours preset (₱1,000)
      const defaultHours = 12;
      setDurationHours(defaultHours);
      const { endDate: calculatedEndD, endTime: calculatedEndT } = calculateEndFromDuration(defaultDateStr, '08:00', defaultHours);
      setEndDate(calculatedEndD);
      setEndTime(calculatedEndT);
      setBookingMode('preset');

      setNotes('');
      setColorTag(getRandomColorTag());

      // Payment default: Customer pays ₱300 deposit to secure booking
      setDepositPaid(true);
      setPaymentStatus('partial');
      setPaymentAmount(String(getSuggestedRate(defaultHours)));
      setDownpaymentAmount('300');
      setPaymentMethod('GCash');
      setPaymentReference('');
    }
    setErrors({});
  }, [editingBooking, initialDate, isOpen]);

  // Handle deposit toggle in booking form
  const handleToggleDepositPaid = (checked: boolean) => {
    setDepositPaid(checked);
    if (checked) {
      if (!downpaymentAmount || downpaymentAmount === '0' || downpaymentAmount === '') {
        setDownpaymentAmount('300');
      }
      if (paymentStatus === 'pending') {
        setPaymentStatus('partial');
      }
    } else {
      if (paymentStatus === 'partial') {
        setPaymentStatus('pending');
      }
      setDownpaymentAmount('');
    }
  };

  // Handle Preset Button Clicks
  const handleSelectPresetHours = (hours: number) => {
    setDurationHours(hours);
    setBookingMode('preset');
    const { endDate: calculatedEndD, endTime: calculatedEndT } = calculateEndFromDuration(startDate, startTime, hours);
    setEndDate(calculatedEndD);
    setEndTime(calculatedEndT);

    // Auto-suggest payment amount if currently empty or if it was matched to a standard rate
    const suggested = getSuggestedRate(hours);
    if (!paymentAmount || paymentAmount === '1000' || paymentAmount === '1300' || paymentAmount === '1500' || paymentAmount === '3000' || paymentAmount === '4500') {
      setPaymentAmount(String(suggested));
    }
  };

  // When Start Date or Start Time changes, update End Date/Time if in preset mode
  const handleStartDateChange = (newDate: string) => {
    setStartDate(newDate);
    if (bookingMode === 'preset' || !endDate) {
      const { endDate: calculatedEndD, endTime: calculatedEndT } = calculateEndFromDuration(newDate, startTime, durationHours);
      setEndDate(calculatedEndD);
      setEndTime(calculatedEndT);
    }
  };

  const handleStartTimeChange = (newTime: string) => {
    setStartTime(newTime);
    if (bookingMode === 'preset' || !endTime) {
      const { endDate: calculatedEndD, endTime: calculatedEndT } = calculateEndFromDuration(startDate, newTime, durationHours);
      setEndDate(calculatedEndD);
      setEndTime(calculatedEndT);
    }
  };

  // When Custom End Date or Time changes
  const handleEndDateChange = (newEndDate: string) => {
    setEndDate(newEndDate);
    setBookingMode('custom');
    recalculateDuration(startDate, startTime, newEndDate, endTime);
  };

  const handleEndTimeChange = (newEndTime: string) => {
    setEndTime(newEndTime);
    setBookingMode('custom');
    recalculateDuration(startDate, startTime, endDate, newEndTime);
  };

  const recalculateDuration = (sD: string, sT: string, eD: string, eT: string) => {
    if (!sD || !sT || !eD || !eT) return;
    try {
      const [sy, sm, sd] = sD.split('-').map(Number);
      const [sh, smin] = sT.split(':').map(Number);
      const [ey, em, ed] = eD.split('-').map(Number);
      const [eh, emin] = eT.split(':').map(Number);
      const startDt = new Date(sy, sm - 1, sd, sh, smin, 0, 0);
      const endDt = new Date(ey, em - 1, ed, eh, emin, 0, 0);
      const diffMs = endDt.getTime() - startDt.getTime();
      if (diffMs > 0) {
        const hours = Math.round((diffMs / (1000 * 3600)) * 10) / 10;
        setDurationHours(hours);
      }
    } catch {
      // ignore
    }
  };

  // When vehicle changes to Van, strictly force selfDrive = false and update default model
  const handleVehicleChange = (newVehicle: VehicleType) => {
    setVehicle(newVehicle);
    if (newVehicle === 'Van') {
      setSelfDrive(false);
      setLicenseNumber('');
      setLicenseExpiration('');
      setVehicleModel('Toyota Hiace Commuter Van');
      if (Number(passengers) < 6) setPassengers(8);
    } else {
      setSelfDrive(true);
      setVehicleModel('Toyota Vios');
      if (Number(passengers) > 7) setPassengers(4);
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim()) errs.name = 'Full name is required';
    if (!mobileNo.trim()) errs.mobileNo = 'Mobile number is required';
    if (!startLocation.trim()) errs.startLocation = 'Start location is required';
    if (!destination.trim()) errs.destination = 'Destination is required';
    if (!startDate) errs.startDate = 'Start date is required';
    if (!startTime) errs.startTime = 'Start time is required';
    if (!endDate) errs.endDate = 'End date is required';
    if (!endTime) errs.endTime = 'End time is required';

    // Validate end is after start
    if (startDate && startTime && endDate && endTime) {
      const [sy, sm, sd] = startDate.split('-').map(Number);
      const [sh, smin] = startTime.split(':').map(Number);
      const [ey, em, ed] = endDate.split('-').map(Number);
      const [eh, emin] = endTime.split(':').map(Number);
      const startDt = new Date(sy, sm - 1, sd, sh, smin, 0, 0);
      const endDt = new Date(ey, em - 1, ed, eh, emin, 0, 0);
      if (endDt.getTime() <= startDt.getTime()) {
        errs.endTime = 'End date and time must be after start date and time';
      }
    }

    if (durationHours <= 0) {
      errs.durationHours = 'Rental duration must be at least 1 hour';
    }

    const parsedPax = Number(passengers);
    if (!passengers || isNaN(parsedPax) || parsedPax < 1) {
      errs.passengers = 'Must have at least 1 passenger';
    } else {
      if (vehicle === 'Car' && parsedPax > 7) {
        errs.passengers = 'Standard cars allow a maximum of 7 passengers';
      }
      if (vehicle === 'Van' && parsedPax > 18) {
        errs.passengers = 'Vans allow a maximum of 18 passengers';
      }
    }

    // Driver's license validation when selfDrive is true (only on Car)
    if (vehicle === 'Car' && selfDrive) {
      if (!licenseNumber.trim()) {
        errs.licenseNumber = 'License number is required for self-drive';
      }
      if (!licenseExpiration.trim()) {
        errs.licenseExpiration = 'Expiration date is required for self-drive';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const formattedLicenseDetails = vehicle === 'Car' && selfDrive && licenseNumber.trim()
      ? `${licenseNumber.trim()}${licenseExpiration.trim() ? `, Exp: ${licenseExpiration.trim()}` : ''}`
      : undefined;

    const parsedPaymentAmount = paymentAmount ? parseFloat(paymentAmount) || paymentAmount : undefined;
    const parsedDownpayment = depositPaid
      ? (downpaymentAmount ? parseFloat(downpaymentAmount) || 300 : 300)
      : undefined;

    const totalNum = typeof parsedPaymentAmount === 'number' ? parsedPaymentAmount : parseFloat(String(parsedPaymentAmount || '0')) || 0;
    const depositNum = typeof parsedDownpayment === 'number' ? parsedDownpayment : 0;
    const calcRemaining = paymentStatus === 'paid' ? 0 : Math.max(0, totalNum - depositNum);

    const calculatedDays = Math.max(1, Math.ceil(durationHours / 24));

    const bookingData: Booking = {
      id: editingBooking ? editingBooking.id : generateBookingId(),
      name: name.trim(),
      mobileNo: mobileNo.trim(),
      vehicle,
      vehicleModel: vehicle === 'Car' ? 'Toyota Vios' : 'Toyota Hiace Commuter Van',
      plateNumber: plateNumber.trim(),
      selfDrive: vehicle === 'Van' ? false : selfDrive,
      renterIsDriver: vehicle === 'Car' && selfDrive ? renterIsDriver : undefined,
      driverName: vehicle === 'Car' && selfDrive ? (renterIsDriver ? name.trim() : (driverName.trim() || name.trim())) : undefined,
      driverBirthdate: vehicle === 'Car' && selfDrive ? (driverBirthdate.trim() || undefined) : undefined,
      licenseNumber: vehicle === 'Car' && selfDrive ? licenseNumber.trim() : undefined,
      licenseExpiration: vehicle === 'Car' && selfDrive ? licenseExpiration.trim() : undefined,
      driversLicenseDetails: formattedLicenseDetails,
      passengers: Number(passengers),
      startLocation: startLocation.trim(),
      destination: destination.trim(),
      startDate,
      startTime,
      endDate,
      endTime,
      durationHours,
      noOfDays: calculatedDays,
      notes: notes.trim() || undefined,
      colorTag,
      depositPaid,
      depositAmount: 300,
      paymentStatus,
      paymentAmount: parsedPaymentAmount,
      downpaymentAmount: parsedDownpayment,
      remainingBalance: calcRemaining,
      paymentMethod,
      paymentReference: paymentReference.trim() || undefined,
      paidAt: paymentStatus === 'paid' ? (editingBooking?.paidAt || new Date().toISOString()) : undefined,
      trackingToken: editingBooking?.trackingToken || generateTrackingToken(),
      createdAt: editingBooking ? editingBooking.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSubmit(bookingData);
  };

  // Real-time calculated suggested rate & conflicts
  const calculatedSuggestedRate = useMemo(() => {
    return getSuggestedRate(durationHours);
  }, [durationHours]);

  const activeConflict = useMemo(() => {
    if (!allBookings || allBookings.length === 0 || !startDate || !startTime || !endDate || !endTime) return null;
    return checkBookingConflicts(
      {
        id: editingBooking?.id,
        startDate,
        startTime,
        endDate,
        endTime,
        durationHours,
        vehicle,
      },
      allBookings,
      true,
      true
    );
  }, [allBookings, startDate, startTime, endDate, endTime, durationHours, vehicle, editingBooking?.id]);

  if (!isOpen) return null;

  return (
    <div
      id="booking-form-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/50 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        id="booking-form-modal-card"
        className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-none">
                {editingBooking ? 'Edit Booking' : 'New Vehicle Booking'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Flexible duration scheduling with mandatory {TURNOVER_CLEANING_HOURS}-hour cleaning buffer
              </p>
            </div>
          </div>
          <button
            id="close-booking-form-modal-btn"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Section: Customer Information */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              1. Customer Information
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="booking-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Juan Dela Cruz"
                  className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium ${
                    errors.name ? 'border-red-400' : 'border-slate-200'
                  }`}
                />
                {errors.name && <p className="text-[11px] text-red-600 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="booking-mobile-input"
                  type="tel"
                  required
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value)}
                  placeholder="0917-XXX-XXXX"
                  className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${
                    errors.mobileNo ? 'border-red-400' : 'border-slate-200'
                  }`}
                />
                {errors.mobileNo && <p className="text-[11px] text-red-600 mt-1">{errors.mobileNo}</p>}
              </div>
            </div>
          </div>

          {/* Section: Vehicle & Rental Mode */}
          <div className="pt-2 border-t border-slate-100">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-slate-400" />
              2. Vehicle & Drive Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Vehicle Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Car', 'Van'] as VehicleType[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleVehicleChange(v)}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                        vehicle === v
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Car className="w-3.5 h-3.5" />
                      {v === 'Car' ? 'Car (Sedan)' : 'Van (Hiace)'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Plate Number
                </label>
                <input
                  type="text"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value)}
                  placeholder="e.g. NBF 1234"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Passengers <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={vehicle === 'Car' ? 7 : 18}
                  value={passengers}
                  onChange={(e) => setPassengers(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            {/* Self Drive vs With Driver */}
            {vehicle === 'Car' ? (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">Self-Drive Rental Option</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelfDrive(!selfDrive)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      selfDrive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {selfDrive ? 'Self-Drive (Client Driving)' : 'With Company Driver'}
                  </button>
                </div>

                {selfDrive && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Driver's License # <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        placeholder="e.g. DL-12345678"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                      />
                      {errors.licenseNumber && <p className="text-[10px] text-red-600 mt-0.5">{errors.licenseNumber}</p>}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        License Expiration <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={licenseExpiration}
                        onChange={(e) => setLicenseExpiration(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                      {errors.licenseExpiration && <p className="text-[10px] text-red-600 mt-0.5">{errors.licenseExpiration}</p>}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2.5 p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-lg text-xs text-blue-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Toyota Hiace Commuter Van is strictly operated <strong>With Professional Driver</strong> included.</span>
              </div>
            )}
          </div>

          {/* Section: Route & Location */}
          <div className="pt-2 border-t border-slate-100">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              3. Route & Locations
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Pick-up Location <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPickupPreset(!isPickupPreset);
                      if (isPickupPreset) {
                        setStartLocation('');
                      } else {
                        setStartLocation(PRESET_PICKUP_LOCATIONS[0]);
                      }
                    }}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
                  >
                    {isPickupPreset ? 'Enter Custom Address' : 'Use Garage Preset'}
                  </button>
                </div>

                {isPickupPreset ? (
                  <select
                    value={startLocation}
                    onChange={(e) => setStartLocation(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    {PRESET_PICKUP_LOCATIONS.map((loc, idx) => (
                      <option key={idx} value={loc}>{loc}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={startLocation}
                    onChange={(e) => setStartLocation(e.target.value)}
                    placeholder="Enter custom pick-up address..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
                {errors.startLocation && <p className="text-[11px] text-red-600 mt-1">{errors.startLocation}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Destination / Drop-off <span className="text-red-500">*</span>
                </label>
                <input
                  id="booking-destination-input"
                  type="text"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Baguio City, NAIA Terminal 3, Pangasinan"
                  className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium ${
                    errors.destination ? 'border-red-400' : 'border-slate-200'
                  }`}
                />
                {errors.destination && <p className="text-[11px] text-red-600 mt-1">{errors.destination}</p>}
              </div>
            </div>
          </div>

          {/* Section: Flexible Schedule & Duration with Rate Helper */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                4. Schedule & Flexible Duration
              </label>
              <span className="text-[11px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 font-bold">
                {formatDurationDisplay(durationHours)}
              </span>
            </div>

            {/* Quick Duration Preset Tier Buttons */}
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Standard Duration Presets & Rates:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectPresetHours(12)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    durationHours === 12 && bookingMode === 'preset'
                      ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-600 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">12 Hours</span>
                    {durationHours === 12 && bookingMode === 'preset' && <Check className="w-3 h-3 text-blue-600" />}
                  </div>
                  <span className="text-[11px] font-mono font-bold text-blue-600 block mt-0.5">₱1,000</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPresetHours(18)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    durationHours === 18 && bookingMode === 'preset'
                      ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-600 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">18 Hours</span>
                    {durationHours === 18 && bookingMode === 'preset' && <Check className="w-3 h-3 text-blue-600" />}
                  </div>
                  <span className="text-[11px] font-mono font-bold text-blue-600 block mt-0.5">₱1,300</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPresetHours(24)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    durationHours === 24 && bookingMode === 'preset'
                      ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-600 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">24h (1 Day)</span>
                    {durationHours === 24 && bookingMode === 'preset' && <Check className="w-3 h-3 text-blue-600" />}
                  </div>
                  <span className="text-[11px] font-mono font-bold text-blue-600 block mt-0.5">₱1,500</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPresetHours(48)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    durationHours === 48 && bookingMode === 'preset'
                      ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-600 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">2 Days (48h)</span>
                    {durationHours === 48 && bookingMode === 'preset' && <Check className="w-3 h-3 text-blue-600" />}
                  </div>
                  <span className="text-[11px] font-mono font-bold text-blue-600 block mt-0.5">₱3,000</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBookingMode('custom');
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all col-span-2 sm:col-span-1 ${
                    bookingMode === 'custom'
                      ? 'bg-purple-50 border-purple-600 ring-1 ring-purple-600 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Custom Time</span>
                    {bookingMode === 'custom' && <Edit3 className="w-3 h-3 text-purple-600" />}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Pick any hours</span>
                </button>
              </div>
            </div>

            {/* Date & Time Input Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {/* Departure Start */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span>Start / Pick-Up Schedule</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="booking-startdate-input"
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="booking-starttime-input"
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Scheduled Return / End */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span>Return / Drop-off Schedule</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 font-normal">
                    {durationHours} hrs total
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Return Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="booking-enddate-input"
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Return Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="booking-endtime-input"
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => handleEndTimeChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>
                {errors.endTime && <p className="text-[10px] text-red-600">{errors.endTime}</p>}
              </div>
            </div>

            {/* Live Buffer & Turnaround Banner */}
            {startDate && startTime && endDate && endTime && (
              <div className="space-y-2">
                <div className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-slate-400 text-[10px] block uppercase font-mono">Scheduled Vehicle Return</span>
                      <strong className="text-white font-mono text-xs">
                        {formatDateOnly(endDate)} at {formatTimeOnly(endTime)} ({formatDurationDisplay(durationHours)})
                      </strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px] text-slate-300">
                      Cleaning Buffer: Next pickup ready <strong className="text-emerald-400 font-mono">{formatTimeOnly(getBookingTurnaroundReadyDateTime({ startDate, startTime, endDate, endTime, durationHours }))}</strong>
                    </span>
                  </div>
                </div>

                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Mandatory {TURNOVER_CLEANING_HOURS}-Hour Cleaning Buffer:</strong> Every vehicle undergoes a 3-hour turnaround & sanitization buffer upon return before the next customer reservation can commence.
                  </p>
                </div>
              </div>
            )}

            {/* Real-time Conflict Overlap & Buffer Warning */}
            {activeConflict?.hasConflict && (
              <div className="p-3.5 bg-red-50 border border-red-300 rounded-xl text-xs text-red-900 space-y-2 animate-fade-in">
                <div className="flex items-center gap-1.5 font-bold text-red-950">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>
                    {activeConflict.isBufferConflict 
                      ? 'Turnover Buffer Conflict (3-Hour Cleaning Window)' 
                      : 'Direct Schedule Overlap Conflict'}
                  </span>
                </div>
                {activeConflict.reason && (
                  <p className="text-[11px] text-red-800 leading-relaxed font-medium">
                    {activeConflict.reason}
                  </p>
                )}
                <div className="space-y-1 pt-1.5 border-t border-red-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 block">
                    Conflicting Reservations:
                  </span>
                  {activeConflict.conflictingBookings.map((cb) => (
                    <div key={cb.id} className="text-[11px] font-mono text-red-950 flex items-center justify-between bg-white/70 px-2 py-1 rounded border border-red-200">
                      <span className="font-bold">{cb.name}</span>
                      <span>
                        {formatDateOnly(cb.startDate)} {formatTimeOnly(cb.startTime)} → {formatTimeOnly(cb.endTime || getBookingEndDateTime(cb))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section: Billing & Settlement with ₱300 Deposit Security & Rate Helper */}
          <div className="pt-3 border-t border-slate-200 space-y-3 bg-slate-50/70 p-3.5 rounded-xl border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Billing & Settlement (₱300 Deposit Workflow)</span>
              </label>

              {/* Rate Helper Suggested Action Pill & Status Selector */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentAmount(String(calculatedSuggestedRate))}
                  className="px-2.5 py-1 text-[11px] font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg border border-blue-300 transition-colors flex items-center gap-1 shrink-0"
                  title="Click to apply standard suggested rate based on booked hours"
                >
                  <DollarSign className="w-3 h-3 text-blue-600" />
                  Suggested: ₱{calculatedSuggestedRate.toLocaleString()} ({formatDurationDisplay(durationHours)})
                </button>

                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs shrink-0">
                  {(['pending', 'paid', 'partial'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setPaymentStatus(status)}
                      className={`px-2 py-0.5 text-[10px] font-mono uppercase font-bold rounded transition-all ${
                        paymentStatus === status
                          ? status === 'paid'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : status === 'partial'
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'bg-amber-500 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mandatory Deposit (₱300) Component - Tells booking form if customer paid deposit to secure vehicle */}
            <div
              id="booking-deposit-workflow-card"
              className={`p-3 rounded-xl border transition-all ${
                depositPaid
                  ? 'bg-emerald-50/90 border-emerald-300 shadow-2xs'
                  : 'bg-amber-50/80 border-amber-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="deposit-paid-checkbox"
                    checked={depositPaid}
                    onChange={(e) => handleToggleDepositPaid(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer accent-emerald-600"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">
                        Customer Paid ₱300 Security Deposit
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          depositPaid
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {depositPaid ? 'Vehicle Secured' : 'Unpaid / Incomplete Deposit'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      {depositPaid
                        ? 'Deposit received! The vehicle is locked in. The ₱300 deposit will be automatically deducted from the total fee.'
                        : 'Customer must pay the ₱300 deposit to secure the reservation.'}
                    </p>
                  </div>
                </label>

                {depositPaid && (
                  <div className="flex items-center gap-1.5 shrink-0 bg-white/90 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                    <label className="text-[10px] font-bold text-emerald-800 uppercase">
                      Deposit Amount:
                    </label>
                    <span className="text-xs font-mono font-bold text-emerald-900">₱</span>
                    <input
                      type="number"
                      value={downpaymentAmount}
                      onChange={(e) => setDownpaymentAmount(e.target.value)}
                      placeholder="300"
                      className="w-16 px-1 py-0.5 text-xs bg-white border border-emerald-300 rounded font-mono font-bold text-emerald-900 text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* Dynamic Live Fee Calculation Strip */}
              {(() => {
                const totalVal = parseFloat(paymentAmount) || calculatedSuggestedRate || 0;
                const depositVal = depositPaid ? (parseFloat(downpaymentAmount) || 300) : 0;
                const balanceVal = paymentStatus === 'paid' ? 0 : Math.max(0, totalVal - depositVal);

                return (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                    <div className="p-1.5 bg-white/90 rounded-lg border border-slate-200">
                      <span className="text-[9px] uppercase text-slate-500 font-sans block font-semibold">
                        Total Rental Fee
                      </span>
                      <span className="font-bold text-slate-900 block">
                        ₱{totalVal.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-1.5 bg-white/90 rounded-lg border border-emerald-200">
                      <span className="text-[9px] uppercase text-emerald-700 font-sans font-bold block">
                        Less Deposit Paid
                      </span>
                      <span className="font-bold text-emerald-700 block">
                        {depositPaid ? `-₱${depositVal.toLocaleString()}` : '₱0'}
                      </span>
                    </div>
                    <div className="p-1.5 bg-blue-50/90 rounded-lg border border-blue-200">
                      <span className="text-[9px] uppercase text-blue-700 font-sans font-bold block">
                        {paymentStatus === 'paid' ? 'Fully Settled' : 'Balance to Collect'}
                      </span>
                      <span className="font-bold text-blue-900 block">
                        {paymentStatus === 'paid' ? '₱0' : `₱${balanceVal.toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Total Rental Amount (₱)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₱</span>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="e.g. 1000, 1300, 1500"
                    className="w-full pl-7 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-slate-900"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Admin can override any custom rate
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                >
                  <option value="GCash">GCash</option>
                  <option value="Maya">Maya</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="QRPh">QRPh</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Reference # / Receipt
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. Ref 9821..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section: Notes & Tag Color */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Internal Notes / Requests
              </label>
              <textarea
                id="booking-notes-input"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Flexible pick-up note, child seat, special request..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Calendar Ribbon Accent
              </label>
              <div className="flex items-center gap-2 pt-1">
                {['indigo', 'emerald', 'amber', 'rose', 'sky', 'violet', 'teal'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setColorTag(tag)}
                    className={`w-6 h-6 rounded-md border-2 transition-all ${
                      colorTag === tag ? 'scale-110 ring-2 ring-blue-600 ring-offset-2 border-white shadow-xs' : 'border-transparent opacity-70 hover:opacity-100'
                    } ${
                      tag === 'indigo' ? 'bg-blue-600' :
                      tag === 'emerald' ? 'bg-emerald-600' :
                      tag === 'amber' ? 'bg-amber-500' :
                      tag === 'rose' ? 'bg-rose-500' :
                      tag === 'sky' ? 'bg-sky-500' :
                      tag === 'violet' ? 'bg-purple-600' : 'bg-teal-600'
                    }`}
                    aria-label={`Select color ${tag}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
            <button
              id="cancel-booking-form-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 sm:py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-xs text-center"
            >
              Cancel
            </button>
            <button
              id="submit-booking-form-btn"
              type="submit"
              className="px-5 py-2.5 sm:py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-md shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
              <span>{editingBooking ? 'Save Changes' : 'Confirm & Schedule Booking'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
