import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  TrendingUp,
  Star,
  Search,
  MapPin,
  RefreshCw,
  Sparkles,
  Banknote,
  CreditCard,
  Briefcase
} from 'lucide-react';
import { WorkerApiClient } from '../services/api';
import { useWorkerAuth } from '../context/WorkerAuthContext';
import { useWorkerLanguage } from '../context/LanguageContext';
import { WorkerHeader } from '../components/WorkerHeader';

export const WorkerServicesPage: React.FC = () => {
  const navigate = useNavigate();
  const { worker } = useWorkerAuth();
  const { t } = useWorkerLanguage();
  const [jobs, setJobs] = useState<any[]>([]);
  const [earningsData, setEarningsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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
    fetchData();
  }, []);

  if (!worker) {
    navigate('/auth');
    return null;
  }

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

  const filteredHistory = completedJobs
    .filter((j: any) => {
      const time = new Date(j.updatedAt || j.createdAt || j.scheduledDate).getTime();
      if (historyFilter === 'TODAY') return time >= startOfToday;
      if (historyFilter === 'WEEK') return time >= sevenDaysAgo;
      if (historyFilter === 'MONTH') return time >= thirtyDaysAgo;
      return true;
    })
    .filter((j: any) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        j.service?.name?.toLowerCase().includes(q) ||
        j.customer?.name?.toLowerCase().includes(q) ||
        j.bookingNumber?.toLowerCase().includes(q) ||
        j.address?.city?.toLowerCase().includes(q)
      );
    });

  return (
    <div className="min-h-screen pb-24 bg-slate-50 text-slate-900 font-sans">
      <WorkerHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Navigation Breadcrumb & Refresh */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <button
              onClick={() => navigate('/')}
              className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 flex items-center space-x-1 cursor-pointer transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-bold">Dashboard</span>
            </button>
            <span>/</span>
            <span className="text-slate-900 font-bold flex items-center space-x-1.5">
              <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
              <span>Service Performance & History</span>
            </span>
          </div>

          <button
            onClick={fetchData}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer shadow-sm"
            title="Refresh Services"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Section Header */}
        <div className="bg-gradient-to-r from-emerald-50 via-white to-indigo-50 border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-600 block">
                Partner Services Analytics
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Services Done: Today to Past
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Track your completed service volumes, customer history, and settled earnings over time.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-center shadow-sm">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Settled</span>
                <span className="text-lg font-black text-emerald-600">
                  ₹{earningsData?.totalLifetimeEarnings || 0}
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-center shadow-sm">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Rating</span>
                <span className="text-lg font-black text-amber-500 flex items-center justify-center space-x-1">
                  <span>{worker.workerProfile.averageRating || 5.0}</span>
                  <Star className="w-4 h-4 fill-amber-400" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Timeframe Breakdown Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Today */}
          <div className="bg-white border border-slate-200 hover:border-emerald-500/40 rounded-3xl p-4 sm:p-5 space-y-1.5 shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider block">
                Today's Services
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">
              {earningsData?.todayJobsCount ?? todayCompletedJobs.length} <span className="text-xs font-bold text-slate-400">jobs</span>
            </div>
            <div className="text-xs font-bold text-slate-900 flex items-center justify-between pt-1.5 border-t border-slate-100">
              <span className="text-slate-500 font-normal">Earned:</span>
              <span className="text-emerald-600 font-black">₹{earningsData?.todayEarnings || 0}</span>
            </div>
          </div>

          {/* 2. This Week */}
          <div className="bg-white border border-slate-200 hover:border-indigo-500/40 rounded-3xl p-4 sm:p-5 space-y-1.5 shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider block">
                This Week (7 Days)
              </span>
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-600">
              {earningsData?.weekJobsCount ?? weekCompletedJobs.length} <span className="text-xs font-bold text-slate-400">jobs</span>
            </div>
            <div className="text-xs font-bold text-slate-900 flex items-center justify-between pt-1.5 border-t border-slate-100">
              <span className="text-slate-500 font-normal">Earned:</span>
              <span className="text-indigo-600 font-black">₹{earningsData?.weekEarnings || 0}</span>
            </div>
          </div>

          {/* 3. This Month */}
          <div className="bg-white border border-slate-200 hover:border-cyan-500/40 rounded-3xl p-4 sm:p-5 space-y-1.5 shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider block">
                This Month (30 Days)
              </span>
              <TrendingUp className="w-3.5 h-3.5 text-cyan-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-cyan-600">
              {earningsData?.monthJobsCount ?? monthCompletedJobs.length} <span className="text-xs font-bold text-slate-400">jobs</span>
            </div>
            <div className="text-xs font-bold text-slate-900 flex items-center justify-between pt-1.5 border-t border-slate-100">
              <span className="text-slate-500 font-normal">Earned:</span>
              <span className="text-cyan-600 font-black">₹{earningsData?.monthEarnings || 0}</span>
            </div>
          </div>

          {/* 4. Total Past / Lifetime */}
          <div className="bg-white border border-slate-200 hover:border-amber-500/40 rounded-3xl p-4 sm:p-5 space-y-1.5 shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider block">
                All-Time Lifetime
              </span>
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {earningsData?.totalJobsCompleted || worker.workerProfile.totalJobsCompleted || completedJobs.length} <span className="text-xs font-bold text-slate-400">jobs</span>
            </div>
            <div className="text-xs font-bold text-slate-900 flex items-center justify-between pt-1.5 border-t border-slate-100">
              <span className="text-slate-500 font-normal">Total Earned:</span>
              <span className="text-emerald-600 font-black">₹{earningsData?.totalLifetimeEarnings || 0}</span>
            </div>
          </div>
        </div>

        {/* Detailed Completed Services Timeline List with Filters & Search */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <span>Completed Services List</span>
                <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {filteredHistory.length} Services
                </span>
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search service, customer, booking..."
                  className="pl-8 pr-3 py-1.5 bg-slate-50 text-slate-900 rounded-xl text-xs border border-slate-200 focus:outline-none focus:border-emerald-500 w-full sm:w-64"
                />
              </div>

              {/* Timeframe Filter Tabs */}
              <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-2xl border border-slate-200 text-xs">
                <button
                  onClick={() => setHistoryFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    historyFilter === 'ALL'
                      ? 'bg-emerald-500 text-white shadow'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({completedJobs.length})
                </button>
                <button
                  onClick={() => setHistoryFilter('TODAY')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    historyFilter === 'TODAY'
                      ? 'bg-emerald-500 text-white shadow'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Today ({todayCompletedJobs.length})
                </button>
                <button
                  onClick={() => setHistoryFilter('WEEK')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    historyFilter === 'WEEK'
                      ? 'bg-emerald-500 text-white shadow'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Week ({weekCompletedJobs.length})
                </button>
                <button
                  onClick={() => setHistoryFilter('MONTH')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    historyFilter === 'MONTH'
                      ? 'bg-emerald-500 text-white shadow'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Month ({monthCompletedJobs.length})
                </button>
              </div>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-12 text-center text-xs text-slate-500 space-y-3">
              <CheckCircle2 className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No completed services found for this filter.</p>
              <p className="text-slate-500 max-w-sm mx-auto">
                Completed jobs for this timeframe will be listed here automatically with payment breakdowns.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((j: any) => (
                <div
                  key={j.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors shadow-sm"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-slate-500 uppercase font-mono font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        #{j.bookingNumber}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        ✓ Completed & Settled
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-slate-900">{j.service?.name}</h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Customer: <strong className="text-slate-800">{j.customer?.name}</strong></span>
                      <span>•</span>
                      <span>📅 {j.scheduledDate} {j.scheduledTimeSlot ? `(${j.scheduledTimeSlot})` : ''}</span>
                    </div>

                    <p className="text-[11px] text-slate-500 flex items-center space-x-1 truncate max-w-lg">
                      <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span>{j.address?.addressLine}, {j.address?.city}</span>
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                    <div className="text-right">
                      <span className="text-lg font-black text-emerald-600 block">
                        +₹{Math.round(j.totalAmount * 0.8)}
                      </span>
                      <span className="text-[10px] text-slate-400">80% Net Payout</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 flex items-center space-x-1">
                      {j.payment?.paymentMethod === 'CASH' || j.paymentMethod === 'CASH' ? (
                        <>
                          <Banknote className="w-3 h-3 text-emerald-600" />
                          <span>Cash Collected</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-3 h-3 text-indigo-600" />
                          <span>Online Paid</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
