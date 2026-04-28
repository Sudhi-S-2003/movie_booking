import React, { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useNotification } from '../../providers/NotificationProvider.js';

interface NotificationRequestProps {
  variant?: 'button' | 'icon';
}

export const NotificationRequest: React.FC<NotificationRequestProps> = ({ variant = 'button' }) => {
  const { requestPermission } = useNotification();
  const [status, setStatus] = useState<NotificationPermission>(Notification.permission);

  const handleRequest = async () => {
    if (status === 'granted') return;
    const granted = await requestPermission();
    setStatus(granted ? 'granted' : 'denied');
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleRequest}
        className={`w-9 h-9 flex items-center justify-center border rounded-xl transition-all ${
          status === 'granted'
            ? 'bg-green-500/10 text-green-500 border-green-500/20 cursor-default'
            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
        }`}
        title={status === 'granted' ? 'Notifications Active' : 'Enable Notifications'}
      >
        {status === 'granted' ? <Bell size={16} /> : <BellOff size={16} />}
      </button>
    );
  }

  return (
    <button
      onClick={handleRequest}
      className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
        status === 'granted'
          ? 'bg-green-500/10 text-green-500 border border-green-500/20 cursor-default'
          : 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20 hover:bg-accent-blue/20'
      }`}
    >
      {status === 'granted' ? (
        <>
          <Bell size={14} />
          Notifications Active
        </>
      ) : (
        <>
          <BellOff size={14} />
          Enable Push Alerts
        </>
      )}
    </button>
  );
};
