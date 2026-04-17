import React, { memo, useState } from 'react';
import { Link2, Plus } from 'lucide-react';
import { MembersPagination } from '../chat-members/MembersPagination.js';
import { InviteRow } from './InviteRow.js';
import { useConversationInvites } from './hooks/useConversationInvites.js';

interface ManageInvitesPanelProps {
  conversationId: string;
}

const EXPIRY_PRESETS: Array<{ label: string; ms: number | null }> = [
  { label: 'never',   ms: null },
  { label: '1 hour',  ms: 60 * 60 * 1000 },
  { label: '1 day',   ms: 24 * 60 * 60 * 1000 },
  { label: '7 days',  ms: 7 * 24 * 60 * 60 * 1000 },
  { label: '30 days', ms: 30 * 24 * 60 * 60 * 1000 },
];

/**
 * Collapsible panel for the chat owner to create/revoke invite links.
 * Embedded in the members page; lazy-initializes the hook only when
 * the panel is opened so listing invites isn't part of the critical
 * path for non-managing visitors.
 */
export const ManageInvitesPanel = memo(({ conversationId }: ManageInvitesPanelProps) => {
  const [expiryMs, setExpiryMs] = useState<number | null>(7 * 24 * 60 * 60 * 1000);
  const [maxUses,  setMaxUses]  = useState<string>('');
  const [creating, setCreating] = useState(false);

  const invites = useConversationInvites(conversationId);

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const parsedMax = maxUses.trim() ? Number(maxUses) : NaN;
      await invites.create({
        ...(expiryMs !== null && { expiresInMs: expiryMs }),
        ...(Number.isFinite(parsedMax) && parsedMax > 0 && { maxUses: Math.floor(parsedMax) }),
      });
      setMaxUses('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
        <Link2 size={12} /> Invite Links
      </div>

      {/* Creator form */}
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">Expires</label>
          <div className="flex flex-wrap gap-1.5">
            {EXPIRY_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setExpiryMs(p.ms)}
                className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${
                  expiryMs === p.ms
                    ? 'bg-accent-blue/15 border-accent-blue/30 text-accent-blue'
                    : 'bg-white/[0.04] border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">Max uses</label>
          <input
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="unlimited"
            inputMode="numeric"
            className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[11px] text-white placeholder:text-white/20 outline-none focus:border-white/[0.15] transition-colors"
          />
        </div>

        <button
          onClick={() => void handleCreate()}
          disabled={creating}
          className="self-end px-4 py-2 bg-accent-blue text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-[1.02] transition-all shadow-md shadow-accent-blue/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <Plus size={12} /> {creating ? 'Creating…' : 'Create Link'}
        </button>
      </div>

      {invites.error && (
        <p className="text-[10px] font-bold text-rose-300">{invites.error}</p>
      )}

      {/* List */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-white/[0.01]">
        {invites.loading && invites.invites.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin mx-auto" />
          </div>
        ) : invites.invites.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-700">
              No invite links yet
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {invites.invites.map((inv) => (
              <InviteRow key={inv._id} invite={inv} onRevoke={invites.revoke} />
            ))}
          </ul>
        )}

        {invites.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 px-6 py-3 border-t border-white/[0.04] flex-wrap">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">
              {invites.pagination.total} total
            </p>
            <MembersPagination
              page={invites.pagination.page}
              totalPages={invites.pagination.totalPages}
              disabled={invites.loading}
              onChange={invites.goToPage}
              size="sm"
            />
          </div>
        )}
      </div>
    </div>
  );
});

ManageInvitesPanel.displayName = 'ManageInvitesPanel';
