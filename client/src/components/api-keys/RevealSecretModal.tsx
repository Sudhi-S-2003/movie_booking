import React, { memo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, Copy, X } from 'lucide-react';
import type { ApiKeyRecord } from '../../services/api/apiKeys.api.js';

interface RevealSecretModalProps {
  /** `null` closes the modal; non-null opens it with the fresh credentials. */
  created:  { key: ApiKeyRecord; secret: string } | null;
  onClose:  () => void;
}

/**
 * One-time reveal of a freshly minted API secret. The backend never stores
 * the raw secret — if the user loses it, they must create a new key.
 */
export const RevealSecretModal = memo(({ created, onClose }: RevealSecretModalProps) => {
  const [copiedKey,    setCopiedKey]    = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const copy = async (value: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(value);
      setter(true);
      setTimeout(() => setter(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <AnimatePresence>
      {created && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#0c0c0c] border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-black uppercase tracking-tight text-white">
                Key Created
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle size={16} className="text-amber-300 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-200 leading-relaxed">
                  Copy your secret now — it won't be shown again. If you lose
                  it, revoke this key and create a new one.
                </p>
              </div>

              <Field
                label="Key ID"
                value={created.key.keyId}
                copied={copiedKey}
                onCopy={() => void copy(created.key.keyId, setCopiedKey)}
              />

              <Field
                label="Secret"
                value={created.secret}
                copied={copiedSecret}
                onCopy={() => void copy(created.secret, setCopiedSecret)}
                highlight
              />
            </div>

            <div className="p-4 pt-0">
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-accent-blue text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-all shadow-md shadow-accent-blue/20"
              >
                I've saved the secret
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

RevealSecretModal.displayName = 'RevealSecretModal';

// ─── Field ──────────────────────────────────────────────────────────────────

interface FieldProps {
  label:    string;
  value:    string;
  copied:   boolean;
  onCopy:   () => void;
  highlight?: boolean;
}

const Field: React.FC<FieldProps> = ({ label, value, copied, onCopy, highlight }) => (
  <div>
    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 block mb-1">
      {label}
    </label>
    <div className={`flex items-center gap-2 p-3 rounded-xl border ${
      highlight
        ? 'bg-emerald-500/[0.05] border-emerald-500/20'
        : 'bg-white/[0.04] border-white/[0.08]'
    }`}>
      <code className={`flex-1 font-mono text-[11px] break-all ${
        highlight ? 'text-emerald-200' : 'text-gray-300'
      }`}>
        {value}
      </code>
      <button
        onClick={onCopy}
        className="flex-shrink-0 p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-300 hover:text-white"
        aria-label={`Copy ${label}`}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </div>
  </div>
);
