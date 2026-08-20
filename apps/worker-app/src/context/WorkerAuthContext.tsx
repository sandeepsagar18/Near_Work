import React, { createContext, useContext, useState, useEffect } from 'react';
import { WorkerStatus, WorkerVerificationStatus, SOCKET_EVENTS } from '@nearwork/types';
import { WorkerApiClient } from '../services/api';
import { getWorkerSocket, connectWorkerSocket, disconnectWorkerSocket } from '../services/socket';

export interface WorkerUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  workerProfile: {
    id: string;
    status: WorkerStatus;
    verificationStatus: WorkerVerificationStatus;
    averageRating: number;
    totalJobsCompleted: number;
    availableBalance: number;
    pendingBalance: number;
    bankAccountNumber?: string;
    bankIfsc?: string;
    bankAccountName?: string;
    upiId?: string;
    skills: Array<{ category: { id: string; name: string } }>;
    [key: string]: any;
  };
}

interface WorkerAuthContextType {
  worker: WorkerUser | null;
  isLoading: boolean;
  activeJobAlert: any | null;
  setActiveJobAlert: (alert: any) => void;
  recordDecline: (bookingId: string) => void;
  toggleOnlineStatus: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: any) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const WorkerAuthContext = createContext<WorkerAuthContextType | undefined>(undefined);

export const WorkerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [worker, setWorker] = useState<WorkerUser | null>(null);
  const [activeJobAlert, setActiveJobAlert] = useState<any | null>(null);
  const [declinedCounts, setDeclinedCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const recordDecline = (bookingId: string) => {
    setDeclinedCounts((prev) => ({
      ...prev,
      [bookingId]: (prev[bookingId] || 0) + 1
    }));
    setActiveJobAlert(null);
  };

  const refreshProfile = async () => {
    try {
      const res = await WorkerApiClient.request('/worker/profile');
      if (res.success && res.data) {
        const workerUser: WorkerUser = {
          id: res.data.user?.id || res.data.userId,
          name: res.data.user?.name,
          email: res.data.user?.email,
          phone: res.data.user?.phone,
          role: 'WORKER',
          workerProfile: res.data
        };
        setWorker(workerUser);
        connectWorkerSocket();

        const socket = getWorkerSocket();
        socket.emit('worker:join', {
          workerId: res.data.id,
          userId: res.data.user?.id
        });
      } else {
        setWorker(null);
        WorkerApiClient.clearTokens();
        disconnectWorkerSocket();
      }
    } catch (e) {
      setWorker(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (WorkerApiClient.getAccessToken()) {
      refreshProfile();
    } else {
      setIsLoading(false);
    }
  }, []);

  const activeJobAlertRef = React.useRef<any>(activeJobAlert);
  activeJobAlertRef.current = activeJobAlert;
  const declinedCountsRef = React.useRef<Record<string, number>>(declinedCounts);
  declinedCountsRef.current = declinedCounts;

  // Listen for incoming job requests and watch continuous phone GPS
  useEffect(() => {
    if (worker) {
      const socket = getWorkerSocket();
      socket.emit('worker:join', {
        workerId: worker.workerProfile.id,
        userId: worker.id
      });

      // Ultra-Fast Real-Time Phone GPS Broadcaster (watchPosition + 1s active stream)
      let watchId: number | null = null;
      const broadcastCoords = (pos: GeolocationPosition) => {
        const { latitude, longitude, speed, heading, accuracy, altitude } = pos.coords;
        const speedKmh = speed !== null && speed !== undefined && !isNaN(speed) && speed > 0 ? Math.round(speed * 3.6) : 0;

        // 1. Instant WebSocket Broadcast (< 50ms)
        socket.emit(SOCKET_EVENTS.WORKER_LOCATION_UPDATE, {
          workerId: worker.workerProfile.id,
          latitude,
          longitude,
          speed: speedKmh,
          heading: heading || 0,
          accuracy: accuracy ? Math.round(accuracy) : 5,
          altitude: altitude ? Math.round(altitude) : 128,
          timestamp: Date.now()
        });

        // 2. Background DB sync
        WorkerApiClient.request('/worker/location', {
          method: 'POST',
          body: JSON.stringify({
            latitude,
            longitude,
            speed: speedKmh,
            heading: heading || 0,
            accuracy: accuracy || 5,
            altitude: altitude || 128
          })
        }).catch(() => {});
      };

      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          broadcastCoords,
          () => {},
          { enableHighAccuracy: true, maximumAge: 0, timeout: 2000 }
        );
      }

      const heartbeatTimer = setInterval(() => {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            broadcastCoords,
            () => {},
            { enableHighAccuracy: true, maximumAge: 0, timeout: 1500 }
          );
        }
      }, 1000);

      const handleJobAssigned = (data: any) => {
        // If worker has already declined 2 times, do not show alert
        if ((declinedCountsRef.current[data.bookingId] || 0) >= 2) {
          return;
        }
        setActiveJobAlert(data);
      };

      const handleJobCancelled = (data: any) => {
        setActiveJobAlert((prev: any) => (prev?.bookingId === data.bookingId ? null : prev));
      };

      socket.on(SOCKET_EVENTS.BOOKING_ASSIGNED, handleJobAssigned);
      socket.on('booking:dispatch', handleJobAssigned);
      socket.on('booking:new', handleJobAssigned);
      socket.on(SOCKET_EVENTS.BOOKING_CANCELLED, handleJobCancelled);

      // Fast 2s fallback poller for both WORKER_ASSIGNED and SEARCHING_WORKER
      const pollTimer = setInterval(async () => {
        if (!activeJobAlertRef.current) {
          try {
            const res = await WorkerApiClient.request('/worker/jobs');
            if (res.success && res.data && res.data.length > 0) {
              const pendingJob = res.data.find(
                (j: any) =>
                  (j.status === 'WORKER_ASSIGNED' || j.status === 'SEARCHING_WORKER') &&
                  (declinedCountsRef.current[j.id] || 0) < 2
              );
              if (pendingJob && !activeJobAlertRef.current) {
                const wLat = worker?.workerProfile?.currentLat || 26.7606;
                const wLng = worker?.workerProfile?.currentLng || 83.3732;
                const cLat = pendingJob.address?.latitude || 26.7606;
                const cLng = pendingJob.address?.longitude || 83.3732;

                // Haversine calculation for exact real distance
                const R = 6371;
                const dLat = ((cLat - wLat) * Math.PI) / 180;
                const dLon = ((cLng - wLng) * Math.PI) / 180;
                const a =
                  Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos((wLat * Math.PI) / 180) *
                    Math.cos((cLat * Math.PI) / 180) *
                    Math.sin(dLon / 2) *
                    Math.sin(dLon / 2);
                const computedDist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const realDist = computedDist <= 0.15 ? 0 : Math.round(computedDist * 10) / 10;

                setActiveJobAlert({
                  bookingId: pendingJob.id,
                  bookingNumber: pendingJob.bookingNumber,
                  serviceName: pendingJob.service?.name,
                  customerName: pendingJob.customer?.name,
                  scheduledDate: pendingJob.scheduledDate,
                  scheduledTimeSlot: pendingJob.scheduledTimeSlot,
                  address: `${pendingJob.address?.addressLine}, ${pendingJob.address?.city}`,
                  distanceKm: realDist,
                  estimatedEarnings: Math.round(pendingJob.totalAmount * 0.8),
                  expiresInSeconds: 60
                });
              }
            }
          } catch (err) {
            // Ignore polling glitches
          }
        }
      }, 2000);

      return () => {
        if (watchId !== null && 'geolocation' in navigator) {
          navigator.geolocation.clearWatch(watchId);
        }
        clearInterval(heartbeatTimer);
        socket.off(SOCKET_EVENTS.BOOKING_ASSIGNED, handleJobAssigned);
        socket.off('booking:dispatch', handleJobAssigned);
        socket.off('booking:new', handleJobAssigned);
        socket.off(SOCKET_EVENTS.BOOKING_CANCELLED, handleJobCancelled);
        clearInterval(pollTimer);
      };
    }
  }, [worker]);

  const toggleOnlineStatus = async () => {
    if (!worker) return;
    const nextStatus =
      worker.workerProfile.status === WorkerStatus.ONLINE
        ? WorkerStatus.OFFLINE
        : WorkerStatus.ONLINE;

    try {
      const res = await WorkerApiClient.request('/worker/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.success) {
        setWorker({
          ...worker,
          workerProfile: {
            ...worker.workerProfile,
            status: nextStatus
          }
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await WorkerApiClient.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password: password.trim() })
      });

      if (res.success && res.data?.tokens) {
        WorkerApiClient.setTokens(
          res.data.tokens.accessToken,
          res.data.tokens.refreshToken
        );
        if (res.data.user) {
          setWorker({
            id: res.data.user.id,
            name: res.data.user.name,
            email: res.data.user.email,
            phone: res.data.user.phone,
            role: 'WORKER',
            workerProfile: res.data.user.workerProfile || { id: res.data.user.workerId, status: 'ONLINE', verificationStatus: 'VERIFIED' }
          } as any);
        }
        refreshProfile().catch(() => {});
        return { success: true };
      }
      return { success: false, message: res.message || 'Invalid worker credentials' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Connection error. Please try again.' };
    }
  };

  const register = async (data: any): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await WorkerApiClient.request('/auth/register/worker', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      if (res.success && res.data?.tokens) {
        WorkerApiClient.setTokens(
          res.data.tokens.accessToken,
          res.data.tokens.refreshToken
        );
        await refreshProfile();
        return { success: true };
      }
      return { success: false, message: res.message || 'Registration failed' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Registration error' };
    }
  };

  const logout = () => {
    WorkerApiClient.clearTokens();
    disconnectWorkerSocket();
    setWorker(null);
    setActiveJobAlert(null);
  };

  return (
    <WorkerAuthContext.Provider
      value={{
        worker,
        isLoading,
        activeJobAlert,
        setActiveJobAlert,
        recordDecline,
        toggleOnlineStatus,
        login,
        register,
        logout,
        refreshProfile
      }}
    >
      {children}
    </WorkerAuthContext.Provider>
  );
};

export const useWorkerAuth = () => {
  const context = useContext(WorkerAuthContext);
  if (!context) {
    throw new Error('useWorkerAuth must be used within WorkerAuthProvider');
  }
  return context;
};
