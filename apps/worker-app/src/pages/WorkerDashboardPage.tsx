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
  RefreshCw
} from 'lucide-react';
import { WorkerApiClient } from '../services/api';
import { useWorkerAuth } from '../context/WorkerAuthContext';
import { useWorkerLanguage } from '../context/LanguageContext';
import { WorkerHeader } from '../components/WorkerHeader';
import { JobRequestAlert } from '../components/JobRequestAlert';
import { WorkerLiveNavigationMap } from '../components/WorkerLiveNavigationMap';

export const WorkerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { worker, activeJobAlert, setActiveJobAlert, recordDecline } = useWorkerAuth();
  const { t } = useWorkerLanguage();
  const [jobs, setJobs] = useState<any[]>([]);
  const [earningsData, setEarningsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const fetchData = async () => {
    try {
      const [jobsRes, earnRes] = await Promise.all([
        WorkerApiClient.request('/worker/jobs'),
        WorkerApiClient.request('/worker/earnings')
      ]);

      if (jobsRes.success) setJobs(jobsRes.data || []);
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
      const interval = setInterval(fetchData, 4000);

      // Automatically sync real device/PC browser GPS to Turso
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

  const pendingAssignmentJob = jobs.find(
    (j) => j.status === 'WORKER_ASSIGNED' || j.status === 'SEARCHING_WORKER'
  );
  const activeJob = jobs.find((j) =>
    ['WORKER_ACCEPTED', 'WORKER_EN_ROUTE', 'WORKER_ARRIVED', 'SERVICE_STARTED'].includes(j.status)
  );
  const completedJobs = jobs.filter((j) => j.status === 'COMPLETED');

  return (
    <div className="min-h-screen pb-24 bg-slate-950 text-slate-100">
      <WorkerHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Verification Status Warning if pending */}
        {worker.workerProfile.verificationStatus !== 'VERIFIED' && (
          <div className="bg-amber-950/80 border border-amber-500/40 rounded-3xl p-4 sm:p-5 flex items-center space-x-3 text-amber-300">
            <ShieldAlert className="w-6 h-6 flex-shrink-0" />
            <div className="text-xs sm:text-sm">
              <span className="font-bold block">Document Verification Under Review</span>
              Admin is verifying your Aadhaar and Trade Certificate. You will receive live dispatches shortly.
            </div>
          </div>
        )}

        {/* PROMINENT INCOMING JOB BANNER IF ASSIGNED */}
        {pendingAssignmentJob && (
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border-2 border-emerald-500 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl animate-pulse">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-500/30">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Zap className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400 block">
                    {t('worker.dispatch_title', '⚡ Incoming Service Dispatch!')}
                  </span>
                  <h3 className="text-xl font-bold text-white mt-0.5">
                    {pendingAssignmentJob.service.name}
                  </h3>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block font-semibold">{t('worker.net_payout', 'Your Net Payout')}</span>
                <span className="text-2xl font-black text-emerald-400">
                  ₹{Math.round(pendingAssignmentJob.totalAmount * 0.8)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 font-bold block">{t('worker.customer', 'Customer')}:</span>
                <span className="font-semibold text-white">{pendingAssignmentJob.customer.name}</span>
                <p className="text-slate-400 mt-1 line-clamp-1">
                  {pendingAssignmentJob.address.addressLine}, {pendingAssignmentJob.address.city}
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 font-bold block">{t('worker.schedule', 'Schedule')}:</span>
                <span className="font-semibold text-white">
                  {pendingAssignmentJob.scheduledDate} ({pendingAssignmentJob.scheduledTimeSlot})
                </span>
                <span className="text-emerald-400 block mt-1 font-bold">
                  {pendingAssignmentJob.payment?.paymentMethod === 'CASH' ? '💵 Cash Payment upon Completion' : '💳 Prepaid Online'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleRejectJob(pendingAssignmentJob.id)}
                disabled={isProcessingAction}
                className="py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-2xl border border-slate-700 flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <X className="w-4 h-4 text-red-400" />
                <span>{t('worker.decline_btn', 'Decline')}</span>
              </button>

              <button
                onClick={() => handleAcceptJob(pendingAssignmentJob.id)}
                disabled={isProcessingAction}
                className="py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Check className="w-5 h-5 stroke-[3]" />
                <span>{t('worker.accept_btn', 'Accept Job & Start')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Today's KPI Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2 shadow-lg">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
              {t('worker.today_earnings', "TODAY'S EARNINGS")}
            </span>
            <div className="text-3xl font-black text-emerald-400">
              ₹{earningsData?.todayEarnings || 0}
            </div>
            <span className="text-[11px] text-slate-500 block">
              {t('worker.earnings_subtitle', 'Withdrawable instantly to bank')}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2 shadow-lg">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
              {t('worker.completed_jobs', 'COMPLETED SERVICES')}
            </span>
            <div className="text-3xl font-black text-white">
              {worker.workerProfile.totalJobsCompleted || 0}
            </div>
            <span className="text-[11px] text-slate-500 block">
              {t('worker.jobs_subtitle', 'Total jobs completed on NearWork')}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2 shadow-lg">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
              {t('worker.rating', 'CUSTOMER RATING')}
            </span>
            <div className="flex items-center text-amber-400 font-black text-3xl space-x-2">
              <span>{worker.workerProfile.averageRating || 5.0}</span>
              <Star className="w-6 h-6 fill-amber-400" />
            </div>
            <span className="text-[11px] text-slate-500 block">
              {t('worker.rating_subtitle', '5-star rating performance')}
            </span>
          </div>
        </div>

        {/* 2-Column Responsive Layout for Active Job & Recent History on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active Ongoing Job Card */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-white">{t('worker.active_job_title', 'Active Service Job')}</h2>
              <button
                onClick={fetchData}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {activeJob ? (
              <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full">
                    {activeJob.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-base font-black text-emerald-400">
                    Net: ₹{Math.round(activeJob.totalAmount * 0.8)}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white">{activeJob.service.name}</h3>
                  <p className="text-xs sm:text-sm text-indigo-200 mt-1">
                    Customer: <strong>{activeJob.customer.name}</strong> • Slot: {activeJob.scheduledTimeSlot} ({activeJob.scheduledDate})
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {activeJob.payment?.paymentMethod === 'CASH' || activeJob.paymentMethod === 'CASH' ? (
                    <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-full">
                      💵 Collect ₹{activeJob.totalAmount} Cash/UPI from Customer
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 px-2.5 py-1 rounded-full">
                      💳 Prepaid Online (₹{activeJob.totalAmount})
                    </span>
                  )}
                </div>

                <div className="flex items-start space-x-2 text-xs sm:text-sm text-slate-300 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
                  <MapPin className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <span>{activeJob.address.addressLine}, {activeJob.address.city}</span>
                </div>

                {activeJob.address?.latitude && activeJob.address?.longitude && (
                  <div className="pt-2">
                    <WorkerLiveNavigationMap
                      customerLat={activeJob.address.latitude}
                      customerLng={activeJob.address.longitude}
                      customerAddress={`${activeJob.address.addressLine}, ${activeJob.address.city}`}
                    />
                  </div>
                )}

                <button
                  onClick={() => navigate(`/job/${activeJob.id}`)}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-transform active:scale-95 cursor-pointer"
                >
                  <span>{t('worker.open_cockpit_btn', 'Open Job Execution Panel')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : !pendingAssignmentJob ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center text-xs text-slate-400 space-y-2">
                <p className="font-bold text-white text-sm">{t('worker.no_active_job', 'No Active Job Right Now')}</p>
                <p>{t('worker.toggle_online_hint', 'Toggle your status to ONLINE to receive instant customer job dispatch alerts.')}</p>
              </div>
            ) : null}
          </div>

          {/* Recent Completed Jobs */}
          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-base font-bold text-white">{t('worker.recent_history', 'Recent Service History')}</h2>

            {completedJobs.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center text-xs text-slate-400">
                {t('worker.no_history', 'No completed jobs yet. Completed jobs will appear here with earnings breakdown.')}
              </div>
            ) : (
              <div className="space-y-3">
                {completedJobs.slice(0, 5).map((j) => (
                  <div
                    key={j.id}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 flex justify-between items-center hover:border-slate-700 transition-colors shadow-sm"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">
                        #{j.bookingNumber}
                      </span>
                      <h4 className="font-bold text-sm text-white">{j.service.name}</h4>
                      <p className="text-xs text-slate-400">
                        {j.customer.name} • {j.scheduledDate}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-emerald-400 block">
                        +₹{Math.round(j.totalAmount * 0.8)}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block mt-1">
                        Settled
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
