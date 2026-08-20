import React, { useState, useEffect } from 'react';
import { Power, User, LogOut, Wallet, Wrench, MapPin, Compass, Navigation, RefreshCw, Radio } from 'lucide-react';
import { useWorkerAuth } from '../context/WorkerAuthContext';
import { useWorkerLanguage } from '../context/LanguageContext';
import { useNavigate, NavLink } from 'react-router-dom';
import { WorkerStatus } from '@nearwork/types';
import { WorkerLanguageToggle } from './WorkerLanguageToggle';

export const WorkerHeader: React.FC = () => {
  const { worker, toggleOnlineStatus, logout } = useWorkerAuth();
  const { t } = useWorkerLanguage();
  const navigate = useNavigate();

  const [liveLocationText, setLiveLocationText] = useState<string>('Detecting GPS...');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(2.5);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

  const isOnline = worker?.workerProfile?.status === WorkerStatus.ONLINE;

  const fetchLiveGPS = () => {
    if ('geolocation' in navigator) {
      setIsUpdatingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          if (accuracy) setGpsAccuracy(accuracy);

          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`
            );
            if (res.ok) {
              const data = await res.json();
              const addr = data.address || {};
              const road = addr.road || addr.suburb || addr.neighbourhood || 'Civil Lines';
              const city = addr.city || addr.town || addr.village || 'Gorakhpur';
              setLiveLocationText(`${road}, ${city}`);
            } else {
              setLiveLocationText(`${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E`);
            }
          } catch {
            setLiveLocationText(`Gorakhpur, UP`);
          } finally {
            setIsUpdatingLocation(false);
          }
        },
        () => {
          setLiveLocationText('Gorakhpur, UP');
          setIsUpdatingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setLiveLocationText('Gorakhpur, UP');
    }
  };

  useEffect(() => {
    fetchLiveGPS();
    const timer = setInterval(fetchLiveGPS, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 lg:px-8 py-3 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Brand & Partner Profile */}
        <div className="flex items-center space-x-3">
          <NavLink to="/" className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 shadow-md shadow-emerald-500/10 flex-shrink-0">
              <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="font-black text-xs sm:text-sm text-white tracking-tight flex items-center space-x-1.5">
                <span>{t('worker.nav_title', 'NearWork Partner')}</span>
              </h1>
              <span className="text-[10px] text-slate-400 block truncate max-w-[110px] sm:max-w-none">
                {worker?.workerProfile?.verificationStatus === 'VERIFIED' ? (
                  <span className="text-emerald-400 font-bold">✓ {worker?.name}</span>
                ) : (
                  <span className="text-amber-400 font-bold">⏳ Pending Review</span>
                )}
              </span>
            </div>
          </NavLink>
        </div>

        {/* Real Live GPS Location Badge in Center/Navbar */}
        <div className="hidden md:flex items-center">
          <button
            onClick={fetchLiveGPS}
            title="Click to refresh live GPS location"
            className="bg-slate-950/80 hover:bg-slate-800 border border-emerald-500/30 hover:border-emerald-400/50 px-3.5 py-1.5 rounded-full flex items-center space-x-2 text-xs text-slate-200 transition shadow-inner cursor-pointer group"
          >
            <div className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
            </div>
            <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="font-bold text-white truncate max-w-[180px] lg:max-w-[240px]">
              {liveLocationText}
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/90 px-1.5 py-0.5 rounded border border-emerald-500/30">
              ±{gpsAccuracy ? gpsAccuracy.toFixed(1) : '2.5'}m
            </span>
            <RefreshCw className={`w-3 h-3 text-slate-400 group-hover:text-white ${isUpdatingLocation ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Online Toggle, Wallet, Language & Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Mobile compact location dot */}
          <div className="flex md:hidden items-center text-[10px] text-emerald-400 bg-slate-950 px-2 py-1 rounded-full border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1"></span>
            <span className="truncate max-w-[70px] font-semibold">{liveLocationText.split(',')[0]}</span>
          </div>

          <WorkerLanguageToggle />

          <button
            onClick={() => navigate('/earnings')}
            className="hidden sm:flex px-3 py-1.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-400 items-center space-x-1.5 transition-colors border border-slate-700 cursor-pointer"
            title="Wallet"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span className="text-xs font-black">₹{worker?.workerProfile?.availableBalance || 0}</span>
          </button>

          <button
            onClick={toggleOnlineStatus}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-black flex items-center space-x-1.5 transition-all cursor-pointer ${
              isOnline
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/40'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isOnline ? t('worker.status_online', 'ONLINE') : t('worker.status_offline', 'OFFLINE')}</span>
          </button>

          <button
            onClick={logout}
            className="p-2 rounded-2xl bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors border border-slate-700 cursor-pointer"
            title={t('worker.logout', 'Logout')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
