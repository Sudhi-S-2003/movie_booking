import React, { useState, useEffect } from 'react';
import { Fingerprint, Plus, Trash2, Key, Check, AlertTriangle } from 'lucide-react';
import { useSecurityStore } from '../../store/securityStore.js';

export const PasskeyManager: React.FC = () => {
  const {
    passkeys,
    loading,
    error,
    success,
    fetchPasskeys,
    addPasskey,
    deletePasskey,
    clearMessages,
  } = useSecurityStore();

  const [newPasskeyName, setNewPasskeyName] = useState('');
  const [passkeyModalOpen, setPasskeyModalOpen] = useState(false);

  useEffect(() => {
    fetchPasskeys();
    return () => {
      clearMessages();
    };
  }, []);

  const handleAddPasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasskeyName.trim()) return;

    try {
      await addPasskey(newPasskeyName);
      setNewPasskeyName('');
      setPasskeyModalOpen(false);
    } catch (err) {
      // Error is set in the Zustand store and rendered below
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-5 mb-2">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-3">
            <Fingerprint size={24} className="text-accent-blue animate-pulse" />
            Biometric Passkeys
          </h2>
          <p className="text-xs text-gray-500 mt-1">Phishing-resistant biometrics & hardware keys</p>
        </div>

        <button
          onClick={() => { clearMessages(); setPasskeyModalOpen(true); }}
          className="p-3 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 text-accent-blue hover:bg-accent-blue hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95 text-[10px] font-black uppercase tracking-widest"
        >
          <Plus size={14} /> Add Key
        </button>
      </div>

      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-3 text-green-400 text-xs">
          <Check className="flex-shrink-0" size={16} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs">
          <AlertTriangle className="flex-shrink-0" size={16} />
          <span>{error}</span>
        </div>
      )}

      {passkeyModalOpen && (
        <form onSubmit={handleAddPasskey} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
          <h3 className="text-sm font-bold text-white">Register a New Passkey</h3>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Device Friendly Name</label>
            <input
              type="text"
              placeholder="e.g. My Touch ID MacBook"
              value={newPasskeyName}
              onChange={(e) => setNewPasskeyName(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-blue/50 w-full placeholder:text-gray-600"
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setPasskeyModalOpen(false); setNewPasskeyName(''); clearMessages(); }}
              className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newPasskeyName.trim() || loading}
              className="flex-1 py-3 rounded-xl bg-accent-blue text-white hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 text-[10px] font-black uppercase tracking-widest transition-all"
            >
              {loading ? 'Initializing...' : 'Add Key'}
            </button>
          </div>
        </form>
      )}

      {loading && passkeys.length === 0 ? (
        <div className="py-10 text-center text-gray-500 text-xs animate-pulse">Syncing authenticators...</div>
      ) : passkeys.length === 0 ? (
        <div className="text-center py-10 bg-[#141416]/20 border border-white/5 rounded-3xl text-gray-500 text-xs space-y-2">
          <Key className="mx-auto text-gray-600" size={24} />
          <p>No passkeys registered on your profile yet.</p>
          <p className="text-[10px] text-gray-600">Register your biometric keychain for password-free credentials.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {passkeys.map((pk) => (
            <div key={pk._id} className="p-4 bg-[#141416]/40 border border-white/5 rounded-2xl flex items-center justify-between hover:border-accent-blue/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent-blue/5 flex items-center justify-center text-accent-blue border border-accent-blue/10">
                  <Fingerprint size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">{pk.friendlyName}</h4>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Registered {new Date(pk.createdAt).toLocaleDateString()} &bull; {pk.deviceType === 'multiDevice' ? 'Keychain Synced' : 'Device Bound'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => deletePasskey(pk._id)}
                disabled={loading}
                className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                title="Remove Passkey"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default PasskeyManager;
