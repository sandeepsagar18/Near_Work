import React, { useState } from 'react';
import { MapPin, ChevronDown, Bell, User, LogIn, LogOut, Calendar, Headphones, Layers, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { NavLink, useNavigate } from 'react-router-dom';
import { AddressModal } from './AddressModal';
import { LanguageToggle } from './LanguageToggle';

export const Header: React.FC = () => {
  const { user, selectedAddress, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center justify-between">
            {/* Logo & Location */}
            <div className="flex items-center space-x-6">
              <NavLink to="/" className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-600/30">
                  NW
                </div>
                <div>
                  <span className="text-lg font-black text-gray-900 tracking-tight block">NearWork</span>
                  <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider block sm:inline">
                    Home Services
                  </span>
                </div>
              </NavLink>

              {/* Location Picker */}
              <div
                onClick={() => setShowAddressModal(true)}
                className="hidden sm:flex items-center space-x-2 bg-gray-50 hover:bg-indigo-50/60 px-3.5 py-2 rounded-2xl border border-gray-200/80 cursor-pointer transition-colors"
              >
                <MapPin className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <div className="text-left">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    {selectedAddress?.label || 'Service Location'}
                  </span>
                  <p className="text-xs font-bold text-gray-800 truncate max-w-[180px] md:max-w-[260px]">
                    {selectedAddress
                      ? `${selectedAddress.addressLine}, ${selectedAddress.city}`
                      : 'Gorakhpur, Uttar Pradesh'}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                {t('nav.home', 'Home')}
              </NavLink>
              <NavLink
                to="/services"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                {t('nav.services', 'All Services')}
              </NavLink>
              <NavLink
                to="/bookings"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                {t('nav.bookings', 'My Bookings')}
              </NavLink>
              <NavLink
                to="/support"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                Support
              </NavLink>
            </nav>

            {/* Right Actions: Language Switcher & Profile */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Language Switcher */}
              <LanguageToggle />

              {/* Mobile Location Clicker */}
              <div
                onClick={() => setShowAddressModal(true)}
                className="flex sm:hidden items-center space-x-1 cursor-pointer bg-gray-50 px-2 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-800"
              >
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                <span className="truncate max-w-[90px]">
                  {selectedAddress ? selectedAddress.city : 'Gorakhpur'}
                </span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </div>

              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 p-1.5 rounded-2xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-black text-sm flex items-center justify-center">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:inline text-xs font-bold text-gray-800">
                      {user.name.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>

                  {/* Dropdown */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in">
                      <div className="px-4 py-2 border-b border-gray-50">
                        <p className="font-bold text-xs text-gray-900">{user.name}</p>
                        <p className="text-[10px] text-gray-500">{user.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          navigate('/bookings');
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center space-x-2"
                      >
                        <Calendar className="w-4 h-4" />
                        <span>{t('nav.bookings', 'My Bookings')}</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          navigate('/support');
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center space-x-2"
                      >
                        <Headphones className="w-4 h-4" />
                        <span>24/7 Support</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                          navigate('/auth');
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center space-x-2 border-t border-gray-50 mt-1"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{t('nav.logout', 'Sign Out')}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => navigate('/auth')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center space-x-1.5 transition-transform active:scale-95 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t('nav.login', 'Sign In')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <AddressModal isOpen={showAddressModal} onClose={() => setShowAddressModal(false)} />
    </>
  );
};
