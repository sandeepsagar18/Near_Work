import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  LogOut,
  Wallet,
  Wrench,
  ShieldCheck,
  ChevronRight,
  Power,
  Star,
  Building2,
  CheckCircle2,
  LogIn
} from 'lucide-react';
import { useWorkerAuth } from '../context/WorkerAuthContext';
import { useWorkerLanguage } from '../context/LanguageContext';
import { WorkerHeader } from '../components/WorkerHeader';
import { WorkerStatus } from '@nearwork/types';

export const WorkerProfilePage: React.FC = () => {
  const { worker, toggleOnlineStatus, logout } = useWorkerAuth();
  const { t } = useWorkerLanguage();
  const navigate = useNavigate();

  const isOnline = worker?.workerProfile?.status === WorkerStatus.ONLINE;

  return (
    <div className="min-h-screen bg-slate-50 pb-28 text-slate-900 font-sans">
      <WorkerHeader />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Worker Profile Card */}
        {worker ? (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-emerald-600/30 flex-shrink-0">
                {worker.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-black text-slate-900 truncate">{worker.name}</h2>
                  {worker.workerProfile?.verificationStatus === 'VERIFIED' && (
                    <span className="p-1 rounded-full bg-emerald-100 text-emerald-700" title="Verified Partner">
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-500 truncate">
                  {worker.phone} • {worker.email}
                </p>
                <div className="flex items-center space-x-2 mt-1.5">
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{worker.workerProfile?.averageRating || '5.0'} Rating</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                    <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                    <span>{worker.workerProfile?.totalJobsCompleted || 0} Jobs Done</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Duty Status Fast Toggle */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-700 block">Duty Status</span>
                <span className="text-[11px] text-slate-500">
                  {isOnline ? 'Online & Receiving Dispatches' : 'Offline (No dispatches)'}
                </span>
              </div>
              <button
                onClick={toggleOnlineStatus}
                className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer ${
                  isOnline
                    ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl p-6 shadow-xl shadow-emerald-600/20 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 mx-auto flex items-center justify-center backdrop-blur-sm">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">NearWork Partner Portal</h2>
              <p className="text-xs text-emerald-100 mt-1">Sign in with your partner credentials to manage dispatches & earnings</p>
            </div>
            <button
              onClick={() => navigate('/auth')}
              className="w-full py-3.5 bg-white text-emerald-700 font-black text-sm rounded-2xl shadow-lg hover:bg-emerald-50 active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Partner Sign In / Register</span>
            </button>
          </div>
        )}

        {/* Bank & Wallet Summary */}
        {worker && (
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-600">
                <Building2 className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-wider">Settlement & Bank Details</span>
              </div>
              <button
                onClick={() => navigate('/earnings')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
              >
                Manage Wallet →
              </button>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl text-xs space-y-1 text-slate-600 border border-slate-200">
              <p>
                <strong className="text-slate-800">Account:</strong>{' '}
                {worker.workerProfile?.bankAccountNumber || '•••• •••• 4829'}
              </p>
              <p>
                <strong className="text-slate-800">IFSC Code:</strong>{' '}
                {worker.workerProfile?.bankIfsc || 'SBIN0001234'}
              </p>
              <p>
                <strong className="text-slate-800">KYC Status:</strong>{' '}
                <span className="text-emerald-600 font-bold">{worker.workerProfile?.verificationStatus || 'VERIFIED'}</span>
              </p>
            </div>
          </div>
        )}

        {/* Quick Navigation Menu */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
          <button
            onClick={() => navigate('/services')}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Services & Performance</p>
                <p className="text-xs text-slate-400">View job history & breakdown</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => navigate('/earnings')}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Wallet & Instant Payouts</p>
                <p className="text-xs text-slate-400">
                  Balance: ₹{worker?.workerProfile?.availableBalance || 0}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Logout Button */}
        {worker && (
          <button
            onClick={() => {
              logout();
              navigate('/auth');
            }}
            className="w-full py-4 bg-red-50 hover:bg-red-100 border border-red-100 rounded-3xl font-bold text-sm text-red-600 flex items-center justify-center space-x-2 transition-colors active:scale-98 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('worker.logout', 'Sign Out from Partner Portal')}</span>
          </button>
        )}
      </main>
    </div>
  );
};
