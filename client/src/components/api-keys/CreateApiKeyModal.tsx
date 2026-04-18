import React, { memo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Key, X } from 'lucide-react';
import type { ApiKeyCategory } from '../../services/api/apiKeys.api.js';
import { CATEGORY_LABELS } from './utils/maskKeyId.js';

interface CreateApiKeyModalProps {
  open:     boolean;
  onClose:  () => void;
  onCreate: (body: { name: string; category: ApiKeyCategory }) => Promise<void>;
}

const CATEGORIES: ApiKeyCategory[] = ['chat'];

/**
 * Create form. On successful create, the parent hook exposes the freshly
 * minted secret via `lastCreated`; this modal hands off and the parent
 * renders the `RevealSecretModal` immediately after.
 */
export const CreateApiKeyModal = memo(({ open, onClose, onCreate }: CreateApiKeyModalProps) => {
  const [name,      setName]      = useState('');
  const [category,  setCategory]  = useState<ApiKeyCategory>('chat');
  const [submitting, setSubmitting] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // Reset on open
  React.useEffect(() => {
    if (!open) return;
    setName('');
    setCategory("chat");
    setError(null);
  }, [open]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give the key a short descriptive name.');
      return;
    }
    if (trimmed.length > 80) {
      setError('Key name must be 80 characters or fewer.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onCreate({ name: trimmed, category });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create key');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#0c0c0c] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Key size={14} className="text-accent-blue" />
                New API Key
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 block mb-1">
                  Name
                </label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Slack notifier"
                  className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[11px] text-white placeholder:text-white/20 outline-none focus:border-white/[0.15] transition-colors"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 block mb-1">
                  Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] border transition-all ${
                        category === c
                          ? 'bg-accent-blue/15 border-accent-blue/30 text-accent-blue'
                          : 'bg-white/[0.04] border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {CATEGORY_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-[10px] font-bold text-rose-300">{error}</p>}
            </div>

            <div className="p-4 pt-0 flex items-center gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-white/[0.04] text-white/60 border border-white/[0.06] rounded-xl font-bold text-[10px] uppercase tracking-widest hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="flex-[1.5] py-2.5 bg-accent-blue text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-all shadow-md shadow-accent-blue/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {submitting ? 'Creating…' : 'Create Key'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

CreateApiKeyModal.displayName = 'CreateApiKeyModal';
