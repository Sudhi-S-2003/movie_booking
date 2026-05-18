import React, { useState, useEffect } from 'react';
import { Shield, Check, Copy, Download, AlertTriangle } from 'lucide-react';
import { authApi } from '../../services/api/auth.api.js';
import { useAuthStore } from '../../store/authStore.js';
import { TwoFactorInput } from './TwoFactorInput.js';

export const TwoFactorManager: React.FC = () => {
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
      setError(err.response?.data?.message || 'Failed to load 2FA setup configuration.');
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
      
      if (user) {
        setAuth({ ...user, twoFactorEnabled: true }, useAuthStore.getState().token || '', useAuthStore.getState().refreshToken || '');
      }
      
      setStep('backup');
      setCode('');
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
      
      if (user) {
        setAuth({ ...user, twoFactorEnabled: false }, useAuthStore.getState().token || '', useAuthStore.getState().refreshToken || '');
      }
      
      setStep('intro');
      setCode('');
      loadSetupDetails();
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
    <div className="bg-white/[0.02] border border-white/5 p-8 sm:p-12 rounded-[48px] backdrop-blur-md">
      <div className="flex items-center gap-5 mb-8">
        <div className="w-16 h-16 rounded-[24px] bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center text-accent-purple">
          <Shield size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">Two-Factor Authentication</h2>
          <p className="text-sm text-gray-500 mt-1">TOTP protection on credential matches</p>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs">
          <AlertTriangle className="flex-shrink-0" size={16} />
          <span>{error}</span>
        </div>
      )}

      {isEnabled ? (
        /* DISABLE FLOW INLINE */
        <div className="space-y-6">
          <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl flex gap-3 text-yellow-400/90 text-xs">
            <AlertTriangle className="flex-shrink-0 mt-0.5" size={16} />
            <p className="leading-relaxed">
              <strong>Warning:</strong> Disabling Two-Factor Authentication reduces your account security. An attacker who steals your password will be able to access your administrative actions easily.
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

            <div className="pt-4">
              <button
                onClick={handleDisable}
                disabled={code.length < 6 || loading}
                className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-sm font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
              >
                {loading ? 'Disabling...' : 'Verify & Disable'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ENABLE FLOW INLINE */
        <div>
          {step === 'intro' && (
            <div className="space-y-6">
              <p className="text-gray-400 text-sm leading-relaxed">
                Two-factor authentication adds an extra layer of security to your dashboard. In addition to your password, you'll need to enter a 6-digit code generated by an app on your phone to gain administrative access.
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-4 p-4 bg-white/[0.01] rounded-2xl border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-accent-blue/10 text-accent-blue text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <p className="text-xs text-gray-300 leading-relaxed">Scan the high-quality QR code with your security authenticator application.</p>
                </div>
                <div className="flex items-start gap-4 p-4 bg-white/[0.01] rounded-2xl border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-accent-blue/10 text-accent-blue text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <p className="text-xs text-gray-300 leading-relaxed">Input the 6-digit verification code from your application to confirm setup.</p>
                </div>
                <div className="flex items-start gap-4 p-4 bg-white/[0.01] rounded-2xl border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-accent-blue/10 text-accent-blue text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <p className="text-xs text-gray-300 leading-relaxed">Save your one-time backup codes safely to recover your account if you lose your phone.</p>
                </div>
              </div>

              <button
                onClick={() => setStep('setup')}
                disabled={loading || !qrCode}
                className="w-full py-4 rounded-2xl bg-accent-purple hover:bg-accent-purple/90 disabled:opacity-50 text-sm font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent-purple/20 mt-4"
              >
                {loading ? 'Preparing Setup...' : 'Get Started'}
              </button>
            </div>
          )}

          {step === 'setup' && (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center py-6 bg-[#141416]/50 border border-white/5 rounded-3xl p-4">
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
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 text-center">Verify Code</h3>
                <TwoFactorInput value={code} onChange={setCode} disabled={loading} />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setStep('intro')}
                  className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-black uppercase tracking-widest text-white transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleVerify}
                  disabled={code.length < 6 || loading}
                  className="flex-1 py-3.5 rounded-2xl bg-accent-purple hover:bg-accent-purple/90 disabled:opacity-50 text-xs font-black uppercase tracking-widest text-white transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? 'Verifying...' : 'Verify & Enable'}
                </button>
              </div>
            </div>
          )}

          {step === 'backup' && (
            <div className="space-y-6">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-3 text-green-400 text-xs">
                <Check className="flex-shrink-0" size={16} />
                <span>Two-Factor Authentication has been successfully enabled!</span>
              </div>

              <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl flex gap-3 text-yellow-400/90 text-xs">
                <AlertTriangle className="flex-shrink-0 mt-0.5" size={16} />
                <p className="leading-relaxed">
                  <strong>Important:</strong> Recovery codes allow you to access your account if you lose your authentication device. Each code can only be used once. Store them securely!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 p-4 bg-[#141416] rounded-2xl border border-white/5 font-mono text-center text-xs tracking-wider text-white">
                {backupCodes.map((c, idx) => (
                  <div key={idx} className="py-2 bg-white/[0.01] border border-white/5 rounded-xl">
                    {c}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCopyBackupCodes}
                  className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-black uppercase tracking-widest text-gray-300 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  {copiedCodes ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  {copiedCodes ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleDownloadBackupCodes}
                  className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-black uppercase tracking-widest text-gray-300 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={14} /> Download TXT
                </button>
              </div>

              <button
                onClick={() => setStep('intro')}
                className="w-full py-4 rounded-2xl bg-accent-purple hover:bg-accent-purple/90 text-sm font-black uppercase tracking-widest text-white transition-colors flex items-center justify-center gap-2 shadow-lg shadow-accent-purple/20 mt-4"
              >
                Setup Completed
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
