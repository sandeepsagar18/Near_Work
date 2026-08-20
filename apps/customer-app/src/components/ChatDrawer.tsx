import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, Image as ImageIcon } from 'lucide-react';
import { ApiClient } from '../services/api';
import { getSocket } from '../services/socket';
import { SOCKET_EVENTS } from '@nearwork/types';
import { useAuth } from '../context/AuthContext';

interface ChatDrawerProps {
  bookingId: string;
  workerName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  bookingId,
  workerName,
  isOpen,
  onClose
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await ApiClient.request(`/chat/messages/${bookingId}`);
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

      const socket = getSocket();
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
      await ApiClient.request('/chat/messages', {
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
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-indigo-600 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
              {workerName.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-sm">{workerName}</h3>
              <span className="text-xs text-indigo-100 flex items-center">
                <span className="w-2 h-2 rounded-full bg-green-400 mr-1.5 animate-pulse"></span>
                Assigned Professional
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message history */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs">
              Say hello! Chat is private and secured for this booking.
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.senderId === user?.id;
              return (
                <div
                  key={index}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      isMe
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                    }`}
                  >
                    <p>{msg.message}</p>
                    <span
                      className={`text-[10px] block mt-1 ${
                        isMe ? 'text-indigo-200 text-right' : 'text-gray-400'
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
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form
          onSubmit={handleSend}
          className="p-3 border-t border-gray-200 bg-white flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
