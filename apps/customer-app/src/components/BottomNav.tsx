import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Layers, Calendar, Headphones, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export const BottomNav: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/80 px-2 py-2 shadow-2xl safe-area-bottom font-sans">
      <div className="flex items-center justify-around max-w-md mx-auto">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 ${
              isActive
                ? 'text-indigo-600 font-black scale-105'
                : 'text-gray-500 hover:text-gray-900 font-medium'
            }`
          }
        >
          <Home className="w-5 h-5 mb-1" />
          <span className="text-[10px] tracking-tight">{t('nav.home', 'Home')}</span>
        </NavLink>

        <NavLink
          to="/services"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 ${
              isActive
                ? 'text-indigo-600 font-black scale-105'
                : 'text-gray-500 hover:text-gray-900 font-medium'
            }`
          }
        >
          <Layers className="w-5 h-5 mb-1" />
          <span className="text-[10px] tracking-tight">{t('nav.services', 'Services')}</span>
        </NavLink>

        <NavLink
          to="/bookings"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 ${
              isActive
                ? 'text-indigo-600 font-black scale-105'
                : 'text-gray-500 hover:text-gray-900 font-medium'
            }`
          }
        >
          <Calendar className="w-5 h-5 mb-1" />
          <span className="text-[10px] tracking-tight">{t('nav.bookings', 'Bookings')}</span>
        </NavLink>

        <NavLink
          to={user ? '/support' : '/auth'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 ${
              isActive
                ? 'text-indigo-600 font-black scale-105'
                : 'text-gray-500 hover:text-gray-900 font-medium'
            }`
          }
        >
          {user ? <Headphones className="w-5 h-5 mb-1" /> : <User className="w-5 h-5 mb-1" />}
          <span className="text-[10px] tracking-tight">{user ? 'Support' : t('nav.login', 'Account')}</span>
        </NavLink>
      </div>
    </nav>
  );
};

