import React, { useState, useEffect } from 'react';
import { MessageSquare, X, ArrowRight, Ban, AlertOctagon } from 'lucide-react';
import { getWorkerSocket } from '../services/socket';
import { SOCKET_EVENTS } from '@nearwork/types';
import { useWorkerAuth } from '../context/WorkerAuthContext';
import { WorkerChatDrawer } from './WorkerChatDrawer';
import { playSound, speakVoice } from '../services/sound';
import { useNavigate } from 'react-router-dom';

interface WorkerToastData {
  id: string;
  type: 'CHAT' | 'CANCELLED';
  title: string;
  message: string;
  bookingId: string;
  customerName?: string;
}

export const WorkerGlobalNotification: React.FC = () => {
  const { worker, setActiveJobAlert } = useWorkerAuth();
  const navigate = useNavigate();
  const [toast, setToast] = useState<WorkerToastData | null>(null);
  const [activeChat, setActiveChat] = useState<{ bookingId: string; customerName: string } | null>(null);

  useEffect(() => {
    if (!worker) return;
    const socket = getWorkerSocket();

    // 1. Customer Chat Message
    const handleChatMessage = (data: any) => {
      const msg = data.message || data;
      // Only notify if message is from the customer (not our own message)
      if (msg.senderId && msg.senderId !== worker.id) {
        playSound('ping');
        const customerName = data.senderName || msg.sender?.name || 'Customer';
        setToast({
          id: String(Date.now()),
          type: 'CHAT',
          title: `💬 Message from ${customerName}`,
          message: msg.message,
          bookingId: data.bookingId,
          customerName
        });
      }
    };

    // 2. Customer Cancelled Booking
    const handleBookingCancelled = (data: any) => {
      playSound('alert');
      speakVoice('Booking has been cancelled by customer. Do not proceed.');
      setActiveJobAlert(null); // Dismiss any active dispatch modal

      setToast({
        id: String(Date.now()),
        type: 'CANCELLED',
        title: '🚫 Booking Cancelled by Customer!',
        message: data.message || `Customer cancelled booking #${data.bookingNumber || ''}. Please do NOT proceed to the address.`,
        bookingId: data.bookingId
      });
    };

    socket.on(SOCKET_EVENTS.CHAT_MESSAGE, handleChatMessage);
    socket.on(SOCKET_EVENTS.BOOKING_CANCELLED, handleBookingCancelled);

    return () => {
      socket.off(SOCKET_EVENTS.CHAT_MESSAGE, handleChatMessage);
      socket.off(SOCKET_EVENTS.BOOKING_CANCELLED, handleBookingCancelled);
    };
  }, [worker, setActiveJobAlert]);

  // Auto-dismiss toast after 9 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 9000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!toast) {
    return activeChat ? (
      <WorkerChatDrawer
        bookingId={activeChat.bookingId}
        customerName={activeChat.customerName}
        isOpen={!!activeChat}
        onClose={() => setActiveChat(null)}
      />
    ) : null;
  }

  const handleToastClick = () => {
    if (toast.type === 'CHAT') {
      setActiveChat({
        bookingId: toast.bookingId,
        customerName: toast.customerName || 'Customer'
      });
    } else {
      navigate('/');
    }
    setToast(null);
  };

  const isCancelled = toast.type === 'CANCELLED';

  return (
    <>
      <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 animate-in slide-in-from-top-4 duration-300">
        <div
          onClick={handleToastClick}
          className={`p-4 rounded-3xl shadow-2xl border backdrop-blur-md flex items-start space-x-3 cursor-pointer transition-all hover:scale-[1.02] active:scale-98 ${
            isCancelled
              ? 'bg-red-950/95 border-red-500 text-white ring-2 ring-red-500/50'
              : 'bg-slate-900 border-indigo-500 text-white'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-2xl border flex items-center justify-center flex-shrink-0 ${
              isCancelled
                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                : 'bg-indigo-500/20 text-indigo-400 border-indigo-400/40'
            }`}
          >
            {isCancelled ? <AlertOctagon className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <span className="text-xs font-black block tracking-tight text-white">{toast.title}</span>
            <p className="text-xs text-slate-200 mt-0.5 line-clamp-2 leading-relaxed">
              {toast.message}
            </p>
            <span
              className={`text-[10px] underline font-bold mt-1.5 inline-flex items-center space-x-1 ${
                isCancelled ? 'text-red-300' : 'text-indigo-400'
              }`}
            >
              <span>{isCancelled ? 'Tap to return to dashboard' : 'Tap to open chat & reply'}</span>
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
        <WorkerChatDrawer
          bookingId={activeChat.bookingId}
          customerName={activeChat.customerName}
          isOpen={!!activeChat}
          onClose={() => setActiveChat(null)}
        />
      )}
    </>
  );
};
