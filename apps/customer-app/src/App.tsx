import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { HomePage } from './pages/HomePage';
import { ServicesPage } from './pages/ServicesPage';
import { ServiceDetailPage } from './pages/ServiceDetailPage';
import { BookingConfirmationPage } from './pages/BookingConfirmationPage';
import { TrackingPage } from './pages/TrackingPage';
import { BookingsListPage } from './pages/BookingsListPage';
import { AuthPage } from './pages/AuthPage';
import { SupportPage } from './pages/SupportPage';
import { GlobalNotificationToast } from './components/GlobalNotificationToast';

export function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <GlobalNotificationToast />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/service/:id" element={<ServiceDetailPage />} />
            <Route path="/booking/confirm" element={<BookingConfirmationPage />} />
            <Route path="/booking/:id/track" element={<TrackingPage />} />
            <Route path="/bookings" element={<BookingsListPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/profile" element={<BookingsListPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
