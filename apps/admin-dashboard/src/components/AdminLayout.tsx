import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  MapPin,
  Users,
  ShieldCheck,
  Calendar,
  Layers,
  Tag,
  Wallet,
  Headphones,
  LogOut,
  Shield
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const navItems = [
    { to: '/', label: 'Overview Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { to: '/live-map', label: 'Live Operations Map', icon: <MapPin className="w-4 h-4" /> },
    { to: '/workers', label: 'Worker KYC Verification', icon: <ShieldCheck className="w-4 h-4" /> },
    { to: '/bookings', label: 'Bookings Management', icon: <Calendar className="w-4 h-4" /> },
    { to: '/services', label: 'Services & Pricing', icon: <Layers className="w-4 h-4" /> },
    { to: '/coupons', label: 'Coupons & Promos', icon: <Tag className="w-4 h-4" /> },
    { to: '/payouts', label: 'Worker Payouts', icon: <Wallet className="w-4 h-4" /> },
    { to: '/tickets', label: 'Disputes & Support', icon: <Headphones className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 flex-shrink-0">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center space-x-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-lg shadow-md shadow-blue-600/30">
              NW
            </div>
            <div>
              <h2 className="font-black text-sm text-white">NearWork Admin</h2>
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">
                Central Operations
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between px-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-blue-400">
              {admin?.name?.charAt(0) || 'A'}
            </div>
            <div className="truncate max-w-[110px]">
              <p className="text-xs font-bold text-white truncate">{admin?.name || 'Administrator'}</p>
              <span className="text-[10px] text-slate-500 block">Super Admin</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
};
