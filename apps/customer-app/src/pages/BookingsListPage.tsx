import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  FileText,
  Star,
  AlertCircle,
  ArrowRight,
  Wrench,
  MessageSquare,
  Phone,
  Banknote,
  CreditCard,
  RefreshCw,
  XCircle,
  AlertOctagon,
  X
} from 'lucide-react';
import { ApiClient } from '../services/api';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { ChatDrawer } from '../components/ChatDrawer';

export const BookingsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [activeChatBooking, setActiveChatBooking] = useState<any | null>(null);

  // Cancellation modal state
  const [cancelBookingTarget, setCancelBookingTarget] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('Change of plans');
  const [customReason, setCustomReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const res = await ApiClient.request('/customer/bookings');
      if (res.success && res.data) {
        setBookings(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchBookings();
    else setIsLoading(false);
  }, [user]);

  const handleCancelBooking = async () => {
    if (!cancelBookingTarget) return;
    setIsCancelling(true);
    try {
      const finalReason = cancelReason === 'Other' ? (customReason || 'Cancelled by customer') : cancelReason;
      const res = await ApiClient.request(`/bookings/${cancelBookingTarget.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: finalReason })
      });
      if (res.success) {
        setCancelBookingTarget(null);
        await fetchBookings();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCancelling(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen pb-20 bg-slate-50">
        <Header />
        <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-md">
            <Calendar className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Manage Your Service Bookings</h2>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Sign in to track your active technicians in real-time, view scheduled appointments & invoices.
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="px-6 py-3 bg-indigo-600 text-white font-bold text-xs rounded-2xl hover:bg-indigo-700 shadow-md shadow-indigo-600/30"
          >
            Sign In / Register
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'ACTIVE') {
      return ![
        'COMPLETED',
        'CUSTOMER_CANCELLED',
        'WORKER_CANCELLED',
        'ADMIN_CANCELLED'
      ].includes(b.status);
    }
    if (activeTab === 'COMPLETED') return b.status === 'COMPLETED';
    if (activeTab === 'CANCELLED') return b.status.includes('CANCELLED');
    return true;
  });

  return (
    <div className="min-h-screen pb-24 bg-slate-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black text-gray-900">My Service Bookings</h1>
              <button
                onClick={fetchBookings}
                className="p-1.5 rounded-xl hover:bg-gray-200 text-gray-500 transition-colors cursor-pointer"
                title="Refresh Bookings"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Track live worker arrivals, view OTP verification codes & manage cancellations
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-1.5 bg-gray-200/70 p-1.5 rounded-2xl text-xs font-bold text-gray-600 self-start sm:self-auto">
            {(['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl capitalize transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-white text-indigo-600 shadow-md shadow-black/5 font-extrabold'
                    : 'hover:text-gray-900'
                }`}
              >
                {tab.toLowerCase()} ({
                  tab === 'ALL'
                    ? bookings.length
                    : tab === 'ACTIVE'
                    ? bookings.filter((b) => !['COMPLETED', 'CUSTOMER_CANCELLED', 'WORKER_CANCELLED', 'ADMIN_CANCELLED'].includes(b.status)).length
                    : tab === 'COMPLETED'
                    ? bookings.filter((b) => b.status === 'COMPLETED').length
                    : bookings.filter((b) => b.status.includes('CANCELLED')).length
                })
              </button>
            ))}
          </div>
        </div>

        {/* Bookings Responsive Multi-Device Grid */}
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400 bg-white rounded-3xl border border-gray-100 p-8 space-y-3 shadow-sm">
            <Wrench className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="font-bold text-gray-700">No bookings found in this section.</p>
            <button
              onClick={() => navigate('/services')}
              className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md inline-block cursor-pointer"
            >
              Explore & Book Services
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBookings.map((b) => {
              const isCash = b.payment?.paymentMethod === 'CASH' || b.paymentMethod === 'CASH';
              const isActive = !['COMPLETED', 'CUSTOMER_CANCELLED', 'WORKER_CANCELLED', 'ADMIN_CANCELLED'].includes(b.status);

              return (
                <div
                  key={b.id}
                  className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all space-y-4 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          #{b.bookingNumber}
                        </span>
                        <h3 className="font-bold text-base text-gray-900 group-hover:text-indigo-600 transition-colors mt-0.5">
                          {b.service?.name}
                        </h3>
                      </div>

                      <span
                        className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                          b.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : b.status.includes('CANCELLED')
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse'
                        }`}
                      >
                        {b.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Schedule Details */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 py-2.5 border-y border-gray-100 bg-slate-50/70 p-2.5 rounded-2xl">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        <span>{b.scheduledDate}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        <span>{b.scheduledTimeSlot}</span>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-start space-x-2 text-xs text-gray-500">
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{b.address?.addressLine}, {b.address?.city}</span>
                    </div>

                    {/* Assigned Worker info + Quick In-App Chat */}
                    {b.worker && (
                      <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 flex justify-between items-center text-xs">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                            {b.worker.user?.name?.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-gray-800 block">{b.worker.user?.name}</span>
                            <span className="text-[10px] text-indigo-600">Assigned Partner</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => setActiveChatBooking(b)}
                            className="px-3 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-indigo-700 flex items-center space-x-1 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Chat</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Security PIN OTP Badge */}
                    {b.otp && isActive && (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5 flex justify-between items-center text-xs text-amber-900">
                        <span className="font-semibold">Start PIN OTP:</span>
                        <span className="font-mono font-black text-sm bg-white px-2.5 py-0.5 rounded-lg border border-amber-300">
                          {b.otp}
                        </span>
                      </div>
                    )}

                    {/* Cancellation Reason if cancelled */}
                    {b.status.includes('CANCELLED') && b.cancellationReason && (
                      <div className="bg-red-50 border border-red-200 rounded-2xl p-2.5 text-xs text-red-800">
                        <span className="font-bold block">Cancelled:</span>
                        <span>{b.cancellationReason}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                        {isCash ? '💵 Pay on Delivery' : '💳 Prepaid Online'}
                      </span>
                      <span className="text-lg font-black text-gray-900">₹{b.totalAmount}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {isActive && (
                        <button
                          onClick={() => setCancelBookingTarget(b)}
                          className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}

                      <button
                        onClick={() => navigate(`/booking/${b.id}/track`)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-1 transition-transform group-hover:scale-105 cursor-pointer"
                      >
                        <span>Track</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Cancellation Modal */}
      {cancelBookingTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertOctagon className="w-5 h-5" />
                <h3 className="font-bold text-base text-gray-900">Cancel Booking #{cancelBookingTarget.bookingNumber}</h3>
              </div>
              <button
                onClick={() => setCancelBookingTarget(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Are you sure you want to cancel this booking for <strong>{cancelBookingTarget.service?.name}</strong>?
            </p>

            <div className="space-y-2">
              {[
                'Change of plans',
                'Booked by mistake',
                'Partner is taking too long',
                'Found another service solution',
                'Other'
              ].map((r) => (
                <label
                  key={r}
                  onClick={() => setCancelReason(r)}
                  className={`flex items-center space-x-3 p-3 rounded-2xl border text-xs font-semibold cursor-pointer transition-all ${
                    cancelReason === r
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="listCancelReason"
                    checked={cancelReason === r}
                    onChange={() => setCancelReason(r)}
                    className="text-indigo-600"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>

            {cancelReason === 'Other' && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Please specify reason..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20"
              />
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelBookingTarget(null)}
                className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-2xl cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={isCancelling}
                className="py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-red-600/30 disabled:opacity-50 cursor-pointer"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Synchronized In-App Chat Modal */}
      {activeChatBooking && (
        <ChatDrawer
          bookingId={activeChatBooking.id}
          workerName={activeChatBooking.worker?.user?.name || 'Assigned Partner'}
          isOpen={!!activeChatBooking}
          onClose={() => setActiveChatBooking(null)}
        />
      )}

      <BottomNav />
    </div>
  );
};
