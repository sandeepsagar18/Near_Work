import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { AdminAnalyticsPage } from './pages/AdminAnalyticsPage';
import { AdminLiveMapPage } from './pages/AdminLiveMapPage';
import { AdminWorkersPage } from './pages/AdminWorkersPage';
import { AdminBookingsPage } from './pages/AdminBookingsPage';
import { AdminServicesPage } from './pages/AdminServicesPage';
import { AdminCouponsPage } from './pages/AdminCouponsPage';
import { AdminPayoutsPage } from './pages/AdminPayoutsPage';
import { AdminTicketsPage } from './pages/AdminTicketsPage';
import { AdminAuthPage } from './pages/AdminAuthPage';

const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { admin, isLoading } = useAdminAuth();
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Loading...</div>;
  }
  if (!admin) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
};

export function App() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AdminAuthPage />} />
          <Route path="/" element={<ProtectedAdminRoute><AdminAnalyticsPage /></ProtectedAdminRoute>} />
          <Route path="/live-map" element={<ProtectedAdminRoute><AdminLiveMapPage /></ProtectedAdminRoute>} />
          <Route path="/workers" element={<ProtectedAdminRoute><AdminWorkersPage /></ProtectedAdminRoute>} />
          <Route path="/bookings" element={<ProtectedAdminRoute><AdminBookingsPage /></ProtectedAdminRoute>} />
          <Route path="/services" element={<ProtectedAdminRoute><AdminServicesPage /></ProtectedAdminRoute>} />
          <Route path="/coupons" element={<ProtectedAdminRoute><AdminCouponsPage /></ProtectedAdminRoute>} />
          <Route path="/payouts" element={<ProtectedAdminRoute><AdminPayoutsPage /></ProtectedAdminRoute>} />
          <Route path="/tickets" element={<ProtectedAdminRoute><AdminTicketsPage /></ProtectedAdminRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  );
}

export default App;
