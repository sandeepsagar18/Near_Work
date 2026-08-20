import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  X,
  ArrowRight,
  Sparkles,
  Navigation,
  MapPin,
  KeyRound,
  Zap,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { getSocket, connectSocket } from '../services/socket';
import { SOCKET_EVENTS } from '@nearwork/types';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ApiClient } from '../services/api';
import { playSound, speakVoice } from '../services/sound';
import { ChatDrawer } from './ChatDrawer';

interface ToastData {
  id: string;
  type: 'CHAT' | 'ACCEPTED' | 'EN_ROUTE' | 'ARRIVED' | 'STARTED' | 'EXTRA_CHARGE' | 'COMPLETED';
  title: string;
  message: string;
  bookingId: string;
  workerName?: string;
  extraData?: any;
}

export const GlobalNotificationToast: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [toast, setToast] = useState<ToastData | null>(null);
  const [activeChat, setActiveChat] = useState<{ bookingId: string; workerName: string } | null>(null);
  const knownStatusRef = useRef<Record<string, string>>({});

  // Socket Real-Time Listeners
  useEffect(() => {
    if (!user) return;
    connectSocket();
    const socket = getSocket();

    // 1. Chat Message
    const handleChatMessage = (data: any) => {
      const msg = data.message || data;
      if (msg.senderId && msg.senderId !== user.id) {
        playSound('ping');
        const senderName = data.senderName || msg.sender?.name || 'Service Partner';
        setToast({
          id: String(Date.now()),
          type: 'CHAT',
          title: `💬 Message from ${senderName}`,
          message: msg.message,
          bookingId: data.bookingId,
          workerName: senderName
        });
      }
    };

    // 2. Job Accepted
    const handleJobAccepted = (data: any) => {
      playSound('ping');
      const wName = data.worker?.name || data.workerName || 'A technician';
      setToast({
        id: String(Date.now()),
        type: 'ACCEPTED',
        title: '✅ Technician Assigned!',
        message: `${wName} has accepted your service booking #${data.bookingNumber || ''}.`,
        bookingId: data.bookingId,
        workerName: wName
      });
    };

    // 3. Worker En Route
    const handleWorkerEnRoute = (data: any) => {
      playSound('ping');
      const wName = data.workerName || 'Your technician';
      setToast({
        id: String(Date.now()),
        type: 'EN_ROUTE',
        title: '🚗 Technician Is On The Way!',
        message: `${wName} is en route to your location. Live GPS tracking is active.`,
        bookingId: data.bookingId,
        workerName: wName
      });
    };

    // 4. Worker Arrived
    const handleWorkerArrived = (data: any) => {
      playSound('alert');
      const wName = data.workerName || 'Your technician';
      setToast({
        id: String(Date.now()),
        type: 'ARRIVED',
        title: '📍 Technician Has Arrived!',
        message: `${wName} is at your doorstep. Please share your 4-digit PIN: ${data.otp || ''} to start.`,
        bookingId: data.bookingId,
        workerName: wName
      });
    };

    // 5. Service Started
    const handleServiceStarted = (data: any) => {
      playSound('ping');
      const wName = data.workerName || 'Technician';
      setToast({
        id: String(Date.now()),
        type: 'STARTED',
        title: '⚡ Service Started!',
        message: `PIN verified. ${wName} has started working on your service.`,
        bookingId: data.bookingId,
        workerName: wName
      });
    };

    // 6. Extra Charge Requested
    const handleExtraCharge = (data: any) => {
      playSound('alert');
      setToast({
        id: String(Date.now()),
        type: 'EXTRA_CHARGE',
        title: '⚠️ Additional Work Requested',
        message: `Partner requested ₹${data.amount} for "${data.reason}". Tap to review.`,
        bookingId: data.bookingId
      });
    };

    // 7. Service Completed
    const handleServiceCompleted = (data: any) => {
      playSound('fanfare');
      setToast({
        id: String(Date.now()),
        type: 'COMPLETED',
        title: '🎉 Service Completed!',
        message: `Your service is completed (Total: ₹${data.totalAmount}). Tap to view summary and rate.`,
        bookingId: data.bookingId,
        workerName: data.workerName
      });
    };

    socket.on(SOCKET_EVENTS.CHAT_MESSAGE, handleChatMessage);
    socket.on(SOCKET_EVENTS.BOOKING_ACCEPTED, handleJobAccepted);
    socket.on(SOCKET_EVENTS.WORKER_EN_ROUTE, handleWorkerEnRoute);
    socket.on(SOCKET_EVENTS.WORKER_ARRIVED, handleWorkerArrived);
    socket.on(SOCKET_EVENTS.SERVICE_STARTED, handleServiceStarted);
    socket.on(SOCKET_EVENTS.EXTRA_CHARGE_REQUESTED, handleExtraCharge);
    socket.on(SOCKET_EVENTS.SERVICE_COMPLETED, handleServiceCompleted);

    return () => {
      socket.off(SOCKET_EVENTS.CHAT_MESSAGE, handleChatMessage);
      socket.off(SOCKET_EVENTS.BOOKING_ACCEPTED, handleJobAccepted);
      socket.off(SOCKET_EVENTS.WORKER_EN_ROUTE, handleWorkerEnRoute);
      socket.off(SOCKET_EVENTS.WORKER_ARRIVED, handleWorkerArrived);
      socket.off(SOCKET_EVENTS.SERVICE_STARTED, handleServiceStarted);
      socket.off(SOCKET_EVENTS.EXTRA_CHARGE_REQUESTED, handleExtraCharge);
      socket.off(SOCKET_EVENTS.SERVICE_COMPLETED, handleServiceCompleted);
    };
  }, [user]);

  // Reactive Status Guarantee Poller: Checks active booking status every 2.5 seconds
  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const checkActiveBookings = async () => {
      try {
        const res = await ApiClient.request('/customer/bookings');
        if (res.success && res.data && isMounted) {
          const list = res.data;
          for (const b of list) {
            const prev = knownStatusRef.current[b.id];
            const curr = b.status;

            if (prev && prev !== curr) {
              const workerName = b.worker?.user?.name || 'Technician';
              if (curr === 'WORKER_ACCEPTED') {
                playSound('ping');
                setToast({
                  id: String(Date.now()),
                  type: 'ACCEPTED',
                  title: '✅ Technician Assigned!',
                  message: `${workerName} has accepted your booking #${b.bookingNumber}.`,
                  bookingId: b.id,
                  workerName
                });
              } else if (curr === 'WORKER_EN_ROUTE') {
                playSound('ping');
                setToast({
                  id: String(Date.now()),
                  type: 'EN_ROUTE',
                  title: '🚗 Technician Is On The Way!',
                  message: `${workerName} is en route to your location. Live GPS active.`,
                  bookingId: b.id,
                  workerName
                });
              } else if (curr === 'WORKER_ARRIVED') {
                playSound('alert');
                setToast({
                  id: String(Date.now()),
                  type: 'ARRIVED',
                  title: '📍 Technician Has Arrived!',
                  message: `${workerName} is at your doorstep. Please share PIN: ${b.otp} to start.`,
                  bookingId: b.id,
                  workerName
                });
              } else if (curr === 'SERVICE_STARTED') {
                playSound('ping');
                setToast({
                  id: String(Date.now()),
                  type: 'STARTED',
                  title: '⚡ Service Started!',
                  message: `PIN verified. ${workerName} has commenced your service.`,
                  bookingId: b.id,
                  workerName
                });
              } else if (curr === 'COMPLETED') {
                playSound('fanfare');
                setToast({
                  id: String(Date.now()),
                  type: 'COMPLETED',
                  title: '🎉 Service Completed!',
                  message: `Your service is completed (Total: ₹${b.totalAmount}). Tap to rate.`,
                  bookingId: b.id,
                  workerName
                });
              }
            }
            knownStatusRef.current[b.id] = curr;
          }
        }
      } catch (e) {
        // Ignore background polling glitches
      }
    };

    checkActiveBookings();
    const interval = setInterval(checkActiveBookings, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  // Auto-dismiss toast after 8 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!toast) {
    return activeChat ? (
      <ChatDrawer
        bookingId={activeChat.bookingId}
        workerName={activeChat.workerName}
        isOpen={!!activeChat}
        onClose={() => setActiveChat(null)}
      />
    ) : null;
  }

  const handleToastClick = () => {
    if (toast.type === 'CHAT') {
      setActiveChat({
        bookingId: toast.bookingId,
        workerName: toast.workerName || 'Service Partner'
      });
    } else {
      navigate(`/booking/${toast.bookingId}/track`);
    }
    setToast(null);
  };

  const getTheme = () => {
    switch (toast.type) {
      case 'COMPLETED':
      case 'ACCEPTED':
        return {
          bg: 'bg-emerald-950/95 border-emerald-500 text-white',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
          icon: <Sparkles className="w-5 h-5" />
        };
      case 'ARRIVED':
      case 'EXTRA_CHARGE':
        return {
          bg: 'bg-amber-950/95 border-amber-500 text-white',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
          icon: <MapPin className="w-5 h-5" />
        };
      case 'EN_ROUTE':
        return {
          bg: 'bg-blue-950/95 border-blue-500 text-white',
          badge: 'bg-blue-500/20 text-blue-300 border-blue-400/40',
          icon: <Navigation className="w-5 h-5" />
        };
      case 'STARTED':
        return {
          bg: 'bg-purple-950/95 border-purple-500 text-white',
          badge: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
          icon: <Zap className="w-5 h-5" />
        };
      default:
        return {
          bg: 'bg-indigo-950/95 border-indigo-500 text-white',
          badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40',
          icon: <MessageSquare className="w-5 h-5" />
        };
    }
  };

  const theme = getTheme();

  return (
    <>
      <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 animate-in slide-in-from-top-4 duration-300">
        <div
          onClick={handleToastClick}
          className={`p-4 rounded-3xl shadow-2xl border backdrop-blur-md flex items-start space-x-3 cursor-pointer transition-all hover:scale-[1.02] active:scale-98 ${theme.bg}`}
        >
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border ${theme.badge}`}
          >
            {theme.icon}
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <span className="text-xs font-black block tracking-tight text-white">{toast.title}</span>
            <p className="text-xs text-slate-200 mt-0.5 line-clamp-2 leading-relaxed">
              {toast.message}
            </p>
            <span className="text-[10px] text-slate-300 underline font-bold mt-1.5 inline-flex items-center space-x-1">
              <span>{toast.type === 'CHAT' ? 'Tap to open chat & reply' : 'Tap to track live in real-time'}</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setToast(null);
            }}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {activeChat && (
        <ChatDrawer
          bookingId={activeChat.bookingId}
          workerName={activeChat.workerName}
          isOpen={!!activeChat}
          onClose={() => setActiveChat(null)}
        />
      )}
    </>
  );
};
