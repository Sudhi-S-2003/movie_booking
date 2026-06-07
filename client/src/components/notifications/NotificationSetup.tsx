import React, { useState } from 'react';
import { Bell, Volume2, VolumeX, Settings2, ShieldCheck, AlertCircle, Play } from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore.js';
import { useBrowserNotification } from '../../hooks/useBrowserNotification.js';
import { useNotificationAudio } from '../../hooks/useNotificationAudio.js';
import { NotificationType } from '../../constants/enums.js';
import { motion, AnimatePresence } from 'framer-motion';

export const NotificationSetup = React.memo(() => {
  const isSoundEnabled = useNotificationStore(state => state.isSoundEnabled);
  const setSoundEnabled = useNotificationStore(state => state.setSoundEnabled);
  const showToast = useNotificationStore(state => state.showToast);
  const { requestPermission, permissionStatus, showBrowserNotification } = useBrowserNotification();
  const { playNotificationSound } = useNotificationAudio();

  const [isOpen, setIsOpen] = useState(false);

  const testNotification = () => {
    playNotificationSound();
    
    const payload = {
      id: crypto.randomUUID(),
      title: 'Reliability Test',
      message: 'If you see this, the production notification system is healthy.',
      type: NotificationType.SYSTEM,
      url: '/'
    };

    showToast(payload);
    
    // Explicitly test the browser notification even if the tab is focused
    if (permissionStatus === 'granted') {
      showBrowserNotification(payload, payload.title, payload.message);
    }
  };

  const handleEnableAll = async () => {
    // 1. Request Permission
    const granted = await requestPermission();
    
    // 2. Sound is enabled by default in provider, but this click unlocks the audio context
    // 3. Test it
    if (granted) {
      testNotification();
    }
  };

  return (
    <div className="relative">
      {/* Main Setup Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center gap-2 px-3.5 py-2.5 sm:px-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl hover:shadow-2xl active:scale-95 ${
          permissionStatus === 'granted'
            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
            : 'bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-500/50'
        }`}
      >
        <Settings2 size={16} className={isOpen ? 'rotate-90 transition-transform' : 'transition-transform'} />
        <span className="hidden sm:inline">
          {permissionStatus === 'granted' ? 'Notification Settings' : 'Setup Notifications'}
        </span>
      </button>

      {/* Settings Dropdown/Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-[100]" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 sm:right-0 mt-3 w-[calc(100vw-2.5rem)] sm:w-80 z-[101] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              {/* Background Accent */}
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Bell size={16} className="text-indigo-400" />
                Notification Center
              </h3>

              <div className="space-y-4">
                {/* Permission Status */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Status</span>
                    <span className={`text-xs font-bold ${permissionStatus === 'granted' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {permissionStatus === 'granted' ? 'Active & Ready' : 'Permissions Needed'}
                    </span>
                  </div>
                  {permissionStatus === 'granted' ? (
                    <ShieldCheck className="text-emerald-500" size={20} />
                  ) : (
                    <button
                      onClick={handleEnableAll}
                      className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] font-bold rounded-lg transition-colors"
                    >
                      Enable
                    </button>
                  )}
                </div>

                {/* Sound Toggle */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Sound Effects</span>
                    <span className="text-xs font-bold text-white">
                      {isSoundEnabled ? 'Crystal Clear' : 'Silent Mode'}
                    </span>
                  </div>
                  <button
                    onClick={() => setSoundEnabled(!isSoundEnabled)}
                    className={`p-2 rounded-xl transition-all ${
                      isSoundEnabled ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700/50 text-slate-500'
                    }`}
                  >
                    {isSoundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                  </button>
                </div>

                {/* Browser Popups Note */}
                <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                  <div className="flex gap-2">
                    <AlertCircle className="text-amber-500 shrink-0" size={16} />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-amber-500/80 uppercase font-bold tracking-tight italic">Pro Tip</span>
                      <p className="text-[10px] text-slate-400 leading-tight mt-1">
                        Ensure "Pop-ups and redirects" are allowed in your browser settings for a seamless experience.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Test Action */}
                <button
                  onClick={testNotification}
                  disabled={permissionStatus !== 'granted'}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Play size={14} className="fill-current" />
                  Run Diagnostic Test
                </button>
              </div>

              {/* Bottom Decoration */}
              <div className="mt-4 pt-4 border-t border-white/5 flex justify-center">
                <span className="text-[9px] text-slate-600 uppercase font-black tracking-[0.2em]">
                  Production Grade Secure
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
});

NotificationSetup.displayName = 'NotificationSetup';

