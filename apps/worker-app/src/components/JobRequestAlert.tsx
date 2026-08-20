import React, { useState, useEffect } from 'react';
import { Bell, MapPin, Clock, Check, X, ShieldAlert, Zap, Banknote, Calendar } from 'lucide-react';
import { WorkerApiClient } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useWorkerAuth } from '../context/WorkerAuthContext';
import { playSound, speakVoice } from '../services/sound';

interface JobRequestAlertProps {
  alert: {
    bookingId: string;
    bookingNumber: string;
    serviceName: string;
    customerName: string;
    scheduledDate: string;
    scheduledTimeSlot: string;
    address: string;
    distanceKm: number;
    estimatedEarnings: number;
    expiresInSeconds: number;
  };
  onDismiss: () => void;
}

export const JobRequestAlert: React.FC<JobRequestAlertProps> = ({ alert, onDismiss }) => {
  const navigate = useNavigate();
  const { recordDecline } = useWorkerAuth();
  const [timeLeft, setTimeLeft] = useState(alert.expiresInSeconds || 60);
  const [isProcessing, setIsProcessing] = useState(false);

  // Play notification chime and vocal announcement
  useEffect(() => {
    playSound('alert');
    speakVoice(`New booking dispatch for ${alert.serviceName || 'service'}`);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onDismiss]);

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      const res = await WorkerApiClient.request(`/bookings/${alert.bookingId}/accept`, {
        method: 'POST'
      });

      if (res.success) {
        onDismiss();
        navigate(`/job/${alert.bookingId}`);
      } else {
        window.alert(res.message || 'Job was already taken by another worker');
        onDismiss();
      }
    } catch (e: any) {
      window.alert(e.message || 'Failed to accept job');
      onDismiss();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    recordDecline(alert.bookingId);
    try {
      await WorkerApiClient.request(`/bookings/${alert.bookingId}/reject`, {
        method: 'POST'
      });
      onDismiss();
    } catch (e) {
      onDismiss();
    } finally {
      setIsProcessing(false);
    }
  };

  const totalTime = alert.expiresInSeconds || 60;
  const progressPercent = (timeLeft / totalTime) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-white animate-in zoom-in-95">
        {/* Header with Circular Countdown */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black animate-pulse border border-emerald-500/40">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">⚡ New Job Request!</h3>
              <span className="text-[11px] text-emerald-400 font-bold">1 Minute to Respond</span>
            </div>
          </div>

          {/* Countdown Clock */}
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-12 h-12 transform -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="4"
                className="text-slate-800"
                fill="transparent"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="4"
                className="text-emerald-400 transition-all duration-1000"
                fill="transparent"
                strokeDasharray={125.6}
                strokeDashoffset={125.6 - (125.6 * progressPercent) / 100}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute font-black text-xs text-white">{timeLeft}s</span>
          </div>
        </div>

        {/* Service Details & Payout */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                #{alert.bookingNumber}
              </span>
              <h4 className="text-base font-bold text-white mt-0.5">{alert.serviceName}</h4>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-semibold">Your Net Payout</span>
              <span className="text-xl font-black text-emerald-400">₹{alert.estimatedEarnings}</span>
            </div>
          </div>

          {/* Customer & Distance */}
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-2 border-t border-slate-900">
            <div className="flex items-center space-x-1.5">
              <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{alert.distanceKm} km away</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>{alert.scheduledTimeSlot}</span>
            </div>
          </div>

          <div className="text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="font-semibold text-slate-300 block">{alert.customerName}</span>
            <span className="line-clamp-1">{alert.address}</span>
          </div>
        </div>

        {/* Action Buttons: Accept / Decline */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-2xl border border-slate-700 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-red-400" />
            <span>Decline</span>
          </button>

          <button
            onClick={handleAccept}
            disabled={isProcessing}
            className="py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center justify-center space-x-1.5 transition-transform active:scale-95 cursor-pointer"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>Accept Job ({timeLeft}s)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
