import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Navigation,
  MapPin,
  CheckCircle2,
  Clock,
  KeyRound,
  AlertTriangle,
  Camera,
  Check,
  ShieldCheck,
  Banknote,
  CreditCard,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { WorkerApiClient } from '../services/api';
import { getWorkerSocket } from '../services/socket';
import { SOCKET_EVENTS, BookingStatus } from '@nearwork/types';
import { useWorkerLanguage } from '../context/LanguageContext';
import { WorkerChatDrawer } from '../components/WorkerChatDrawer';
import { WorkerHeader } from '../components/WorkerHeader';
import { WorkerLiveNavigationMap } from '../components/WorkerLiveNavigationMap';

export const ActiveJobPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useWorkerLanguage();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [otpInput, setOtpInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [extraAmount, setExtraAmount] = useState('');
  const [extraReason, setExtraReason] = useState('');
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const fetchJob = async () => {
    try {
      const res = await WorkerApiClient.request(`/bookings/${id}`);
      if (res.success && res.data) {
        setJob(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (id) fetchJob();

    const socket = getWorkerSocket();
    socket.emit('booking:join', { bookingId: id });

    socket.on(SOCKET_EVENTS.EXTRA_CHARGE_RESPONDED, () => {
      fetchJob();
    });

    socket.on(SOCKET_EVENTS.BOOKING_CANCELLED, (data: any) => {
      fetchJob();
      setErrorMsg('🚫 Booking has been cancelled by the customer. Do NOT proceed.');
    });

    return () => {
      socket.off(SOCKET_EVENTS.EXTRA_CHARGE_RESPONDED);
      socket.off(SOCKET_EVENTS.BOOKING_CANCELLED);
    };
  }, [id]);

  useEffect(() => {
    let timer: any = null;
    if (job?.status === BookingStatus.SERVICE_STARTED && job?.startedAt) {
      const startTime = new Date(job.startedAt).getTime();
      timer = setInterval(() => {
        const now = Date.now();
        setElapsedSeconds(Math.max(0, Math.floor((now - startTime) / 1000)));
      }, 1000);
    } else if (job?.startedAt && job?.completedAt) {
      const start = new Date(job.startedAt).getTime();
      const end = new Date(job.completedAt).getTime();
      setElapsedSeconds(Math.max(0, Math.floor((end - start) / 1000)));
    }
    return () => clearInterval(timer);
  }, [job?.status, job?.startedAt, job?.completedAt]);

  // Real Hardware GPS Telemetry Watcher when worker is Active / Accepted / En Route
  useEffect(() => {
    const activeTrackingStatuses: any[] = [
      BookingStatus.WORKER_ACCEPTED,
      BookingStatus.WORKER_EN_ROUTE,
      BookingStatus.WORKER_ARRIVED,
      BookingStatus.SERVICE_STARTED
    ];
    if (!job?.status || !activeTrackingStatuses.includes(job.status) || !id) return;

    const socket = getWorkerSocket();
    let lastPos: { lat: number; lng: number; time: number } | null = null;
    let watchId: number | null = null;

    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, speed: geoSpeed, heading: geoHeading, accuracy, altitude } = position.coords;
          const now = Date.now();

          let realSpeedKmh = 0;
          if (geoSpeed !== null && geoSpeed !== undefined && !isNaN(geoSpeed) && geoSpeed > 0) {
            realSpeedKmh = Math.round(geoSpeed * 3.6);
          } else if (lastPos) {
            const timeDiffHours = (now - lastPos.time) / (1000 * 60 * 60);
            if (timeDiffHours > 0) {
              const R = 6371;
              const dLat = ((latitude - lastPos.lat) * Math.PI) / 180;
              const dLon = ((longitude - lastPos.lng) * Math.PI) / 180;
              const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos((lastPos.lat * Math.PI) / 180) *
                  Math.cos((latitude * Math.PI) / 180) *
                  Math.sin(dLon / 2) *
                  Math.sin(dLon / 2);
              const distKm = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
              realSpeedKmh = Math.min(120, Math.round(distKm / timeDiffHours));
            }
          }

          lastPos = { lat: latitude, lng: longitude, time: now };

          socket.emit(SOCKET_EVENTS.WORKER_LOCATION_UPDATE, {
            bookingId: id,
            latitude,
            longitude,
            speed: realSpeedKmh,
            heading: geoHeading || 0,
            accuracy: accuracy || 3.5,
            altitude: altitude || 128,
            timestamp: now
          });
        },
        (err) => {
          console.warn('Real GPS warning:', err.message);
        },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
      );
    }

    return () => {
      if (watchId !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [job?.status, id]);

  const handleStartEnRoute = async () => {
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const res = await WorkerApiClient.request(`/bookings/${id}/en-route`, {
        method: 'POST'
      });
      if (res.success) {
        setSuccessMsg('Status updated to En Route. Live GPS beacon broadcasting.');
        fetchJob();

        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition((pos) => {
            const socket = getWorkerSocket();
            socket.emit(SOCKET_EVENTS.WORKER_LOCATION_UPDATE, {
              bookingId: id,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              heading: pos.coords.heading || 0,
              speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
              accuracy: pos.coords.accuracy || 5,
              altitude: pos.coords.altitude || 128
            });
          });
        }
      } else {
        setErrorMsg(res.message || 'Failed to update status');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkArrived = async () => {
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const res = await WorkerApiClient.request(`/bookings/${id}/arrived`, {
        method: 'POST',
        body: JSON.stringify({
          latitude: job.address.latitude,
          longitude: job.address.longitude
        })
      });

      if (res.success) {
        setSuccessMsg('Arrival verified by physical geofence (within 150m)');
        fetchJob();
      } else {
        setErrorMsg(res.message || 'Geofence check failed');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to mark arrival');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput || otpInput.length !== 4) {
      setErrorMsg('Please enter a 4-digit PIN OTP from customer');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');
    try {
      const res = await WorkerApiClient.request(`/bookings/${id}/start`, {
        method: 'POST',
        body: JSON.stringify({ otp: otpInput })
      });

      if (res.success) {
        setSuccessMsg('Service successfully started!');
        setOtpInput('');
        fetchJob();
      } else {
        setErrorMsg(res.message || 'Invalid PIN OTP');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Verification failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestExtraWork = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await WorkerApiClient.request(`/bookings/${id}/extra-charge`, {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(extraAmount),
          reason: extraReason
        })
      });

      if (res.success) {
        setShowExtraModal(false);
        setExtraAmount('');
        setExtraReason('');
        setSuccessMsg('Additional charge request sent to customer');
        fetchJob();
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to request extra charge');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteService = async () => {
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const res = await WorkerApiClient.request(`/bookings/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          beforePhotos: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600'],
          afterPhotos: ['https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600']
        })
      });

      if (res.success) {
        setSuccessMsg('Service completed successfully and earnings credited to wallet!');
        fetchJob();
      } else {
        setErrorMsg(res.message || 'Failed to complete job');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to complete job');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const formatTimer = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const isAccepted = job.status === 'WORKER_ACCEPTED' || job.status === 'WORKER_ASSIGNED';
  const isEnRoute = job.status === 'WORKER_EN_ROUTE';
  const isArrived = job.status === 'WORKER_ARRIVED';
  const isStarted = job.status === 'SERVICE_STARTED';
  const isCompleted = job.status === 'COMPLETED';

  const isCashPayment =
    job.payment?.paymentMethod === 'CASH' ||
    job.paymentMethod === 'CASH';

  const netPartnerPayout = Math.round(job.totalAmount * 0.8);
  const platformFee = job.totalAmount - netPartnerPayout;

  return (
    <div className="min-h-screen pb-24 bg-slate-950 text-slate-100">
      <WorkerHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Breadcrumb Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <button
              onClick={() => navigate('/')}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center space-x-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-bold">Dashboard</span>
            </button>
            <span>/</span>
            <span className="text-white font-bold">Job #{job.bookingNumber}</span>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                isCompleted
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : isStarted
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 animate-pulse'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}
            >
              {job.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Payment Mode Banner Alert */}
        {isCashPayment ? (
          <div className="bg-emerald-950/80 border-2 border-emerald-500/50 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-emerald-300 shadow-xl">
            <div className="flex items-start space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400 border border-emerald-500/30">
                <Banknote className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 block">
                  Payment Mode: Pay After Service (Cash / UPI)
                </span>
                <p className="text-sm font-bold text-white mt-0.5">
                  {isCompleted
                    ? `✓ Cash payment of ₹${job.totalAmount} collected from customer.`
                    : `Collect ₹${job.totalAmount} in Cash or scan your UPI QR upon service completion.`}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0 bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total to Collect</span>
              <span className="text-2xl font-black text-emerald-400">₹{job.totalAmount}</span>
            </div>
          </div>
        ) : (
          <div className="bg-indigo-950/80 border-2 border-indigo-500/50 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-indigo-300 shadow-xl">
            <div className="flex items-start space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0 text-indigo-400 border border-indigo-500/30">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-indigo-400 block">
                  Payment Mode: Paid Online via Razorpay
                </span>
                <p className="text-sm font-bold text-white mt-0.5">
                  Customer has already paid ₹{job.totalAmount} online. Do not collect cash.
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0 bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Prepaid Total</span>
              <span className="text-2xl font-black text-indigo-400">₹{job.totalAmount}</span>
            </div>
          </div>
        )}

        {/* Full-width Prominent Alert if Cancelled by Customer */}
        {(job.status === 'CUSTOMER_CANCELLED' || job.status === 'CANCELLED' || job.status === 'ADMIN_CANCELLED') && (
          <div className="bg-red-950/95 border-2 border-red-500 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/40">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-white">🚫 Booking Cancelled by Customer</h2>
              <p className="text-xs sm:text-sm text-red-300 max-w-lg mx-auto leading-relaxed">
                The customer has cancelled this booking ({job.cancellationReason || 'No reason specified'}). Please do NOT proceed to the address.
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-8 py-3.5 bg-red-600 hover:bg-red-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-red-600/30 transition-transform active:scale-95 cursor-pointer"
            >
              Back to Partner Dashboard
            </button>
          </div>
        )}

        {/* Notifications / Feedback Alerts */}
        {errorMsg && !['CUSTOMER_CANCELLED', 'CANCELLED'].includes(job.status) && (
          <div className="bg-red-950/80 border border-red-500 text-red-300 p-4 rounded-3xl text-xs sm:text-sm flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && !['CUSTOMER_CANCELLED', 'CANCELLED'].includes(job.status) && (
          <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-300 p-4 rounded-3xl text-xs sm:text-sm flex items-center space-x-2">
            <Check className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 2-Column Responsive Layout for Desktop / Tablet */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Device Locator GPS Map & Customer Details */}
          <div className="lg:col-span-6 space-y-6">
            {/* Live GPS Device Locator Map for Worker */}
            {job.address?.latitude && job.address?.longitude && !['CUSTOMER_CANCELLED', 'CANCELLED'].includes(job.status) && (
              <WorkerLiveNavigationMap
                bookingId={job.id}
                customerLat={job.address.latitude}
                customerLng={job.address.longitude}
                customerName={job.customer.name}
                customerPhone={job.customer.phone}
                customerAddress={`${job.address.addressLine}, ${job.address.city}`}
                isEnRoute={isEnRoute}
                onArrivedSuccess={fetchJob}
              />
            )}

            {/* Customer & Location Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs text-emerald-400 font-black uppercase tracking-wider block">
                    {job.service.name}
                  </span>
                  <h2 className="text-2xl font-bold text-white mt-1">{job.customer.name}</h2>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                    ₹{netPartnerPayout}
                  </span>
                  <span className="text-xs text-slate-400 block">Your Net Payout (80%)</span>
                </div>
              </div>

              {/* Schedule Info */}
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-300 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span>{job.scheduledDate}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>Slot: {job.scheduledTimeSlot}</span>
                </div>
              </div>

              {/* Full Address */}
              <div className="flex items-start space-x-3 text-xs sm:text-sm text-slate-300 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <MapPin className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">{job.address.addressLine}</span>
                  <p className="text-slate-400">{job.address.city}, {job.address.state} - {job.address.pincode}</p>
                  {job.address.landmark && (
                    <p className="text-slate-500 text-xs mt-0.5">Landmark: {job.address.landmark}</p>
                  )}
                </div>
              </div>

              {/* Customer Special Instructions */}
              {job.instructions && (
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs text-slate-400">
                  <span className="font-bold text-white block mb-0.5 flex items-center">
                    <Info className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                    Customer Instructions:
                  </span>
                  {job.instructions}
                </div>
              )}

              {/* Call & Chat Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <a
                  href={`tel:${job.customer.phone || '9876543211'}`}
                  className="py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-2xl flex items-center justify-center space-x-2 transition-colors border border-slate-700 shadow-md"
                >
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>{t('exec.call_customer', 'Call Customer')}</span>
                </a>
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-2xl flex items-center justify-center space-x-2 transition-colors border border-slate-700 shadow-md"
                >
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <span>{t('exec.chat_with_customer', 'In-App Chat')}</span>
                </button>
              </div>
            </div>

            {/* Time & Work Summary Audit Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
              <h3 className="font-bold text-base text-white flex items-center">
                <Clock className="w-5 h-5 mr-2 text-indigo-400" />
                Work Timings & Execution Audit
              </h3>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Started At</span>
                  <span className="text-sm font-black text-white">{formatTime(job.startedAt)}</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Finished At</span>
                  <span className="text-sm font-black text-white">{formatTime(job.completedAt)}</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Duration</span>
                  <span className="text-sm font-black text-emerald-400">
                    {elapsedSeconds > 0 ? formatTimer(elapsedSeconds) : '--:--'}
                  </span>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="space-y-2 pt-3 border-t border-slate-800 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Gross Job Amount</span>
                  <span className="text-white font-bold">₹{job.totalAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Commission (20%)</span>
                  <span className="text-red-400 font-bold">-₹{platformFee}</span>
                </div>
                <div className="flex justify-between text-sm text-emerald-400 font-black pt-2 border-t border-slate-800">
                  <span>Withdrawable Partner Payout</span>
                  <span>+₹{netPartnerPayout}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Execution Lifecycle & Step-by-Step Actions */}
          <div className="lg:col-span-6 space-y-6">
            {/* Step-by-Step Progress Roadmap */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
              <span className="text-xs uppercase font-black text-slate-400 tracking-wider block">
                Work Execution Progress
              </span>

              <div className="space-y-3">
                <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  isAccepted || isEnRoute || isArrived || isStarted || isCompleted
                    ? 'bg-slate-950 border-emerald-500/40 text-white'
                    : 'bg-slate-950/40 border-slate-800 text-slate-500'
                }`}>
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className={`w-5 h-5 ${isAccepted || isEnRoute || isArrived || isStarted || isCompleted ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span className="text-xs font-bold">1. Job Accepted & Assigned</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">Done</span>
                </div>

                <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  isEnRoute || isArrived || isStarted || isCompleted
                    ? 'bg-slate-950 border-emerald-500/40 text-white'
                    : 'bg-slate-950/40 border-slate-800 text-slate-500'
                }`}>
                  <div className="flex items-center space-x-3">
                    <Navigation className={`w-5 h-5 ${isEnRoute || isArrived || isStarted || isCompleted ? 'text-indigo-400' : 'text-slate-600'}`} />
                    <span className="text-xs font-bold">2. En Route to Premises</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {isEnRoute ? 'Active' : isArrived || isStarted || isCompleted ? 'Done' : 'Pending'}
                  </span>
                </div>

                <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  isArrived || isStarted || isCompleted
                    ? 'bg-slate-950 border-emerald-500/40 text-white'
                    : 'bg-slate-950/40 border-slate-800 text-slate-500'
                }`}>
                  <div className="flex items-center space-x-3">
                    <MapPin className={`w-5 h-5 ${isArrived || isStarted || isCompleted ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span className="text-xs font-bold">3. Geofenced Arrival (150m)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {isArrived ? 'Active' : isStarted || isCompleted ? 'Verified' : 'Pending'}
                  </span>
                </div>

                <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  isStarted || isCompleted
                    ? 'bg-slate-950 border-emerald-500/40 text-white'
                    : 'bg-slate-950/40 border-slate-800 text-slate-500'
                }`}>
                  <div className="flex items-center space-x-3">
                    <KeyRound className={`w-5 h-5 ${isStarted || isCompleted ? 'text-amber-400' : 'text-slate-600'}`} />
                    <span className="text-xs font-bold">4. Customer PIN OTP Verified</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {isStarted ? 'In Progress' : isCompleted ? 'Done' : 'Pending'}
                  </span>
                </div>

                <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  isCompleted
                    ? 'bg-slate-950 border-emerald-500/40 text-white'
                    : 'bg-slate-950/40 border-slate-800 text-slate-500'
                }`}>
                  <div className="flex items-center space-x-3">
                    <ShieldCheck className={`w-5 h-5 ${isCompleted ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span className="text-xs font-bold">5. Service Completed & Wallet Credited</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {isCompleted ? 'Settled' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* STEP 1 Action: Start En Route */}
            {isAccepted && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
                <h3 className="font-bold text-base text-white flex items-center">
                  <Navigation className="w-5 h-5 mr-2 text-indigo-400" />
                  {t('exec.stage_enroute_title', 'Step 1: Start Travel to Customer Premises')}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Tap "I'm En Route" below to broadcast your live GPS beacon to the customer and update their tracking screen.
                </p>
                <button
                  onClick={handleStartEnRoute}
                  disabled={isProcessing}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-transform active:scale-95 cursor-pointer"
                >
                  <Navigation className="w-5 h-5" />
                  <span>{t('exec.stage_enroute_btn', "I'm On The Way (Start Travel)")}</span>
                </button>
              </div>
            )}

            {/* STEP 2 Action: Mark Arrival (Geofence Check) */}
            {isEnRoute && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
                <h3 className="font-bold text-base text-white flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-emerald-400" />
                  {t('exec.stage_arrived_title', 'Step 2: Verify Physical Arrival at Premises')}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  When you reach the destination, tap below. The system automatically validates your coordinates against the 150m arrival geofence.
                </p>
                <button
                  onClick={handleMarkArrived}
                  disabled={isProcessing}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center justify-center space-x-2 transition-transform active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{t('exec.stage_arrived_btn', "I've Arrived at Customer Location")}</span>
                </button>
              </div>
            )}

            {/* STEP 3 Action: Enter Customer 4-digit PIN OTP */}
            {isArrived && (
              <form onSubmit={handleStartService} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
                <h3 className="font-bold text-base text-white flex items-center">
                  <KeyRound className="w-5 h-5 mr-2 text-amber-400" />
                  {t('exec.stage_otp_title', 'Step 3: Enter Customer 4-Digit Service PIN')}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {t('exec.stage_otp_placeholder', 'Ask the customer for their 4-digit service PIN displayed on their mobile screen.')}
                </p>

                <div className="flex space-x-3">
                  <input
                    type="text"
                    maxLength={4}
                    required
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="4-digit PIN"
                    className="flex-1 px-4 py-3.5 bg-slate-800 border border-slate-700 text-center font-mono text-xl tracking-widest text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={isProcessing || otpInput.length !== 4}
                    className="px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg disabled:opacity-50 cursor-pointer"
                  >
                    {t('exec.stage_otp_btn', 'Verify PIN & Start Service')}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4 Action: Live Duration Stopwatch, Extra Charges & Completion */}
            {isStarted && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
                <div className="text-center space-y-1">
                  <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                    Service Live Stopwatch
                  </span>
                  <div className="text-5xl font-mono font-black text-emerald-400">
                    {formatTimer(elapsedSeconds)}
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    Started At: {formatTime(job.startedAt)}
                  </span>
                </div>

                {job.extraChargeAmount > 0 && (
                  <div className="bg-slate-800/80 p-4 rounded-2xl text-xs space-y-1 border border-slate-700">
                    <div className="flex justify-between font-bold">
                      <span>Additional Work (₹{job.extraChargeAmount})</span>
                      <span className={job.extraChargeApproved ? 'text-emerald-400' : 'text-amber-400'}>
                        {job.extraChargeApproved ? '✓ Approved by Customer' : '⏳ Pending Customer Approval'}
                      </span>
                    </div>
                    <p className="text-slate-400">{job.extraChargeReason}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => setShowExtraModal(true)}
                    className="py-3.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs sm:text-sm rounded-2xl border border-amber-500/30 flex items-center justify-center space-x-2"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>{t('exec.extra_charge_btn', '+ Extra Work')}</span>
                  </button>

                  <button
                    onClick={handleCompleteService}
                    disabled={isProcessing}
                    className="py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Check className="w-5 h-5 stroke-[3]" />
                    <span>{t('exec.stage_complete_btn', 'Complete Service & Collect Payment')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: Completed Job Confirmation & Wallet Summary */}
            {isCompleted && (
              <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-3xl p-8 text-center space-y-4 shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white">Job Successfully Completed & Settled!</h3>
                <p className="text-xs sm:text-sm text-emerald-200">
                  Net earnings of <strong className="text-white">₹{netPartnerPayout}</strong> have been credited to your available wallet.
                </p>
                <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 text-xs text-slate-300">
                  <span>Started: {formatTime(job.startedAt)} • Finished: {formatTime(job.completedAt)} • Duration: {formatTimer(elapsedSeconds)}</span>
                </div>
                <button
                  onClick={() => navigate('/earnings')}
                  className="py-3 px-8 bg-emerald-500 text-slate-950 font-black text-xs sm:text-sm rounded-2xl hover:bg-emerald-400 shadow-lg cursor-pointer"
                >
                  View Earnings Ledger & Withdraw
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Extra Charges Modal */}
      {showExtraModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 text-white">
            <h3 className="font-bold text-base text-white">Request Additional Work Charges</h3>
            <p className="text-xs text-slate-400">
              Customer must approve before this amount is added to the final invoice.
            </p>

            <form onSubmit={handleRequestExtraWork} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Extra Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="50"
                  value={extraAmount}
                  onChange={(e) => setExtraAmount(e.target.value)}
                  placeholder="e.g. 300"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-white rounded-2xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Reason for extra work</label>
                <textarea
                  required
                  value={extraReason}
                  onChange={(e) => setExtraReason(e.target.value)}
                  placeholder="e.g. Additional 5-meter copper piping and bracket required"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-white rounded-2xl text-xs h-24"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExtraModal(false)}
                  className="py-3 bg-slate-800 font-bold text-xs rounded-2xl text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-2xl"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <WorkerChatDrawer
        bookingId={job.id}
        customerName={job.customer.name}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
};
