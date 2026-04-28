import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Smartphone, Shield, X, RefreshCw, Clock, MapPin } from 'lucide-react';
import { authApi, type UserSession } from '../../../services/api/index.js';

export const SessionManager = () => {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      const res = await authApi.listSessions();
      setSessions(res.sessions);
    } catch (err) {
      console.error('Failed to fetch sessions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      await authApi.revokeSession(id);
      setSessions(prev => prev.filter(s => s._id !== id));
    } catch (err) {
      console.error('Failed to revoke session', err);
    } finally {
      setRevoking(null);
    }
  };

  const getDeviceIcon = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobi') || ua.includes('android') || ua.includes('iphone')) return Smartphone;
    if (ua.includes('electron') || ua.includes('postman')) return Shield;
    return Monitor;
  };

  const parseUserAgent = (ua: string) => {
    if (ua.includes('Firefox')) return 'Firefox Browser';
    if (ua.includes('Chrome')) return 'Chrome Browser';
    if (ua.includes('Safari')) return 'Safari Browser';
    if (ua.includes('Edge')) return 'Edge Browser';
    if (ua.includes('Postman')) return 'Postman Runtime';
    return 'Unknown Device';
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <RefreshCw className="w-8 h-8 text-accent-blue animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Retrieving active sessions...</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div />
        <div className="px-4 py-2 bg-accent-blue/10 border border-accent-blue/20 rounded-xl">
           <span className="text-[10px] font-black text-accent-blue uppercase tracking-widest">{sessions.length} Active Devices</span>
        </div>
      </div>

      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {sessions.map((session) => {
            const Icon = getDeviceIcon(session.userAgent);
            return (
              <motion.div
                key={session._id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/[0.05] transition-all"
              >
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-accent-blue group-hover:scale-110 transition-transform">
                    <Icon size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-white flex items-center gap-2">
                      {parseUserAgent(session.userAgent)}
                      {session.isCurrent ? (
                        <span className="px-2 py-0.5 bg-accent-blue/20 text-accent-blue text-[8px] font-black rounded-md border border-accent-blue/30 uppercase tracking-tighter">
                          This Device
                        </span>
                      ) : session.isValid && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </h4>
                    <div className="flex flex-wrap gap-4 mt-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                        <MapPin size={12} /> {session.ip}
                      </span>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Clock size={12} /> Last active: {new Date(session.lastActive).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>

                {!session.isCurrent && (
                  <button
                    onClick={() => handleRevoke(session._id)}
                    disabled={revoking === session._id}
                    className="p-4 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
                    title="Revoke Session"
                  >
                    {revoking === session._id ? (
                      <RefreshCw size={20} className="animate-spin" />
                    ) : (
                      <X size={20} />
                    )}
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="p-6 bg-accent-blue/5 border border-accent-blue/10 rounded-3xl flex items-start gap-4">
        <Shield className="text-accent-blue mt-1" size={20} />
        <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
          <strong className="text-white uppercase tracking-widest block mb-1">Security Note</strong>
          If you notice any suspicious activity or devices you don't recognize, revoke the session immediately and change your password.
        </p>
      </div>
    </div>
  );
};
