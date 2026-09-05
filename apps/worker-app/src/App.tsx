import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WorkerAuthProvider, useWorkerAuth } from './context/WorkerAuthContext';
import { WorkerLanguageProvider } from './context/LanguageContext';
import { WorkerDashboardPage } from './pages/WorkerDashboardPage';
import { ActiveJobPage } from './pages/ActiveJobPage';
import { WorkerEarningsPage } from './pages/WorkerEarningsPage';
import { WorkerServicesPage } from './pages/WorkerServicesPage';
import { WorkerAuthPage } from './pages/WorkerAuthPage';
import { WorkerProfilePage } from './pages/WorkerProfilePage';
import { JobRequestAlert } from './components/JobRequestAlert';
import { WorkerGlobalNotification } from './components/WorkerGlobalNotification';
import { WorkerBottomNav } from './components/WorkerBottomNav';

const GlobalJobAlert: React.FC = () => {
  const { activeJobAlert, setActiveJobAlert } = useWorkerAuth();
  if (!activeJobAlert) return null;
  return (
    <JobRequestAlert
      alert={activeJobAlert}
      onDismiss={() => setActiveJobAlert(null)}
    />
  );
};

export function App() {
  return (
    <WorkerLanguageProvider>
      <WorkerAuthProvider>
        <BrowserRouter>
          <GlobalJobAlert />
          <WorkerGlobalNotification />
          <WorkerBottomNav />
          <Routes>
            <Route path="/" element={<WorkerDashboardPage />} />
            <Route path="/auth" element={<WorkerAuthPage />} />
            <Route path="/job/:id" element={<ActiveJobPage />} />
            <Route path="/services" element={<WorkerServicesPage />} />
            <Route path="/earnings" element={<WorkerEarningsPage />} />
            <Route path="/profile" element={<WorkerProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </WorkerAuthProvider>
    </WorkerLanguageProvider>
  );
}

export default App;
