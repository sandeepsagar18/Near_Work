import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  TrendingUp,
  Star,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronRight,
  ShieldAlert,
  Wallet,
  ArrowRight,
  Check,
  X,
  Bell,
  RefreshCw,
  Navigation
} from 'lucide-react';
import { WorkerApiClient } from '../services/api';
import { useWorkerAuth } from '../context/WorkerAuthContext';
import { useWorkerLanguage } from '../context/LanguageContext';
import { WorkerHeader } from '../components/WorkerHeader';
import { JobRequestAlert } from '../components/JobRequestAlert';

export const WorkerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { worker, activeJobAlert, setActiveJobAlert, recordDecline, toggleOnlineStatus } = useWorkerAuth();
  const { t } = useWorkerLanguage();
  const [jobs, setJobs] = useState<any[]>([]);
  const [earningsData, setEarningsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');

  const getDeclineCount = (bookingId: string) => {
    try {
      const saved = sessionStorage.getItem('nw_declined_counts');
      const map = saved ? JSON.parse(saved) : {};
      return map[bookingId] || 0;
    } catch {
      return 0;
    }
  };

  const isOnline = worker?.workerProfile?.status === 'ONLINE';

  const fetchData = async () => {
    try {
      const [jobsRes, earnRes] = await Promise.all([
        WorkerApiClient.request('/worker/jobs'),
        WorkerApiClient.request('/worker/earnings')
      ]);

      if (jobsRes.success && jobsRes.data) {
        setJobs(jobsRes.data);

        // If online and not already viewing an alert, surface any available incoming job
        const incoming = jobsRes.data.find(
          (j: any) =>
            (j.status === 'SEARCHING_WORKER' || j.status === 'WORKER_ASSIGNED') &&
            (!j.workerId || j.workerId === worker?.workerProfile?.id || j.worker?.userId === worker?.id) &&
            getDeclineCount(j.id) < 2
        );

        if (incoming && !activeJobAlert && isOnline) {
          setActiveJobAlert({
            bookingId: incoming.id,
            bookingNumber: incoming.bookingNumber,
            serviceName: incoming.service?.name || 'Service Job',
            customerName: incoming.customer?.name || 'Customer',
            scheduledDate: incoming.scheduledDate,
            scheduledTimeSlot: incoming.scheduledTimeSlot,
            address: `${incoming.address?.addressLine || ''}, ${incoming.address?.city || ''}`,
            distanceKm: 2.5,
            estimatedEarnings: Math.round(Number(incoming.totalAmount) * 0.8),
            expiresInSeconds: 60
          });
        }
      }
      if (earnRes.success) setEarningsData(earnRes.data || null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (worker) {
      fetchData();
      const interval = setInterval(fetchData, 3000);

      // Automatically sync real device/PC browser GPS to backend
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude, heading, speed, altitude, accuracy } = position.coords;
            try {
              await WorkerApiClient.request('/worker/location', {
                method: 'POST',
                body: JSON.stringify({
                  latitude,
                  longitude,
                  heading: heading || 0,
                  speed: speed ? Math.round(speed * 3.6) : 0,
                  accuracy: accuracy || 5,
                  altitude: altitude || 0
                })
              });
            } catch (e) {
              // non-blocking
            }
          },
          () => {},
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }

      return () => clearInterval(interval);
    } else {
      setIsLoading(false);
    }
  }, [worker]);

  const handleAcceptJob = async (bookingId: string) => {
    setIsProcessingAction(true);
    try {
      const res = await WorkerApiClient.request(`/bookings/${bookingId}/accept`, {
        method: 'POST'
      });
      if (res.success) {
        setActiveJobAlert(null);
        navigate(`/job/${bookingId}`);
      } else {
        alert(res.message || 'Job was already taken by another worker');
        fetchData();
      }
    } catch (e: any) {
      alert(e.message || 'Failed to accept job');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRejectJob = async (bookingId: string) => {
    setIsProcessingAction(true);
    recordDecline(bookingId);
    try {
      await WorkerApiClient.request(`/bookings/${bookingId}/reject`, {
        method: 'POST'
      });
      setActiveJobAlert(null);
      fetchData();
    } catch (e) {
      fetchData();
    } finally {
      setIsProcessingAction(false);
    }
  };

  if (!worker) {
    navigate('/auth');
    return null;
  }

  const pendingAssignmentJob = isOnline
    ? jobs.find(
        (j) =>
          (j.status === 'WORKER_ASSIGNED' || j.status === 'SEARCHING_WORKER') &&
          (!j.workerId || j.workerId === worker.workerProfile.id || j.worker?.userId === worker.id) &&
          getDeclineCount(j.id) < 2
      )
    : null;
  const activeJob = jobs.find(
    (j) =>
      ['WORKER_ACCEPTED', 'WORKER_EN_ROUTE', 'WORKER_ARRIVED', 'SERVICE_STARTED'].includes(j.status) &&
      (j.workerId === worker.workerProfile.id || j.worker?.userId === worker.id || j.workerId === worker.id)
  );
  const completedJobs = jobs.filter(
    (j) =>
      j.status === 'COMPLETED' &&
      (j.workerId === worker.workerProfile.id || j.worker?.userId === worker.id || j.workerId === worker.id)
  );

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  const todayCompletedJobs = completedJobs.filter((j: any) => {
    const time = new Date(j.updatedAt || j.createdAt || j.scheduledDate).getTime();
    return time >= startOfToday;
  });

  const weekCompletedJobs = completedJobs.filter((j: any) => {
    const time = new Date(j.updatedAt || j.createdAt || j.scheduledDate).getTime();
    return time >= sevenDaysAgo;
  });

  const monthCompletedJobs = completedJobs.filter((j: any) => {
    const time = new Date(j.updatedAt || j.createdAt || j.scheduledDate).getTime();
    return time >= thirtyDaysAgo;
  });

  const filteredHistory = completedJobs.filter((j: any) => {
    const time = new Date(j.updatedAt || j.createdAt || j.scheduledDate).getTime();
    if (historyFilter === 'TODAY') return time >= startOfToday;
    if (historyFilter === 'WEEK') return time >= sevenDaysAgo;
    if (historyFilter === 'MONTH') return time >= thirtyDaysAgo;
    return true;
  });

  return (
    <div className="min-h-screen pb-24 bg-slate-50 text-slate-900">
      <WorkerHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Verification Status Warning if pending */}
        {worker.workerProfile.verificationStatus !== 'VERIFIED' && (
          <div className="bg-amber-50 border border-amber-300 rounded-3xl p-4 sm:p-5 flex items-center space-x-3 text-amber-800 shadow-sm">
            <ShieldAlert className="w-6 h-6 flex-shrink-0 text-amber-600" />
            <div className="text-xs sm:text-sm">
              <span className="font-bold block text-amber-900">Document Verification Under Review</span>
              Admin is verifying your Aadhaar and Trade Certificate. You will receive live dispatches shortly.
            </div>
          </div>
        )}



        {/* PROMINENT INCOMING JOB BANNER IF ASSIGNED */}
        {pendingAssignmentJob && (
          <div className="bg-gradient-to-r from-emerald-50 via-white to-indigo-50 border-2 border-emerald-500 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl animate-pulse">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Zap className="w-6 h-6 animate-bounce text-emerald-600" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-600 block">
                    {t('worker.dispatch_title', '⚡ Incoming Service Dispatch!')}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                    {pendingAssignmentJob.service.name}
                  </h3>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block font-semibold">{t('worker.net_payout', 'Your Net Payout')}</span>
                <span className="text-2xl font-black text-emerald-600">
                  ₹{Math.round(pendingAssignmentJob.totalAmount * 0.8)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-slate-500 font-bold block">{t('worker.customer', 'Customer')}:</span>
                <span className="font-semibold text-slate-900">{pendingAssignmentJob.customer.name}</span>
                <p className="text-slate-500 mt-1 line-clamp-1">
                  {pendingAssignmentJob.address.addressLine}, {pendingAssignmentJob.address.city}
                </p>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-slate-500 font-bold block">{t('worker.schedule', 'Schedule')}:</span>
                <span className="font-semibold text-slate-900">
                  {pendingAssignmentJob.scheduledDate} ({pendingAssignmentJob.scheduledTimeSlot})
                </span>
                <span className="text-emerald-600 block mt-1 font-bold">
                  {pendingAssignmentJob.payment?.paymentMethod === 'CASH' ? '💵 Cash Payment upon Completion' : '💳 Prepaid Online'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleRejectJob(pendingAssignmentJob.id)}
                disabled={isProcessingAction}
                className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl border border-slate-300 flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4 text-red-500" />
                <span>{t('worker.decline_btn', 'Decline')}</span>
              </button>

              <button
                onClick={() => handleAcceptJob(pendingAssignmentJob.id)}
                disabled={isProcessingAction}
                className="py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center space-x-2 cursor-pointer transition-all"
              >
                <Check className="w-5 h-5 stroke-[3]" />
                <span>{t('worker.accept_btn', 'Accept Job & Start')}</span>
              </button>
            </div>
          </div>
        )}



        {/* 2-Column Responsive Layout for Active Job & Service History Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active Ongoing Job Card */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-900">{t('worker.active_job_title', 'Active Service Job')}</h2>
              <button
                onClick={fetchData}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {activeJob ? (
              <div className="bg-white border border-indigo-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full">
                      {activeJob.status.replace(/_/g, ' ')}
                    </span>
                    <button
                      onClick={() => handleRejectJob(activeJob.id)}
                      className="text-[10px] text-red-600 hover:text-red-700 font-bold bg-red-50 border border-red-200 px-2.5 py-1 rounded-full cursor-pointer transition-colors"
                    >
                      Release Job
                    </button>
                  </div>
                  <span className="text-base font-black text-emerald-600">
                    Net: ₹{Math.round(activeJob.totalAmount * 0.8)}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900">{activeJob.service.name}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    Customer: <strong className="text-slate-900">{activeJob.customer.name}</strong> • Slot: {activeJob.scheduledTimeSlot} ({activeJob.scheduledDate})
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {activeJob.payment?.paymentMethod === 'CASH' || activeJob.paymentMethod === 'CASH' ? (
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                      💵 Collect ₹{activeJob.totalAmount} Cash/UPI from Customer
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full">
                      💳 Prepaid Online (₹{activeJob.totalAmount})
                    </span>
                  )}
                </div>

                <div className="flex items-start space-x-2 text-xs sm:text-sm text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <MapPin className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <span>{activeJob.address.addressLine}, {activeJob.address.city}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    onClick={() => {
                      if (activeJob.address?.latitude && activeJob.address?.longitude) {
                        const url = `https://www.google.com/maps/dir/?api=1&destination=${activeJob.address.latitude},${activeJob.address.longitude}&travelmode=driving`;
                        window.open(url, '_blank');
                      }
                    }}
                    className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-emerald-700 border border-emerald-300 font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center space-x-2 transition cursor-pointer"
                  >
                    <Navigation className="w-4 h-4 text-emerald-600" />
                    <span>Google Maps</span>
                  </button>

                  <button
                    onClick={() => navigate(`/job/${activeJob.id}`)}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-xl shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-transform active:scale-95 cursor-pointer"
                  >
                    <span>{t('worker.open_cockpit_btn', 'Open Cockpit')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : !pendingAssignmentJob ? (
              <div className={`border rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm transition-all ${
                isOnline ? 'bg-white border-slate-200' : 'bg-slate-100/70 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative flex h-3.5 w-3.5">
                      {isOnline ? (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 shadow-[0_0_12px_#10b981]"></span>
                        </>
                      ) : (
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-slate-400"></span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {isOnline ? 'Ready for Next Service' : 'Duty Currently Offline'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {isOnline
                          ? 'Online & Listening for nearby service requests in real-time'
                          : 'Turn on Online mode above to start receiving service bookings.'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-600 border border-slate-300'
                  }`}>
                    {isOnline ? '🟢 Online' : '🔴 Offline'}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Service History Timeline (Today to Past) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Completed Services Timeline</span>
                <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {filteredHistory.length} Done
                </span>
              </h2>

              {/* Timeframe Filter Tabs */}
              <div className="flex items-center space-x-1 bg-white p-1 rounded-2xl border border-slate-200 text-xs shadow-sm">
                <button
                  onClick={() => setHistoryFilter('ALL')}
                  className={`px-2.5 py-1 rounded-xl font-bold transition cursor-pointer ${
                    historyFilter === 'ALL'
                      ? 'bg-emerald-500 text-white shadow'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({completedJobs.length})
                </button>
                <button
                  onClick={() => setHistoryFilter('TODAY')}
                  className={`px-2.5 py-1 rounded-xl font-bold transition cursor-pointer ${
                    historyFilter === 'TODAY'
                      ? 'bg-emerald-500 text-white shadow'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Today ({todayCompletedJobs.length})
                </button>
                <button
                  onClick={() => setHistoryFilter('WEEK')}
                  className={`px-2.5 py-1 rounded-xl font-bold transition cursor-pointer ${
                    historyFilter === 'WEEK'
                      ? 'bg-emerald-500 text-white shadow'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Week ({weekCompletedJobs.length})
                </button>
                <button
                  onClick={() => setHistoryFilter('MONTH')}
                  className={`px-2.5 py-1 rounded-xl font-bold transition cursor-pointer ${
                    historyFilter === 'MONTH'
                      ? 'bg-emerald-500 text-white shadow'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Month ({monthCompletedJobs.length})
                </button>
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-xs text-slate-500 space-y-2 shadow-sm">
                <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="font-bold text-slate-700">No completed services found for this timeframe.</p>
                <p className="text-slate-500">Completed bookings in this period will appear here automatically.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {filteredHistory.map((j) => (
                  <div
                    key={j.id}
                    className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors shadow-sm"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-slate-500 uppercase font-mono font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          #{j.bookingNumber}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          ✓ Completed
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 mt-1">{j.service.name}</h4>
                      <p className="text-xs text-slate-500">
                        Customer: <strong className="text-slate-800">{j.customer.name}</strong> • {j.scheduledDate} {j.scheduledTimeSlot ? `(${j.scheduledTimeSlot})` : ''}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate max-w-md">
                        📍 {j.address?.addressLine}, {j.address?.city}
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                      <span className="text-base font-black text-emerald-600 block">
                        +₹{Math.round(j.totalAmount * 0.8)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                        {j.payment?.paymentMethod === 'CASH' || j.paymentMethod === 'CASH' ? '💵 Cash Collected' : '💳 Online Paid'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
