import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Calendar, Headphones, MapPin, ShieldCheck, ChevronRight, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Header } from '../components/Header';

export const ProfilePage: React.FC = () => {
  const { user, selectedAddress, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50/50 pb-28">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* User Card */}
        {user ? (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black text-gray-900 truncate">{user.name}</h2>
              <p className="text-xs font-semibold text-gray-500 truncate">{user.email || user.phone || 'Verified Customer'}</p>
              <span className="inline-flex items-center space-x-1 mt-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                <ShieldCheck className="w-3 h-3" />
                <span>Active Member</span>
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-3xl p-6 shadow-xl shadow-indigo-600/20 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 mx-auto flex items-center justify-center backdrop-blur-sm">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Welcome to NearWork</h2>
              <p className="text-xs text-indigo-100 mt-1">Sign in to book home services, manage orders & track workers</p>
            </div>
            <button
              onClick={() => navigate('/auth')}
              className="w-full py-3.5 bg-white text-indigo-600 font-black text-sm rounded-2xl shadow-lg hover:bg-indigo-50 active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In / Sign Up</span>
            </button>
          </div>
        )}

        {/* Saved Location */}
        {selectedAddress && (
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-2">
            <div className="flex items-center space-x-2 text-indigo-600">
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-wider">Default Service Location</span>
            </div>
            <p className="text-sm font-bold text-gray-800">
              {selectedAddress.addressLine}, {selectedAddress.city} - {selectedAddress.pincode}
            </p>
          </div>
        )}

        {/* Quick Menu Options */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
          <button
            onClick={() => navigate('/bookings')}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{t('nav.bookings', 'My Bookings')}</p>
                <p className="text-xs text-gray-400">View active & past orders</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>

          <button
            onClick={() => navigate('/support')}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">24/7 Support & Help</p>
                <p className="text-xs text-gray-400">Get instant assistance anytime</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Sign Out Button */}
        {user && (
          <button
            onClick={() => {
              logout();
              navigate('/auth');
            }}
            className="w-full py-4 bg-red-50 hover:bg-red-100 border border-red-100 rounded-3xl font-bold text-sm text-red-600 flex items-center justify-center space-x-2 transition-colors active:scale-98"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('nav.logout', 'Sign Out')}</span>
          </button>
        )}
      </main>
    </div>
  );
};
