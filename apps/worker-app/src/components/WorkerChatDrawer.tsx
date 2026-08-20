import React, { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { WorkerApiClient } from '../services/api';
import { getWorkerSocket } from '../services/socket';
import { SOCKET_EVENTS } from '@nearwork/types';
import { useWorkerAuth } from '../context/WorkerAuthContext';

interface WorkerChatDrawerProps {
  bookingId: string;
  customerName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const WorkerChatDrawer: React.FC<WorkerChatDrawerProps> = ({
  bookingId,
  customerName,
  isOpen,
  onClose
}) => {
  const { worker } = useWorkerAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await WorkerApiClient.request(`/chat/messages/${bookingId}`);
      if (res.success && res.data) {
        setMessages(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchMessages();

      const socket = getWorkerSocket();
      socket.emit('booking:join', { bookingId });

      const handleNewMessage = (data: any) => {
        if (data.bookingId === bookingId && data.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.message.id)) {
              return prev; // Ignore duplicate
            }
            return [...prev, data.message];
          });
        }
      };

      socket.on(SOCKET_EVENTS.CHAT_MESSAGE, handleNewMessage);

      return () => {
        socket.off(SOCKET_EVENTS.CHAT_MESSAGE, handleNewMessage);
      };
    }
  }, [isOpen, bookingId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText;
    setInputText('');

    try {
      await WorkerApiClient.request('/chat/messages', {
        method: 'POST',
        body: JSON.stringify({
          bookingId,
          message: textToSend
        })
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right text-white">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/80">
          <div>
            <h3 className="font-bold text-sm text-white">Chat with {customerName}</h3>
            <span className="text-xs text-emerald-400">Customer</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-700 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950">
          {messages.map((msg, index) => {
            const isMe =
              msg.senderId === worker?.id ||
              msg.senderId === worker?.workerProfile?.userId ||
              msg.senderId === worker?.workerProfile?.id ||
              msg.sender?.role === 'WORKER';

            return (
              <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-xs shadow-md ${
                    isMe
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-none'
                  }`}
                >
                  <p className="leading-relaxed">{msg.message}</p>
                  <span
                    className={`text-[9px] block mt-1 ${
                      isMe ? 'text-emerald-200 text-right' : 'text-slate-400 text-left'
                    }`}
                  >
                    {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Form input */}
        <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-900 flex items-center space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message to customer..."
            className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 bg-emerald-500 text-slate-950 rounded-full font-bold hover:bg-emerald-400 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
