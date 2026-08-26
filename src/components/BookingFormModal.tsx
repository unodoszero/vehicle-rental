import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Clock, MapPin, Phone, User, Users, Car, 
  ShieldCheck, FileText, AlertCircle, Info, Sparkles, Hash
} from 'lucide-react';
import { Booking, VehicleType } from '../types';
import { generateBookingId, getRandomColorTag } from '../utils/storage';
import { getBookingStartDateTime, getBookingEndDateTime, formatDateTime, toISODateString } from '../utils/dateUtils';

interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (bookingData: Booking, isOverride?: boolean) => void;
  editingBooking?: Booking | null;
  initialDate?: string; // Pre-fills date when clicking empty calendar slot
}

export const BookingFormModal: React.FC<BookingFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingBooking,
  initialDate,
}) => {
  const [name, setName] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [vehicle, setVehicle] = useState<VehicleType>('Car');
  const [vehicleModel, setVehicleModel] = useState('Toyota Vios');
  const [plateNumber, setPlateNumber] = useState('');
  const [selfDrive, setSelfDrive] = useState(true);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiration, setLicenseExpiration] = useState('');
  const [passengers, setPassengers] = useState<number>(2);
  const [startLocation, setStartLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [noOfDays, setNoOfDays] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [colorTag, setColorTag] = useState('indigo');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingBooking) {
      setName(editingBooking.name);
      setMobileNo(editingBooking.mobileNo);
      setVehicle(editingBooking.vehicle);
      setVehicleModel(editingBooking.vehicleModel || (editingBooking.vehicle === 'Van' ? 'Toyota Hiace Commuter Van' : 'Toyota Vios'));
      setPlateNumber(editingBooking.plateNumber || '');
      setSelfDrive(editingBooking.selfDrive);

      // Handle split license fields or backward compatibility from driversLicenseDetails
      if (editingBooking.licenseNumber || editingBooking.licenseExpiration) {
        setLicenseNumber(editingBooking.licenseNumber || '');
        setLicenseExpiration(editingBooking.licenseExpiration || '');
      } else if (editingBooking.driversLicenseDetails) {
        // Attempt to parse existing combined strings like "DL-8893021, Exp: 01/01/2030"
        const parts = editingBooking.driversLicenseDetails.split(/,\s*(?:Exp:?\s*|Expiration:?\s*)?/i);
        setLicenseNumber(parts[0] || editingBooking.driversLicenseDetails);
        setLicenseExpiration(parts[1] || '');
      } else {
        setLicenseNumber('');
        setLicenseExpiration('');
      }

      setPassengers(editingBooking.passengers);
      setStartLocation(editingBooking.startLocation);
      setDestination(editingBooking.destination);
      setStartDate(editingBooking.startDate);
      setStartTime(editingBooking.startTime);
      setNoOfDays(editingBooking.noOfDays);
      setNotes(editingBooking.notes || '');
      setColorTag(editingBooking.colorTag || 'indigo');
    } else {
      // Default reset
      const today = new Date();
      const defaultDateStr = initialDate || toISODateString(today);
      setName('');
      setMobileNo('');
      setVehicle('Car');
      setVehicleModel('Toyota Vios');
      setPlateNumber('');
      setSelfDrive(true);
      setLicenseNumber('');
      setLicenseExpiration('');
      setPassengers(2);
      setStartLocation('');
      setDestination('');
      setStartDate(defaultDateStr);
      setStartTime('09:00');
      setNoOfDays(1);
      setNotes('');
      setColorTag(getRandomColorTag());
    }
    setErrors({});
  }, [editingBooking, initialDate, isOpen]);

  // When vehicle changes to Van, strictly force selfDrive = false and update default model
  const handleVehicleChange = (newVehicle: VehicleType) => {
    setVehicle(newVehicle);
    if (newVehicle === 'Van') {
      setSelfDrive(false);
      setLicenseNumber('');
      setLicenseExpiration('');
      setVehicleModel('Toyota Hiace Commuter Van');
      if (passengers < 6) setPassengers(8);
    } else {
      setSelfDrive(true);
      setVehicleModel('Toyota Vios');
      if (passengers > 7) setPassengers(4);
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
    if (!noOfDays || noOfDays < 1) errs.noOfDays = 'Minimum duration is 1 day';
    if (!passengers || passengers < 1) errs.passengers = 'Must have at least 1 passenger';

    // Van passenger safety check
    if (vehicle === 'Car' && passengers > 7) {
      errs.passengers = 'Standard cars allow a maximum of 7 passengers';
    }
    if (vehicle === 'Van' && passengers > 18) {
      errs.passengers = 'Vans allow a maximum of 18 passengers';
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

    const bookingData: Booking = {
      id: editingBooking ? editingBooking.id : generateBookingId(),
      name: name.trim(),
      mobileNo: mobileNo.trim(),
      vehicle,
      vehicleModel: vehicle === 'Car' ? 'Toyota Vios' : 'Toyota Hiace Commuter Van',
      plateNumber: plateNumber.trim(),
      selfDrive: vehicle === 'Van' ? false : selfDrive,
      licenseNumber: vehicle === 'Car' && selfDrive ? licenseNumber.trim() : undefined,
      licenseExpiration: vehicle === 'Car' && selfDrive ? licenseExpiration.trim() : undefined,
      driversLicenseDetails: formattedLicenseDetails,
      passengers: Number(passengers),
      startLocation: startLocation.trim(),
      destination: destination.trim(),
      startDate,
      startTime,
      noOfDays: Number(noOfDays),
      notes: notes.trim() || undefined,
      colorTag,
      createdAt: editingBooking ? editingBooking.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSubmit(bookingData);
  };

  if (!isOpen) return null;

  // Real-time calculated end preview
  let calculatedEndPreview = '';
  if (startDate && startTime && noOfDays >= 1) {
    try {
      const endDt = getBookingEndDateTime({ startDate, startTime, noOfDays });
      calculatedEndPreview = formatDateTime(endDt);
    } catch {
      calculatedEndPreview = '';
    }
  }

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
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {editingBooking ? 'Modify Booking Details' : 'Create Vehicle Booking'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {editingBooking ? `Editing booking #${editingBooking.id}` : 'Fleet operations schedule & dispatch'}
              </p>
            </div>
          </div>
          <button
            id="close-booking-form-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Section: Customer Information */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              1. Customer Information
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Customer Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="booking-name-input"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Juan Dela Cruz"
                    className={`w-full pl-9 pr-3 py-2.5 text-base sm:text-xs bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      errors.name ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-200'
                    }`}
                  />
                </div>
                {errors.name && <p className="text-[11px] text-red-600 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="booking-mobile-input"
                    type="tel"
                    required
                    value={mobileNo}
                    onChange={(e) => setMobileNo(e.target.value)}
                    placeholder="09123456789"
                    className={`w-full pl-9 pr-3 py-2.5 text-base sm:text-xs bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      errors.mobileNo ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-200'
                    }`}
                  />
                </div>
                {errors.mobileNo && <p className="text-[11px] text-red-600 mt-1">{errors.mobileNo}</p>}
              </div>
            </div>
          </div>

          {/* Section: Vehicle & Driver Configuration */}
          <div className="pt-2 border-t border-slate-100">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-slate-400" />
              2. Vehicle & Chauffeur Settings
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Vehicle Type Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Vehicle Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="booking-vehicle-select"
                  value={vehicle}
                  onChange={(e) => handleVehicleChange(e.target.value as VehicleType)}
                  className="w-full px-3 py-2.5 text-base sm:text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                >
                  <option value="Car">Car (Self-Drive Allowed)</option>
                  <option value="Van">Van (Chauffeur Only)</option>
                </select>
              </div>

              {/* Uneditable Model field with label 'Model' */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Model
                </label>
                <input
                  id="booking-model-input"
                  type="text"
                  readOnly
                  disabled
                  value={vehicle === 'Car' ? 'Toyota Vios' : 'Toyota Hiace Commuter Van'}
                  className="w-full px-3 py-2.5 text-base sm:text-xs bg-slate-100/90 border border-slate-200 rounded-lg text-slate-700 font-semibold cursor-not-allowed select-none"
                />
              </div>

              {/* Passenger Count */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Passengers <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="booking-passengers-input"
                    type="number"
                    min="1"
                    max={vehicle === 'Car' ? 7 : 18}
                    required
                    value={passengers}
                    onChange={(e) => setPassengers(Number(e.target.value))}
                    className={`w-full pl-9 pr-3 py-2.5 text-base sm:text-xs bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${
                      errors.passengers ? 'border-red-400' : 'border-slate-200'
                    }`}
                  />
                </div>
                {errors.passengers && <p className="text-[11px] text-red-600 mt-1">{errors.passengers}</p>}
              </div>
            </div>

            {/* Self-Drive / Driver Rule Section */}
            <div className="mt-3">
              {vehicle === 'Car' ? (
                <div className="p-3.5 bg-blue-50/50 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900">Self-Drive Rental</span>
                      <p className="text-[11px] text-slate-500">
                        Check if the customer will drive the vehicle themselves.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="booking-selfdrive-toggle"
                        type="checkbox"
                        checked={selfDrive}
                        onChange={(e) => setSelfDrive(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Divided License Section: License Number & Expiration Date */}
                  {selfDrive && (
                    <div className="mt-3 pt-3 border-t border-blue-100 animate-fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* License Number Field */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                            License Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="booking-license-no-input"
                            type="text"
                            required={selfDrive}
                            value={licenseNumber}
                            onChange={(e) => setLicenseNumber(e.target.value)}
                            placeholder="DL-8893021"
                            className={`w-full px-3 py-2.5 text-base sm:text-xs bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors.licenseNumber ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-200'
                            }`}
                          />
                          {errors.licenseNumber && (
                            <p className="text-[11px] text-red-600 mt-1">{errors.licenseNumber}</p>
                          )}
                        </div>

                        {/* Expiration Date Field */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-600" />
                            Expiration Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="booking-license-exp-input"
                            type="text"
                            required={selfDrive}
                            value={licenseExpiration}
                            onChange={(e) => setLicenseExpiration(e.target.value)}
                            placeholder="01/01/2030"
                            className={`w-full px-3 py-2.5 text-base sm:text-xs bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors.licenseExpiration ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-200'
                            }`}
                          />
                          {errors.licenseExpiration && (
                            <p className="text-[11px] text-red-600 mt-1">{errors.licenseExpiration}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Van Notice - Strictly with Driver */
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3 text-xs text-slate-700">
                  <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900">Company Chauffeur Included (Mandatory)</span>
                    <p className="mt-0.5 text-slate-600 leading-relaxed">
                      Vans are strictly dispatched with a certified company driver for passenger safety and regulatory compliance. Self-drive is disabled for all van reservations.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Route & Location */}
          <div className="pt-2 border-t border-slate-100">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              3. Route Details
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Start Location <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="booking-startlocation-input"
                    type="text"
                    required
                    value={startLocation}
                    onChange={(e) => setStartLocation(e.target.value)}
                    placeholder="Tarlac City, Tarlac"
                    className={`w-full pl-9 pr-3 py-2.5 text-base sm:text-xs bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.startLocation ? 'border-red-400' : 'border-slate-200'
                    }`}
                  />
                </div>
                {errors.startLocation && <p className="text-[11px] text-red-600 mt-1">{errors.startLocation}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Destination <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="booking-destination-input"
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="San Fernando, Pampanga"
                    className={`w-full pl-9 pr-3 py-2.5 text-base sm:text-xs bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.destination ? 'border-red-400' : 'border-slate-200'
                    }`}
                  />
                </div>
                {errors.destination && <p className="text-[11px] text-red-600 mt-1">{errors.destination}</p>}
              </div>
            </div>
          </div>

          {/* Section: Date, Time & Multi-day Duration */}
          <div className="pt-2 border-t border-slate-100">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              4. Schedule & Duration
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Start Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="booking-startdate-input"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full px-3 py-2.5 text-base sm:text-xs bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${
                    errors.startDate ? 'border-red-400' : 'border-slate-200'
                  }`}
                />
                {errors.startDate && <p className="text-[11px] text-red-600 mt-1">{errors.startDate}</p>}
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  id="booking-starttime-input"
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={`w-full px-3 py-2.5 text-base sm:text-xs bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${
                    errors.startTime ? 'border-red-400' : 'border-slate-200'
                  }`}
                />
                {errors.startTime && <p className="text-[11px] text-red-600 mt-1">{errors.startTime}</p>}
              </div>

              {/* Number of Days */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  No. of Days <span className="text-red-500">*</span>
                </label>
                <input
                  id="booking-noofdays-input"
                  type="number"
                  min="1"
                  max="60"
                  step="1"
                  required
                  value={noOfDays}
                  onChange={(e) => setNoOfDays(Math.max(1, Number(e.target.value)))}
                  className={`w-full px-3 py-2.5 text-base sm:text-xs bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${
                    errors.noOfDays ? 'border-red-400' : 'border-slate-200'
                  }`}
                />
                {errors.noOfDays && <p className="text-[11px] text-red-600 mt-1">{errors.noOfDays}</p>}
              </div>
            </div>

            {/* Calculated Return Time Preview Pill */}
            {calculatedEndPreview && (
              <div className="mt-3 p-3 bg-slate-900 text-slate-100 rounded-lg text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Scheduled Return: <strong className="text-white font-mono">{calculatedEndPreview}</strong>
                  </span>
                </div>
                <span className="font-mono text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">
                  {noOfDays * 24} Hours Total
                </span>
              </div>
            )}
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
                placeholder="VIP client, child seat requested, luggage assistance..."
                className="w-full px-3 py-2.5 text-base sm:text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              id="cancel-booking-form-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            >
              Cancel
            </button>
            <button
              id="submit-booking-form-btn"
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-md shadow-blue-600/20 active:scale-95 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
              {editingBooking ? 'Save Changes' : 'Confirm & Schedule Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
