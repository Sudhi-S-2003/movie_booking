import React, { memo, useState } from 'react';
import { Check, Copy, ShieldOff, Trash2 } from 'lucide-react';
import type { ApiKeyRecord } from '../../services/api/apiKeys.api.js';
import { CATEGORY_LABELS, formatLastUsed, maskKeyId } from './utils/maskKeyId.js';

interface ApiKeyRowProps {
  apiKey:    ApiKeyRecord;
  onRevoke: (id: string) => Promise<void>;
}

/** Single row in the keys list. Copy keyId + revoke. */
export const ApiKeyRow = memo(({ apiKey, onRevoke }: ApiKeyRowProps) => {
  const [copied,   setCopied]   = useState(false);
  const [revoking, setRevoking] = useState(false);

  const isRevoked = apiKey.revokedAt !== null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey.keyId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const handleRevoke = async () => {
    if (revoking) return;
    if (!window.confirm(`Revoke "${apiKey.name}"? Any clients using this key will stop working immediately.`)) return;
    setRevoking(true);
    try {
      await onRevoke(apiKey._id);
    } finally {
      setRevoking(false);
    }
  };

  return (
    <li className={`flex items-center gap-4 px-8 py-5 hover:bg-white/[0.015] transition-colors ${
      isRevoked ? 'opacity-50' : ''
    }`}>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-black text-white truncate">{apiKey.name}</span>
          <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
            {CATEGORY_LABELS[apiKey.category] ?? apiKey.category}
          </span>
          {isRevoked && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[9px] font-black uppercase tracking-[0.2em] text-rose-300 flex items-center gap-1">
              <ShieldOff size={9} /> Revoked
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap text-[10px] text-gray-500">
          <code className="font-mono text-gray-400">{maskKeyId(apiKey.keyId)}</code>
          <span>·</span>
          <span>{formatLastUsed(apiKey.lastUsedAt)}</span>
        </div>
      </div>

      <button
        onClick={() => void handleCopy()}
        className="p-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-gray-300 hover:text-white hover:bg-white/[0.08] transition-all"
        title="Copy key ID"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>

      {!isRevoked && (
        <button
          onClick={() => void handleRevoke()}
          disabled={revoking}
          className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 hover:bg-rose-500/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          title="Revoke key"
        >
          <Trash2 size={13} />
        </button>
      )}
    </li>
  );
});

ApiKeyRow.displayName = 'ApiKeyRow';
