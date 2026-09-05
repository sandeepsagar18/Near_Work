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
  const [declinedCounts, setDeclinedCounts] = useState<Record<string, number>>(() => {
    try {
      const saved = sessionStorage.getItem('nw_declined_counts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const recordDecline = (bookingId: string) => {
    setDeclinedCounts((prev) => {
      const updated = {
        ...prev,
        [bookingId]: (prev[bookingId] || 0) + 1
      };
      try {
        sessionStorage.setItem('nw_declined_counts', JSON.stringify(updated));
      } catch {}
      return updated;
    });
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

  const workerRef = React.useRef<any>(worker);
  workerRef.current = worker;

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

      // Ultra-Fast Real-Time Phone GPS Broadcaster (Only active when ONLINE)
      let watchId: number | null = null;
      let heartbeatTimer: any = null;

      const isWorkerOnline = worker.workerProfile?.status === WorkerStatus.ONLINE;

      const broadcastCoords = (pos: GeolocationPosition) => {
        // Strict guard: Do not stream location if worker is offline
        const currentStatus = workerRef.current?.workerProfile?.status;
        if (currentStatus !== WorkerStatus.ONLINE) {
          return;
        }

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

      if (isWorkerOnline && 'geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          broadcastCoords,
          () => {},
          { enableHighAccuracy: true, maximumAge: 0, timeout: 2000 }
        );

        heartbeatTimer = setInterval(() => {
          if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
              broadcastCoords,
              () => {},
              { enableHighAccuracy: true, maximumAge: 0, timeout: 1500 }
            );
          }
        }, 1000);
      }

      const handleJobAssigned = (data: any) => {
        const currentWorker = workerRef.current || worker;
        // Strictly check that worker is ONLINE; if OFFLINE, ignore completely
        if (currentWorker?.workerProfile?.status !== WorkerStatus.ONLINE) {
          return;
        }
        // If worker has already declined 2 times, do not show alert
        if ((declinedCountsRef.current[data.bookingId] || 0) >= 2) {
          return;
        }
        setActiveJobAlert(data);
      };

      const handleJobCancelled = (data: any) => {
        setActiveJobAlert((prev: any) => (prev?.bookingId === data.bookingId ? null : prev));
      };

      const handleJobTaken = (data: any) => {
        setActiveJobAlert((prev: any) => {
          if (prev?.bookingId === data.bookingId && data.takenByWorkerId !== worker.workerProfile?.id) {
            return null;
          }
          return prev;
        });
      };

      socket.on(SOCKET_EVENTS.BOOKING_ASSIGNED, handleJobAssigned);
      socket.on('booking:dispatch', handleJobAssigned);
      socket.on('booking:new', handleJobAssigned);
      socket.on(SOCKET_EVENTS.BOOKING_CANCELLED, handleJobCancelled);
      socket.on('booking:taken', handleJobTaken);

      return () => {
        if (watchId !== null && 'geolocation' in navigator) {
          navigator.geolocation.clearWatch(watchId);
        }
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
        }
        socket.off(SOCKET_EVENTS.BOOKING_ASSIGNED, handleJobAssigned);
        socket.off('booking:dispatch', handleJobAssigned);
        socket.off('booking:new', handleJobAssigned);
        socket.off(SOCKET_EVENTS.BOOKING_CANCELLED, handleJobCancelled);
        socket.off('booking:taken', handleJobTaken);
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
        if (nextStatus === WorkerStatus.OFFLINE) {
          setActiveJobAlert(null);
        }

        setWorker({
          ...worker,
          workerProfile: {
            ...worker.workerProfile,
            status: nextStatus
          }
        });

        // If newly ONLINE, immediately send a one-off GPS sync and check pending unaccepted jobs
        if (nextStatus === WorkerStatus.ONLINE) {
          if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
              async (pos) => {
                const { latitude, longitude, speed, heading, accuracy } = pos.coords;
                try {
                  await WorkerApiClient.request('/worker/location', {
                    method: 'POST',
                    body: JSON.stringify({
                      latitude,
                      longitude,
                      speed: speed ? Math.round(speed * 3.6) : 0,
                      heading: heading || 0,
                      accuracy: accuracy || 5,
                      altitude: 124
                    })
                  });
                } catch {}
              },
              () => {},
              { enableHighAccuracy: true, timeout: 5000 }
            );
          }

          // Immediately check for pending unaccepted jobs waiting for partners
          try {
            const jobsRes = await WorkerApiClient.request('/worker/jobs');
            if (jobsRes.success && jobsRes.data && jobsRes.data.length > 0) {
              const pendingUnaccepted = jobsRes.data.find(
                (j: any) =>
                  (j.status === 'SEARCHING_WORKER' || j.status === 'WORKER_ASSIGNED') &&
                  !j.workerId &&
                  (declinedCountsRef.current[j.id] || 0) < 2
              );

              if (pendingUnaccepted) {
                setActiveJobAlert({
                  bookingId: pendingUnaccepted.id,
                  bookingNumber: pendingUnaccepted.bookingNumber,
                  serviceName: pendingUnaccepted.service?.name || 'Service Job',
                  customerName: pendingUnaccepted.customer?.name || 'Customer',
                  scheduledDate: pendingUnaccepted.scheduledDate,
                  scheduledTimeSlot: pendingUnaccepted.scheduledTimeSlot,
                  address: `${pendingUnaccepted.address?.addressLine || ''}, ${pendingUnaccepted.address?.city || ''}`,
                  distanceKm: 2.5,
                  estimatedEarnings: Math.round(pendingUnaccepted.totalAmount * 0.8),
                  expiresInSeconds: 60
                });
              }
            }
          } catch (e) {
            // non-blocking
          }
        }
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
