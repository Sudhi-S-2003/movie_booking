import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { SEO } from '../components/common/SEO.js';
import { authApi } from '../services/api/auth.api.js';
import { TwoFactorInput } from '../components/auth/TwoFactorInput.js';
import { safeSession } from '../utils/storage.js';

export const LoginVerify2FA: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Extract tempToken and redirect target safely from storage
  const tempToken = safeSession.getItem('temp_2fa_token');
  const from = safeSession.getItem('redirect_from') || '/';

  useEffect(() => {
    if (!tempToken) {
      setError('Session expired or invalid. Please login again.');
    }
  }, [tempToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempToken || otpCode.length < 6) return;

    setLoading(true);
    setError('');

    try {
      const res = await authApi.completeTwoFactorLogin({ code: otpCode }, tempToken);
      
      // Save authenticated user and token
      setAuth(res.user, res.token, res.refreshToken || '');
      
      // Clean up temp session keys safely
      safeSession.removeItem('temp_2fa_token');
      safeSession.removeItem('redirect_from');
      safeSession.removeItem('redirectPath');
      
      // Redirect home or to previous screen
      window.location.href = typeof from === 'string' ? from : '/';
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired authentication code.');
      setOtpCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    safeSession.removeItem('temp_2fa_token');
    safeSession.removeItem('redirect_from');
    navigate('/login');
  };

  return (
    <div className="space-y-6">
      <SEO 
        title="Security Verification - Login" 
        description="Verify your identity with Two-Factor Authentication." 
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6 text-center"
      >
        <div className="flex flex-col items-center justify-center py-4">
          <div className="w-16 h-16 rounded-3xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center text-accent-purple mb-4">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-black text-white">Security Verification</h2>
          <p className="text-xs text-gray-400 mt-2 max-w-sm leading-relaxed">
            Your account is protected by Two-Factor Authentication. Please enter your 6-digit authenticator or single-use backup code.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="py-2">
            <TwoFactorInput
              value={otpCode}
              onChange={setOtpCode}
              disabled={loading || !tempToken}
              isBackupMode={otpCode.includes('-') || (otpCode.length > 0 && isNaN(Number(otpCode[0])))}
            />
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4"
            >
              <p className="text-red-400 text-[10px] font-black uppercase tracking-widest text-center animate-shake">
                {error}
              </p>
            </motion.div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleBackToLogin}
              className="flex-1 py-4 rounded-[20px] bg-white/5 border border-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft size={14} /> Back to Login
            </button>
            <button
              type="submit"
              disabled={otpCode.length < 6 || loading || !tempToken}
              className={`flex-1 py-4 rounded-[20px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 text-xs ${
                otpCode.length < 6 || loading || !tempToken
                  ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                  : 'bg-accent-purple text-white hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {loading ? 'Verifying...' : 'Verify Login'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
