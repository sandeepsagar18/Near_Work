import React from 'react';
import { Power, User, LogOut, Wallet, Wrench, ChevronRight } from 'lucide-react';
import { useWorkerAuth } from '../context/WorkerAuthContext';
import { useWorkerLanguage } from '../context/LanguageContext';
import { useNavigate, NavLink } from 'react-router-dom';
import { WorkerStatus } from '@nearwork/types';
import { WorkerLanguageToggle } from './WorkerLanguageToggle';

export const WorkerHeader: React.FC = () => {
  const { worker, toggleOnlineStatus, logout } = useWorkerAuth();
  const { t } = useWorkerLanguage();
  const navigate = useNavigate();

  const isOnline = worker?.workerProfile?.status === WorkerStatus.ONLINE;

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-3.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & Partner Profile */}
        <div className="flex items-center space-x-4">
          <NavLink to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 shadow-md shadow-emerald-500/10">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-black text-sm text-white tracking-tight flex items-center space-x-1.5">
                <span>{t('worker.nav_title', 'NearWork Partner')}</span>
              </h1>
              <span className="text-[10px] text-slate-400 block">
                {worker?.workerProfile?.verificationStatus === 'VERIFIED' ? (
                  <span className="text-emerald-400 font-bold">✓ {worker?.name}</span>
                ) : (
                  <span className="text-amber-400 font-bold">⏳ Verification Pending</span>
                )}
              </span>
            </div>
          </NavLink>
        </div>

        {/* Online Toggle, Language Switcher & Quick Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Language Switcher */}
          <WorkerLanguageToggle />

          <button
            onClick={() => navigate('/earnings')}
            className="hidden sm:flex px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-400 items-center space-x-2 transition-colors border border-slate-700 cursor-pointer"
            title="Wallet"
          >
            <Wallet className="w-4 h-4" />
            <span className="text-xs font-black">₹{worker?.workerProfile?.availableBalance || 0}</span>
          </button>

          <button
            onClick={toggleOnlineStatus}
            className={`px-3 sm:px-4 py-2 rounded-full text-xs font-black flex items-center space-x-1.5 sm:space-x-2 transition-all cursor-pointer ${
              isOnline
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/40'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{isOnline ? t('worker.status_online', 'ONLINE') : t('worker.status_offline', 'OFFLINE')}</span>
          </button>

          <button
            onClick={logout}
            className="p-2.5 rounded-2xl bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors border border-slate-700 cursor-pointer"
            title={t('worker.logout', 'Logout')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
