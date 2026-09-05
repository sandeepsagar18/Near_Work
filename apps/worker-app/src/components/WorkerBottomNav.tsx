import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Wrench, Wallet, Power, User } from 'lucide-react';
import { useWorkerAuth } from '../context/WorkerAuthContext';
import { useWorkerLanguage } from '../context/LanguageContext';
import { WorkerStatus } from '@nearwork/types';

export const WorkerBottomNav: React.FC = () => {
  const { worker, toggleOnlineStatus } = useWorkerAuth();
  const { t } = useWorkerLanguage();

  const isOnline = worker?.workerProfile?.status === WorkerStatus.ONLINE;

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-1.5 py-2 shadow-2xl safe-area-bottom font-sans">
      <div className="flex items-center justify-around max-w-md mx-auto">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-200 ${
              isActive
                ? 'text-emerald-600 font-black scale-105'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 mb-1" />
          <span className="text-[10px] tracking-tight">Dashboard</span>
        </NavLink>

        <NavLink
          to="/services"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-200 ${
              isActive
                ? 'text-emerald-600 font-black scale-105'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`
          }
        >
          <Wrench className="w-5 h-5 mb-1" />
          <span className="text-[10px] tracking-tight">Services</span>
        </NavLink>

        <NavLink
          to="/earnings"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-200 ${
              isActive
                ? 'text-emerald-600 font-black scale-105'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`
          }
        >
          <Wallet className="w-5 h-5 mb-1" />
          <span className="text-[10px] tracking-tight">Wallet</span>
        </NavLink>

        {worker && (
          <button
            onClick={toggleOnlineStatus}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-200 cursor-pointer ${
              isOnline
                ? 'text-emerald-600 font-black'
                : 'text-slate-400 font-medium'
            }`}
          >
            <div className="relative">
              <Power className="w-5 h-5 mb-1" />
              <span
                className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${
                  isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                }`}
              />
            </div>
            <span className="text-[10px] tracking-tight">{isOnline ? 'Duty ON' : 'Duty OFF'}</span>
          </button>
        )}

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-200 ${
              isActive
                ? 'text-emerald-600 font-black scale-105'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`
          }
        >
          <User className="w-5 h-5 mb-1" />
          <span className="text-[10px] tracking-tight">
            {worker ? 'Profile' : 'Sign In'}
          </span>
        </NavLink>
      </div>
    </nav>
  );
};
