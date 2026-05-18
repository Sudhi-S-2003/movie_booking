import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Shield, Check, Copy, Download, AlertTriangle } from 'lucide-react';
import { authApi } from '../services/api/auth.api.js';
import { useAuthStore } from '../store/authStore.js';
import { TwoFactorInput } from '../components/auth/TwoFactorInput.js';
import { SEO } from '../components/common/SEO.js';

export const TwoFactorSetup: React.FC = () => {
  const navigate = useNavigate();
  const { user, setAuth } = useAuthStore();
  const isEnabled = user?.twoFactorEnabled || false;

  const [step, setStep] = useState<'intro' | 'setup' | 'backup'>('intro');
  
  // Setup data
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Verification / Disable state
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Backup codes state
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState(false);

  useEffect(() => {
    if (!isEnabled && step === 'intro') {
      // Pre-fetch QR Code details
      loadSetupDetails();
    }
  }, [isEnabled]);

  const loadSetupDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authApi.setup2FA();
      setQrCode(res.qrCodeDataUrl);
      setSecret(res.secret);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load 2FA configuration details.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVerify = async () => {
    if (code.length < 6) return;
    try {
      setLoading(true);
      setError(null);
      
      const res = await authApi.verify2FA({ code });
      setBackupCodes(res.backupCodes);
      
      // Update state
      if (user) {
        setAuth({ ...user, twoFactorEnabled: true }, useAuthStore.getState().token || '', useAuthStore.getState().refreshToken || '');
      }
      
      setStep('backup');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code. Please try again.');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (code.length < 6) return;
    try {
      setLoading(true);
      setError(null);
      await authApi.disable2FA({ code });
      
      // Update state
      if (user) {
        setAuth({ ...user, twoFactorEnabled: false }, useAuthStore.getState().token || '', useAuthStore.getState().refreshToken || '');
      }
      
      navigate(-1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification or backup code.');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBackupCodes = () => {
    if (backupCodes.length) {
      navigator.clipboard.writeText(backupCodes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  const handleDownloadBackupCodes = () => {
    if (!backupCodes.length) return;
    const text = `CINEMA CONNECT BACKUP CODES\n============================\nStore these codes safely. They are single-use only.\n\n${backupCodes.join('\n')}\n\nGenerated on: ${new Date().toLocaleString()}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cinema-connect-backup-codes.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[80vh] pb-32 pt-8 max-w-xl mx-auto px-4">
      <SEO title="Two-Factor Authentication Setup" description="Secure your account using TOTP Google Authenticator" />
      
      {/* Back link */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft size={16} /> Back to profile settings
      </button>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-xl"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center text-accent-purple">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Two-Factor Authentication</h1>
            <p className="text-xs text-gray-400 mt-0.5">Protect your account using TOTP authentication</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs">
            <AlertTriangle className="flex-shrink-0" size={16} />
            <span>{error}</span>
          </div>
        )}

        {isEnabled ? (
          /* DISABLE FLOW */
          <div className="space-y-6">
            <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl flex gap-3 text-yellow-400/90 text-xs">
              <AlertTriangle className="flex-shrink-0 mt-0.5" size={16} />
              <p className="leading-relaxed">
                <strong>Warning:</strong> Disabling Two-Factor Authentication reduces your account security. An attacker who steals your password will be able to access your account easily.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white text-center">Enter your 6-digit authenticator or backup code to disable</h3>
              <div className="py-2">
                <TwoFactorInput
                  value={code}
                  onChange={setCode}
                  disabled={loading}
                  isBackupMode={code.includes('-') || (code.length > 0 && isNaN(Number(code[0])))}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => navigate(-1)}
                  className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-bold text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisable}
                  disabled={code.length < 6 || loading}
                  className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-sm font-bold text-white transition-colors shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                >
                  {loading ? 'Disabling...' : 'Verify & Disable'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ENABLE FLOW */
          <AnimatePresence mode="wait">
            {step === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <p className="text-gray-400 text-xs leading-relaxed">
                  Two-factor authentication adds an extra layer of security to your account. In addition to your password, you'll need to enter a 6-digit code generated by an app on your phone (like Google Authenticator, Authy, or 1Password) to log in.
                </p>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-white/[0.01] rounded-xl border border-white/5">
                    <span className="w-5 h-5 rounded-full bg-accent-blue/10 text-accent-blue text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    <p className="text-xs text-gray-300 leading-relaxed">Scan the QR code with your authenticator application.</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/[0.01] rounded-xl border border-white/5">
                    <span className="w-5 h-5 rounded-full bg-accent-blue/10 text-accent-blue text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                    <p className="text-xs text-gray-300 leading-relaxed">Input the 6-digit verification code from your application to confirm the installation.</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/[0.01] rounded-xl border border-white/5">
                    <span className="w-5 h-5 rounded-full bg-accent-blue/10 text-accent-blue text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                    <p className="text-xs text-gray-300 leading-relaxed">Securely store single-use recovery codes in case you lose access to your device.</p>
                  </div>
                </div>

                <button
                  onClick={() => setStep('setup')}
                  disabled={loading || !qrCode}
                  className="w-full py-3.5 rounded-2xl bg-accent-purple hover:bg-accent-purple/90 disabled:opacity-50 text-sm font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent-purple/20 mt-4"
                >
                  {loading ? 'Preparing Setup...' : 'Get Started'}
                </button>
              </motion.div>
            )}

            {step === 'setup' && (
              <motion.div
                key="setup"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="flex flex-col items-center justify-center py-4 bg-[#141416]/50 border border-white/5 rounded-3xl p-4">
                  {qrCode ? (
                    <img src={qrCode} alt="TOTP QR Code" className="w-48 h-48 rounded-2xl border-4 border-white" />
                  ) : (
                    <div className="w-48 h-48 rounded-2xl bg-white/5 animate-pulse flex items-center justify-center text-gray-500">
                      Generating...
                    </div>
                  )}
                  <p className="text-gray-500 text-[10px] uppercase font-bold mt-4 tracking-wider">Scan this QR Code</p>
                </div>

                <div className="p-4 bg-[#141416]/30 border border-white/5 rounded-2xl flex items-center justify-between">
                  <div className="overflow-hidden mr-2">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-wider">Manual Setup Key</p>
                    <p className="text-xs font-mono text-white select-all break-all mt-1">{secret || 'Loading...'}</p>
                  </div>
                  <button
                    onClick={handleCopySecret}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all flex-shrink-0"
                    title="Copy Key"
                  >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                </div>

                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 text-center">Verify Verification Code</h3>
                  <TwoFactorInput value={code} onChange={setCode} disabled={loading} />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setStep('intro')}
                    className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-bold text-white transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleVerify}
                    disabled={code.length < 6 || loading}
                    className="flex-1 py-3 rounded-2xl bg-accent-purple hover:bg-accent-purple/90 disabled:opacity-50 text-sm font-bold text-white transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? 'Verifying...' : 'Verify & Enable'}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'backup' && (
              <motion.div
                key="backup"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-3 text-green-400 text-xs">
                  <Check className="flex-shrink-0" size={16} />
                  <span>Two-Factor Authentication has been successfully enabled!</span>
                </div>

                <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl flex gap-3 text-yellow-400/90 text-xs">
                  <AlertTriangle className="flex-shrink-0 mt-0.5" size={16} />
                  <p className="leading-relaxed">
                    <strong>Important:</strong> Recovery codes are single-use codes that will allow you to access your account if you lose access to your device. Store them safely!
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 p-4 bg-[#141416] rounded-2xl border border-white/5 font-mono text-center text-xs tracking-wider text-white">
                  {backupCodes.map((c, idx) => (
                    <div key={idx} className="py-2 bg-white/[0.01] border border-white/5 rounded-xl">
                      {c}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCopyBackupCodes}
                    className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold text-gray-300 hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                    {copiedCodes ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    {copiedCodes ? 'Copied!' : 'Copy Codes'}
                  </button>
                  <button
                    onClick={handleDownloadBackupCodes}
                    className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold text-gray-300 hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <Download size={14} /> Download TXT
                  </button>
                </div>

                <button
                  onClick={() => navigate(-1)}
                  className="w-full py-3.5 rounded-2xl bg-accent-purple hover:bg-accent-purple/90 text-sm font-bold text-white transition-colors flex items-center justify-center gap-2 shadow-lg shadow-accent-purple/20 mt-4"
                >
                  Done, Setup Complete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
};
