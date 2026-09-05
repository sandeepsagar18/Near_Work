import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  CreditCard,
  Check,
  ArrowLeft
} from 'lucide-react';
import { WorkerApiClient } from '../services/api';
import { useWorkerAuth } from '../context/WorkerAuthContext';
import { WorkerHeader } from '../components/WorkerHeader';

export const WorkerEarningsPage: React.FC = () => {
  const navigate = useNavigate();
  const { worker, refreshProfile } = useWorkerAuth();
  const [data, setData] = useState<any>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchEarnings = async () => {
    try {
      const res = await WorkerApiClient.request('/worker/earnings');
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      setError('Please enter a valid withdrawal amount');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      const res = await WorkerApiClient.request('/worker/payouts', {
        method: 'POST',
        body: JSON.stringify({ amount })
      });

      if (res.success) {
        setMessage(`Withdrawal request for ₹${amount} submitted successfully!`);
        setWithdrawAmount('');
        await fetchEarnings();
        await refreshProfile();
      } else {
        setError(res.message || 'Failed to submit withdrawal request');
      }
    } catch (err: any) {
      setError(err.message || 'Withdrawal failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-slate-50 text-slate-900 font-sans">
      <WorkerHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 flex items-center space-x-1 shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-bold">Dashboard</span>
          </button>
          <span>/</span>
          <span className="text-slate-900 font-bold">Earnings & Wallet</span>
        </div>

        {message && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-3xl text-xs sm:text-sm flex items-center space-x-2 shadow-sm">
            <Check className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded-3xl text-xs sm:text-sm flex items-center space-x-2 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* 2-Column Responsive Layout on Desktop/Laptop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Wallet Balance & Withdrawal Form */}
          <div className="lg:col-span-6 space-y-6">
            {/* Wallet Hero Card */}
            <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
              <span className="text-xs text-emerald-600 font-black uppercase tracking-wider block">
                Available Wallet Balance
              </span>
              <div className="text-4xl sm:text-5xl font-black text-slate-900">
                ₹{data.availableBalance}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs sm:text-sm text-slate-600">
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Today's Earnings</span>
                  <span className="font-black text-emerald-600 text-base">₹{data.todayEarnings}</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Withdrawn</span>
                  <span className="font-black text-slate-900 text-base">₹{data.totalWithdrawn}</span>
                </div>
              </div>
            </div>

            {/* Payout Withdrawal Form */}
            <form onSubmit={handleWithdraw} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
              <h3 className="font-bold text-base text-slate-900 flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-emerald-600" />
                Direct Bank Transfer Payout
              </h3>

              <div className="bg-slate-50 p-4 rounded-2xl text-xs space-y-1 text-slate-600 border border-slate-200">
                <span className="font-bold text-slate-900 block">Beneficiary Bank Account</span>
                <p>Account: {worker?.workerProfile?.bankAccountNumber || '•••• •••• 4829'}</p>
                <p>IFSC: {worker?.workerProfile?.bankIfsc || 'SBIN0001234'}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Withdraw Amount (₹)</label>
                <input
                  type="number"
                  required
                  max={data.availableBalance}
                  min="100"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder={`Max ₹${data.availableBalance}`}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || data.availableBalance < 100}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <ArrowUpRight className="w-5 h-5" />
                <span>{isSubmitting ? 'Processing...' : 'Request Instant Payout'}</span>
              </button>
            </form>
          </div>

          {/* Right Column: Earnings Breakdown & Payout Records */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
              <h3 className="font-bold text-base text-slate-900">Recent Service Earnings Ledger</h3>

              {data.earnings?.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No earnings records yet.</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {data.earnings?.map((e: any) => (
                    <div
                      key={e.id}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Job #{e.booking?.bookingNumber}</span>
                        <span className="text-[11px] text-slate-500">
                          Gross: ₹{e.grossAmount} • Commission (-20%): ₹{e.platformCommission}
                        </span>
                      </div>
                      <span className="text-sm font-black text-emerald-600">
                        +₹{e.netWorkerEarning}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payout History */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
              <h3 className="font-bold text-base text-slate-900">Payout Withdrawal Requests</h3>

              {data.payouts?.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No payout history yet.</p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {data.payouts?.map((p: any) => (
                    <div
                      key={p.id}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">#{p.payoutNumber}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-slate-900 block">₹{p.amount}</span>
                        <span className="text-[10px] font-black text-emerald-600 uppercase">
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
