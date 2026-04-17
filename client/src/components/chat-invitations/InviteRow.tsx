import React, { memo, useState } from 'react';
import { Copy, Check, X } from 'lucide-react';
import type { ChatInvite } from '../../services/api/chat.api.js';
import { buildInviteUrl } from './utils/inviteUrl.js';
import { formatExpiry, formatUses } from './utils/formatExpiry.js';

interface InviteRowProps {
  invite:  ChatInvite;
  onRevoke: (id: string) => Promise<void>;
}

/** Single invite link row — copy URL + revoke. */
export const InviteRow = memo(({ invite, onRevoke }: InviteRowProps) => {
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const url = buildInviteUrl(invite.token);

  const expiresAt = invite.expiresAt ? new Date(invite.expiresAt).getTime() : null;
  const isExpired = expiresAt !== null && expiresAt <= Date.now();
  const isExhausted = invite.maxUses !== null && invite.usesCount >= invite.maxUses;
  const isLive = !invite.revoked && !isExpired && !isExhausted;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const handleRevoke = async () => {
    if (revoking) return;
    if (!window.confirm('Revoke this invite link?')) return;
    setRevoking(true);
    try {
      await onRevoke(invite._id);
    } finally {
      setRevoking(false);
    }
  };

  return (
    <li className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.015] transition-colors">
      <div className="flex-1 min-w-0 space-y-1">
        <code className="block text-[10px] font-mono text-gray-300 truncate">{url}</code>
        <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em]">
          <StatusBadge revoked={invite.revoked} expired={isExpired} exhausted={isExhausted} />
          <span className="text-gray-600">{formatUses(invite.usesCount, invite.maxUses)}</span>
          <span className="text-gray-600">expires {formatExpiry(invite.expiresAt)}</span>
        </div>
      </div>
      <button
        onClick={() => void handleCopy()}
        disabled={!isLive}
        className="p-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-gray-300 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        title="Copy invite URL"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
      {!invite.revoked && (
        <button
          onClick={() => void handleRevoke()}
          disabled={revoking}
          className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 hover:bg-rose-500/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          title="Revoke invite"
        >
          <X size={13} />
        </button>
      )}
    </li>
  );
});

InviteRow.displayName = 'InviteRow';

const StatusBadge: React.FC<{ revoked: boolean; expired: boolean; exhausted: boolean }> = ({
  revoked, expired, exhausted,
}) => {
  if (revoked)   return <span className="text-rose-300/80">Revoked</span>;
  if (expired)   return <span className="text-gray-500">Expired</span>;
  if (exhausted) return <span className="text-amber-300/80">Exhausted</span>;
  return <span className="text-emerald-300/80">Active</span>;
};
