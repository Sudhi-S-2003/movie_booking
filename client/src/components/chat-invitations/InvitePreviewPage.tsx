import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LogIn, ShieldOff, UserPlus } from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useAuthStore } from '../../store/authStore.js';
import { chatApi } from '../../services/api/chat.api.js';
import { ApiError } from '../../services/api/http.js';
import { PublicChatCard } from '../chat-public/PublicChatCard.js';
import { getConversationPath } from '../chat-public/utils/resolveChatPath.js';
import { useInvitePreview } from './hooks/useInvitePreview.js';
import { formatExpiry, formatUses } from './utils/formatExpiry.js';

/**
 * `/chat/invite/:token`
 *
 * Invite link landing page. Shows the conversation preview + an Accept CTA
 * (or Sign-In CTA if anonymous). Members get redirected straight into the
 * chat.
 */
export const InvitePreviewPage = () => {
  useDocumentTitle('Chat Invite — CinemaConnect');

  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data, loading, status, error, refetch } = useInvitePreview(token);

  const [accepting,   setAccepting]   = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // If the viewer is already a member, just take them to the chat.
  useEffect(() => {
    if (!data?.membership.isMember) return;
    navigate(
      getConversationPath(user?.role, data.conversation._id),
      { replace: true },
    );
  }, [data, navigate, user?.role]);

  const handleAccept = useCallback(async () => {
    if (accepting) return;
    setAccepting(true);
    setAcceptError(null);
    try {
      const res = await chatApi.acceptInvite(token);
      navigate(getConversationPath(user?.role, res.conversationId), { replace: true });
    } catch (e: unknown) {
      if (e instanceof ApiError) setAcceptError(e.message);
      else setAcceptError(e instanceof Error ? e.message : 'Failed to accept invite');
      // Refresh preview — the invite may have just expired.
      await refetch();
    } finally {
      setAccepting(false);
    }
  }, [accepting, navigate, refetch, token, user?.role]);

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
        <div className="max-w-sm w-full bg-white/[0.02] border border-rose-500/20 rounded-3xl p-10 text-center space-y-3">
          <ShieldOff size={32} className="mx-auto text-rose-400/70" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-300">
            Error {status ?? 500}
          </p>
          <p className="text-[11px] text-gray-400">{error ?? 'Invite unavailable'}</p>
        </div>
      </div>
    );
  }

  // The preview endpoint only returns group conversations, so this shape
  // lines up with what PublicChatCard expects.
  const conversation = {
    _id:              data.conversation._id,
    type:             data.conversation.type,
    title:            data.conversation.title,
    avatarUrl:        data.conversation.avatarUrl,
    publicName:       data.conversation.publicName ?? '',
    participantCount: data.conversation.participantCount,
    createdAt:        '',
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <PublicChatCard conversation={conversation}>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
            <span>Expires</span>
            <span className="text-gray-300">{formatExpiry(data.invite.expiresAt)}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
            <span>Uses</span>
            <span className="text-gray-300">{formatUses(data.invite.usesCount, data.invite.maxUses)}</span>
          </div>

          {acceptError && (
            <p className="text-[10px] font-bold text-rose-300">{acceptError}</p>
          )}

          {!data.membership.authenticated ? (
            <button
              onClick={() => {
                const next = encodeURIComponent(`/chat/invite/${token}`);
                navigate(`/login?next=${next}`);
              }}
              className="w-full py-3 bg-accent-blue text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.01] transition-all shadow-lg shadow-accent-blue/20"
            >
              <LogIn size={13} /> Sign in to accept
            </button>
          ) : (
            <button
              onClick={() => void handleAccept()}
              disabled={accepting}
              className="w-full py-3 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.01] transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <UserPlus size={13} />
              {accepting ? 'Joining…' : 'Accept Invite'}
            </button>
          )}
        </div>
      </PublicChatCard>
    </div>
  );
};
