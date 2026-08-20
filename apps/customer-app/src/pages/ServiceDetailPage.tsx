import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  Clock,
  CheckCircle2,
  Calendar as CalendarIcon,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  MapPin,
  Tag,
  Wrench,
  AlertCircle
} from 'lucide-react';
import { ApiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { AddressModal } from '../components/AddressModal';

export const ServiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, selectedAddress } = useAuth();
  const { t } = useLanguage();
  const [service, setService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<string>('10:00 AM');
  const [instructions, setInstructions] = useState<string>('');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await ApiClient.request(`/services/${id}`);
        if (res.success && res.data) {
          setService(res.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchDetails();
  }, [id]);

  if (isLoading || !service) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Next 7 selectable dates
  const nextDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      fullDate: d.toISOString().split('T')[0],
      dayName: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateNum: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' })
    };
  });

  const handleProceed = () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Pass booking parameters in state to confirmation checkout
    navigate('/booking/confirm', {
      state: {
        serviceId: service.id,
        serviceName: service.name,
        basePrice: service.basePrice,
        scheduledDate: selectedDate,
        scheduledTimeSlot: selectedSlot,
        instructions
      }
    });
  };

  return (
    <div className="min-h-screen pb-28 bg-slate-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Back Navigation Breadcrumb */}
        <div className="flex items-center space-x-2 mb-6 text-xs text-gray-500">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors flex items-center space-x-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-bold">Back</span>
          </button>
          <span>/</span>
          <span>{service.category?.name}</span>
          <span>/</span>
          <span className="text-gray-900 font-bold">{service.name}</span>
        </div>

        {/* 2-Column Responsive Layout on Desktop/Laptop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Service Details & Inclusions */}
          <div className="lg:col-span-7 space-y-6">
            {/* Service Hero Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">
                    {service.category?.name}
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-2">
                    {service.name}
                  </h1>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-2xl sm:text-3xl font-black text-gray-900">
                    ₹{service.basePrice}
                  </span>
                  <span className="text-xs text-gray-400 block">+ ₹50 visit charge</span>
                </div>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed">{service.description}</p>

              <div className="flex items-center space-x-6 pt-4 border-t border-gray-100 text-xs sm:text-sm text-gray-500">
                <div className="flex items-center text-amber-500 font-bold">
                  <Star className="w-4 h-4 fill-amber-400 mr-1.5" />
                  4.9 (48 verified customer reviews)
                </div>
                <div className="flex items-center text-gray-600">
                  <Clock className="w-4 h-4 mr-1.5 text-gray-400" />
                  {service.durationMinutes} mins estimated duration
                </div>
              </div>
            </div>

            {/* What's Included */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center">
                <Sparkles className="w-5 h-5 mr-2.5 text-indigo-600" />
                What's included in this service
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {service.inclusionsList?.map((item: string, idx: number) => (
                  <div key={idx} className="flex items-start space-x-3 text-xs sm:text-sm text-gray-700 bg-slate-50 p-3 rounded-2xl border border-gray-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quality & Safety Assurance */}
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-3xl p-6 flex items-start space-x-4">
              <ShieldCheck className="w-8 h-8 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-emerald-950">Verified Service Execution Promise</h4>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Your safety and satisfaction are guaranteed. All service professionals are identity-verified, wear sanitized gear, and follow strict safety SOPs.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Appointment Scheduler & Checkout Bar */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xl space-y-6 sticky top-24">
              <div>
                <h3 className="text-base font-bold text-gray-900">Schedule Service Appointment</h3>
                <p className="text-xs text-gray-500 mt-0.5">Select your preferred date and time slot</p>
              </div>

              {/* Select Date */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 flex items-center">
                  <CalendarIcon className="w-4 h-4 mr-1.5 text-indigo-600" />
                  Select Date
                </label>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {nextDates.map((d) => {
                    const isSelected = selectedDate === d.fullDate;
                    return (
                      <button
                        key={d.fullDate}
                        onClick={() => setSelectedDate(d.fullDate)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-200'
                        }`}
                      >
                        <span className="text-[10px] font-medium opacity-80">{d.dayName}</span>
                        <span className="text-base font-extrabold my-0.5">{d.dateNum}</span>
                        <span className="text-[9px] uppercase font-semibold">{d.month}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Select Time Slot */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 flex items-center">
                  <Clock className="w-4 h-4 mr-1.5 text-indigo-600" />
                  Select Time Slot
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {service.availableSlots?.map((slot: string) => {
                    const isSelected = selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2 px-2 text-center rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location Summary */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-gray-100 flex justify-between items-center text-xs">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <span className="font-semibold text-gray-800 truncate max-w-[200px]">
                    {selectedAddress ? `${selectedAddress.addressLine}, ${selectedAddress.city}` : 'No address selected'}
                  </span>
                </div>

                <button
                  onClick={() => setShowAddressModal(true)}
                  className="text-xs font-bold text-indigo-600 hover:underline flex-shrink-0"
                >
                  {selectedAddress ? 'Change' : 'Select'}
                </button>
              </div>

              {/* Additional Instructions */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Special Instructions (Optional)</label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Please call 10 mins before arrival. AC compressor is on the 2nd floor terrace."
                  className="w-full p-3 bg-slate-50 border border-gray-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20"
                />
              </div>

              {/* Total & Book Button */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">{t('service.total_estimated', 'Total Estimated')}</span>
                  <span className="text-2xl font-black text-gray-900">₹{service.basePrice + 50}</span>
                </div>

                <button
                  onClick={handleProceed}
                  className="px-8 py-3.5 bg-indigo-600 text-white font-bold text-sm rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-transform active:scale-95 cursor-pointer"
                >
                  <span>{t('service.proceed_to_book', 'Proceed to Book')}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Bottom Bar for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-gray-200 lg:hidden z-30 flex items-center justify-between shadow-2xl">
        <div>
          <span className="text-[10px] text-gray-400 uppercase font-semibold block">{t('service.total_estimated', 'Total Estimated')}</span>
          <span className="text-xl font-black text-gray-900">₹{service.basePrice + 50}</span>
        </div>
        <button
          onClick={handleProceed}
          className="px-6 py-3 bg-indigo-600 text-white font-bold text-sm rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 cursor-pointer"
        >
          <span>{t('service.proceed_to_book', 'Proceed to Book')}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <AddressModal isOpen={showAddressModal} onClose={() => setShowAddressModal(false)} />
      <BottomNav />
    </div>
  );
};
