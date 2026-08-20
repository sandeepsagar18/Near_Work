import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Phone,
  MessageSquare,
  ShieldCheck,
  Star,
  Clock,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  FileText,
  XCircle,
  Home,
  ArrowLeft,
  Navigation,
  Banknote,
  CreditCard,
  X,
  AlertOctagon,
  RefreshCw
} from 'lucide-react';
import { ApiClient } from '../services/api';
import { getSocket } from '../services/socket';
import { SOCKET_EVENTS, BookingStatus } from '@nearwork/types';
import { LiveTrackingMap } from '../components/LiveTrackingMap';
import { ChatDrawer } from '../components/ChatDrawer';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';

export const TrackingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [workerLocation, setWorkerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [extraChargeModal, setExtraChargeModal] = useState<any>(null);
  const [ratingModal, setRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Cancellation State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Change of plans');
  const [customReason, setCustomReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchBooking = async () => {
    try {
      const res = await ApiClient.request(`/bookings/${id}`);
      if (res.success && res.data) {
        setBooking(res.data);
        if (res.data.worker?.currentLat && res.data.worker?.currentLng) {
          setWorkerLocation({
            lat: res.data.worker.currentLat,
            lng: res.data.worker.currentLng
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchBooking();

    const socket = getSocket();
    socket.emit('booking:join', { bookingId: id });

    // Listen for live tracking location updates
    socket.on(SOCKET_EVENTS.TRACKING_UPDATE, (data: any) => {
      if (data?.latitude && data?.longitude) {
        setWorkerLocation({ lat: data.latitude, lng: data.longitude });
      }
    });

    socket.on(SOCKET_EVENTS.BOOKING_ACCEPTED, () => fetchBooking());
    socket.on(SOCKET_EVENTS.WORKER_EN_ROUTE, () => fetchBooking());
    socket.on(SOCKET_EVENTS.WORKER_ARRIVED, () => fetchBooking());
    socket.on(SOCKET_EVENTS.SERVICE_STARTED, () => fetchBooking());
    socket.on(SOCKET_EVENTS.BOOKING_CANCELLED, () => fetchBooking());
    socket.on(SOCKET_EVENTS.SERVICE_COMPLETED, () => {
      fetchBooking();
      setRatingModal(true);
    });

    socket.on(SOCKET_EVENTS.EXTRA_CHARGE_REQUESTED, (data: any) => {
      setExtraChargeModal(data);
    });

    // 4-second guarantee poller
    const pollTimer = setInterval(fetchBooking, 4000);

    return () => {
      socket.off(SOCKET_EVENTS.TRACKING_UPDATE);
      socket.off(SOCKET_EVENTS.BOOKING_ACCEPTED);
      socket.off(SOCKET_EVENTS.WORKER_EN_ROUTE);
      socket.off(SOCKET_EVENTS.WORKER_ARRIVED);
      socket.off(SOCKET_EVENTS.SERVICE_STARTED);
      socket.off(SOCKET_EVENTS.BOOKING_CANCELLED);
      socket.off(SOCKET_EVENTS.SERVICE_COMPLETED);
      socket.off(SOCKET_EVENTS.EXTRA_CHARGE_REQUESTED);
      clearInterval(pollTimer);
    };
  }, [id]);

  const handleRespondExtraCharge = async (approved: boolean) => {
    if (!id) return;
    try {
      await ApiClient.request(`/bookings/${id}/extra-charge/respond`, {
        method: 'POST',
        body: JSON.stringify({ approved })
      });
      setExtraChargeModal(null);
      fetchBooking();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelBooking = async () => {
    if (!id) return;
    setIsCancelling(true);
    try {
      const finalReason = cancelReason === 'Other' ? (customReason || 'Cancelled by customer') : cancelReason;
      const res = await ApiClient.request(`/bookings/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: finalReason })
      });
      setShowCancelModal(false);
      await fetchBooking();
    } catch (e) {
      console.error(e);
      setShowCancelModal(false);
      await fetchBooking();
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!id) return;
    try {
      await ApiClient.request('/customer/reviews', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: id,
          rating: selectedRating,
          review: reviewComment
        })
      });
      setRatingModal(false);
      fetchBooking();
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const isCompleted = booking.status === BookingStatus.COMPLETED;
  const isCancelled =
    booking.status === BookingStatus.CUSTOMER_CANCELLED ||
    booking.status === BookingStatus.WORKER_CANCELLED ||
    booking.status === BookingStatus.ADMIN_CANCELLED;
  const isStarted = booking.status === BookingStatus.SERVICE_STARTED;
  const isArrived = booking.status === BookingStatus.WORKER_ARRIVED;
  const isEnRoute = booking.status === BookingStatus.WORKER_EN_ROUTE;
  const isAssigned =
    booking.status === BookingStatus.WORKER_ACCEPTED ||
    booking.status === BookingStatus.WORKER_ASSIGNED;
  const isSearching =
    booking.status === BookingStatus.SEARCHING_WORKER ||
    booking.status === BookingStatus.PAID;

  const isCash = booking.payment?.paymentMethod === 'CASH' || booking.paymentMethod === 'CASH';

  return (
    <div className="min-h-screen pb-24 bg-slate-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Top Breadcrumb Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <button
              onClick={() => navigate('/bookings')}
              className="p-1.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors flex items-center space-x-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-bold">Bookings</span>
            </button>
            <span>/</span>
            <span className="text-gray-900 font-bold">Booking #{booking.bookingNumber}</span>
          </div>

          <div className="flex items-center space-x-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                isCompleted
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : isCancelled
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse'
              }`}
            >
              {booking.status.replace(/_/g, ' ')}
            </span>

            {/* Cancel Button (if active) */}
            {!isCompleted && !isCancelled && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-full text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel Booking
              </button>
            )}
          </div>
        </div>

        {/* Cancellation Summary Alert */}
        {isCancelled && (
          <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-6 space-y-2 text-red-900 shadow-sm">
            <div className="flex items-center space-x-2.5">
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <h3 className="text-base font-bold">Booking Cancelled</h3>
            </div>
            <p className="text-xs text-red-700">
              Reason: <strong>{booking.cancellationReason || 'Cancelled upon request'}</strong>
            </p>
            {!isCash && (
              <div className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-2xl border border-emerald-200 mt-2 font-medium">
                💳 Online Payment Refund: A 100% refund of ₹{booking.totalAmount} will be processed back to your original payment method.
              </div>
            )}
          </div>
        )}

        {/* 2-Column Responsive Split View on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Interactive Live Map */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-gray-900 flex items-center">
                  <Navigation className="w-4 h-4 mr-2 text-indigo-600" />
                  Live GPS Field Tracking
                </h3>
                {isEnRoute && (
                  <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">
                    Partner is on the way (ETA ~8 mins)
                  </span>
                )}
              </div>

              {booking.address && (
                <div className="h-80 sm:h-96 md:h-[450px]">
                  <LiveTrackingMap
                    customerLat={booking.address.latitude}
                    customerLng={booking.address.longitude}
                    workerLat={workerLocation?.lat}
                    workerLng={workerLocation?.lng}
                    workerName={booking.worker?.user?.name}
                    isEnRoute={isEnRoute}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Status Steps, 4-digit PIN OTP Card & Worker Actions */}
          <div className="lg:col-span-5 space-y-6">
            {/* Status Steps Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
              <span className="text-xs font-black text-indigo-600 uppercase tracking-wider block">
                {isSearching && '🔍 Searching & Dispatching Nearby Expert...'}
                {isAssigned && '✅ Expert Assigned & Confirmed'}
                {isEnRoute && '🚗 Partner is En Route to Your Address'}
                {isArrived && '📍 Partner Has Arrived at Premises'}
                {isStarted && '⚡ Service In Progress'}
                {isCompleted && '🎉 Service Completed Successfully'}
                {isCancelled && '❌ Booking Cancelled'}
              </span>

              {/* Progress Step Bars */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                <div className={`h-2 rounded-full ${isAssigned || isEnRoute || isArrived || isStarted || isCompleted ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                <div className={`h-2 rounded-full ${isEnRoute || isArrived || isStarted || isCompleted ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                <div className={`h-2 rounded-full ${isArrived || isStarted || isCompleted ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                <div className={`h-2 rounded-full ${isCompleted ? 'bg-indigo-600' : 'bg-gray-200'}`} />
              </div>
            </div>

            {/* Secure 4-Digit Service PIN OTP Card (if active) */}
            {!isCompleted && !isCancelled && (
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-3xl p-6 shadow-xl flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    <KeyRound className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="text-xs text-orange-100 font-bold uppercase tracking-wider block">
                      Service Start PIN
                    </span>
                    <p className="text-xs text-orange-100 mt-0.5">Share with partner upon arrival</p>
                  </div>
                </div>
                <span className="text-3xl font-black tracking-widest bg-white/20 px-4 py-2 rounded-2xl border border-white/30 font-mono shadow-sm">
                  {booking.otp}
                </span>
              </div>
            )}

            {/* Assigned Worker Profile Card */}
            {booking.worker && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider block">
                  Assigned Verified Professional
                </span>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center font-black text-indigo-700 text-xl shadow-sm">
                      {booking.worker.user?.name?.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-gray-900">
                        {booking.worker.user?.name}
                      </h4>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                        <span className="flex items-center text-amber-500 font-bold">
                          <Star className="w-4 h-4 fill-amber-400 mr-1" />
                          {booking.worker.averageRating || 4.9}
                        </span>
                        <span>•</span>
                        <span>{booking.worker.totalJobsCompleted} jobs</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <a
                      href={`tel:${booking.worker.user?.phone || '9876543212'}`}
                      className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-2xl transition-colors shadow-sm"
                      title="Call Partner"
                    >
                      <Phone className="w-5 h-5" />
                    </a>
                    <button
                      onClick={() => setIsChatOpen(true)}
                      className="p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-2xl transition-colors shadow-sm cursor-pointer"
                      title="In-App Chat"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Payment & Invoice Summary */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                <span>Payment Summary</span>
                <span className="text-indigo-600">
                  {isCash ? '💵 Cash on Delivery' : '💳 Prepaid Online'}
                </span>
              </div>

              <div className="flex justify-between items-center text-base font-black text-gray-900 pt-1">
                <span>Total Amount</span>
                <span className="text-2xl text-indigo-600">₹{booking.totalAmount}</span>
              </div>
            </div>

            {/* Rate Service Card if Completed */}
            {isCompleted && (
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-3xl p-6 space-y-3">
                <div className="flex justify-between items-center text-sm font-bold text-emerald-950">
                  <span>Service Completed</span>
                  <span className="text-xl font-black">₹{booking.totalAmount}</span>
                </div>
                <button
                  onClick={() => setRatingModal(true)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl transition-transform active:scale-95 shadow-md shadow-emerald-600/20"
                >
                  Rate & Review Partner
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertOctagon className="w-5 h-5" />
                <h3 className="font-bold text-base text-gray-900">Cancel Booking</h3>
              </div>
              <button
                onClick={() => setShowCancelModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Are you sure you want to cancel this booking? Please select a reason below:
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
                    name="cancelReason"
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
                onClick={() => setShowCancelModal(false)}
                className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-2xl"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={isCancelling}
                className="py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-red-600/30 disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extra Charges Approval Modal */}
      {extraChargeModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-center font-bold text-base text-gray-900">
              Additional Work Requested
            </h3>
            <p className="text-center text-xs text-gray-600">
              Partner requested <strong>₹{extraChargeModal.amount}</strong> for extra material or work:
            </p>
            <div className="bg-slate-50 p-3.5 rounded-2xl text-xs text-gray-700 italic border border-gray-200">
              "{extraChargeModal.reason}"
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => handleRespondExtraCharge(false)}
                className="py-3 border border-gray-300 font-bold text-xs rounded-2xl text-gray-700 hover:bg-gray-50"
              >
                Decline
              </button>
              <button
                onClick={() => handleRespondExtraCharge(true)}
                className="py-3 bg-indigo-600 font-bold text-xs rounded-2xl text-white hover:bg-indigo-700 shadow-md"
              >
                Approve (₹{extraChargeModal.amount})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating & Review Modal */}
      {ratingModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95">
            <h3 className="text-center font-bold text-base text-gray-900">
              How was your service experience?
            </h3>

            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => setSelectedRating(num)}
                  className="p-1 focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${
                      num <= selectedRating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Leave a review regarding punctuality and workmanship..."
              className="w-full p-3.5 bg-slate-50 border border-gray-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24"
            />

            <div className="flex space-x-2">
              <button
                onClick={() => setRatingModal(false)}
                className="flex-1 py-3 border border-gray-300 font-bold text-xs rounded-2xl text-gray-700 hover:bg-gray-50"
              >
                Skip
              </button>
              <button
                onClick={handleSubmitReview}
                className="flex-1 py-3 bg-indigo-600 font-bold text-xs rounded-2xl text-white hover:bg-indigo-700 shadow-md"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Chat Drawer */}
      <ChatDrawer
        bookingId={booking.id}
        workerName={booking.worker?.user?.name || 'Service Partner'}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      <BottomNav />
    </div>
  );
};
