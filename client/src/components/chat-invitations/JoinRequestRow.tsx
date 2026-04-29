import { memo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { ChatAvatar } from '../chat/ui/ChatAvatar.js';
import type { JoinRequestWithUser } from '../../services/api/chat.api.js';

interface JoinRequestRowProps {
  request:  JoinRequestWithUser;
  onApprove: (requestId: string) => Promise<void>;
  onReject:  (requestId: string) => Promise<void>;
}

/** Single pending-request row with approve / reject actions. */
export const JoinRequestRow = memo(({ request, onApprove, onReject }: JoinRequestRowProps) => {
  const [busy, setBusy] = useState<null | 'approve' | 'reject'>(null);

  const act = async (which: 'approve' | 'reject') => {
    if (busy) return;
    setBusy(which);
    try {
      if (which === 'approve') await onApprove(request._id);
      else                     await onReject(request._id);
    } finally {
      setBusy(null);
    }
  };

  return (
    <li className="flex items-start gap-5 px-8 py-6 hover:bg-white/[0.015] transition-colors">
      <ChatAvatar participant={request.user} size="md" />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-[13px] font-black tracking-tight text-white truncate">{request.user.name}</p>
        <p className="text-[11px] font-bold text-gray-500 truncate">@{request.user.username}</p>
        {request.message && (
          <p className="text-[11px] font-medium text-gray-400 mt-2 line-clamp-3 italic">
            “{request.message}”
          </p>
        )}
      </div>
      {request.status === 'pending' ? (
        <div className="flex items-center gap-2">
          <button
            onClick={() => void act('approve')}
            disabled={busy !== null}
            className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-emerald-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check size={11} />
            {busy === 'approve' ? 'Approving…' : 'Approve'}
          </button>
          <button
            onClick={() => void act('reject')}
            disabled={busy !== null}
            className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-rose-500/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X size={11} />
            {busy === 'reject' ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      ) : (
        <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] ${
          request.status === 'approved'
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
            : 'bg-gray-500/10 border border-gray-500/20 text-gray-400'
        }`}>
          {request.status}
        </span>
      )}
    </li>
  );
});

JoinRequestRow.displayName = 'JoinRequestRow';
