import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LogIn, ShieldOff } from 'lucide-react';
import { SEO } from '../../components/common/SEO.js';
import { useAuthStore } from '../../store/authStore.js';
import { usePublicChat } from './hooks/usePublicChat.js';
import { PublicChatCard } from './PublicChatCard.js';
import { JoinRequestPanel } from './JoinRequestPanel.js';
import { getConversationPath } from './utils/resolveChatPath.js';
import { SITE_CONFIG } from '../../config/site.config.js';

/**
 * `/chat/g/:publicName`
 *
 * Social resolver for shareable group links. Dispatches to one of four UI
 * states depending on `membership`:
 *
 *   1. Member                    → redirect into the role-scoped chat URL
 *   2. Anonymous (not logged in) → show sign-in CTA (server already gated on group-only)
 *   3. Group + authed non-member → JoinRequestPanel
 *   4. Non-group / forbidden     → server returns 403, we render a "not viewable" card
 */
export const PublicChatPage = () => {

  const { publicName = '' } = useParams<{ publicName: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data, loading, status, error } = usePublicChat(publicName);

  // Auto-redirect members into the chat.
  useEffect(() => {
    if (!data?.membership.isMember) return;
    navigate(
      getConversationPath(user?.role, data.conversation._id),
      { replace: true },
    );
  }, [data, navigate, user?.role]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-10 h-10 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <ErrorCard
          status={status ?? 500}
          message={error ?? 'Something went wrong'}
        />
      </div>
    );
  }

  const { conversation, membership, pendingRequest } = data;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <SEO 
        title={conversation?.title ? `Join ${conversation.title}` : 'Join Chat'} 
        description={`Request to join ${conversation?.title || 'this chat group'} on ${SITE_CONFIG.name}.`} 
      />
      <PublicChatCard conversation={conversation}>
        {!membership.authenticated ? (
          <AnonymousCta publicName={publicName} onLogin={() => {
            const next = encodeURIComponent(`/chat/g/${publicName}`);
            navigate(`/login?next=${next}`);
          }} />
        ) : membership.canRequestToJoin ? (
          <JoinRequestPanel
            conversationId={conversation._id}
            initiallyPending={pendingRequest}
          />
        ) : (
          <NotViewableCta />
        )}
      </PublicChatCard>
    </div>
  );
};

// ─── Branch presentations ────────────────────────────────────────────────────

const AnonymousCta: React.FC<{ publicName: string; onLogin: () => void }> = ({ onLogin }) => (
  <div className="space-y-4 text-center">
    <p className="text-[11px] text-gray-400">
      Sign in to request to join this group.
    </p>
    <button
      onClick={onLogin}
      className="w-full py-3 bg-accent-blue text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.01] transition-all shadow-lg shadow-accent-blue/20"
    >
      <LogIn size={13} /> Sign in to continue
    </button>
  </div>
);

const NotViewableCta: React.FC = () => (
  <div className="flex flex-col items-center gap-3 text-center py-2">
    <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-300">
      <ShieldOff size={18} />
    </div>
    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-rose-300">
      Not Viewable
    </p>
    <p className="text-[11px] text-gray-500 max-w-xs">
      This conversation isn't open for new members.
    </p>
  </div>
);

const ErrorCard: React.FC<{ status: number; message: string }> = ({ status, message }) => (
  <div className="max-w-sm w-full bg-white/[0.02] border border-rose-500/20 rounded-3xl p-10 text-center space-y-3">
    <ShieldOff size={32} className="mx-auto text-rose-400/70" />
    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-300">
      Error {status}
    </p>
    <p className="text-[11px] text-gray-400">{message}</p>
  </div>
);
