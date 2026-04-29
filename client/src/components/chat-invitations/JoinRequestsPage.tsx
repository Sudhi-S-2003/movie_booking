import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Inbox } from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useAuthStore } from '../../store/authStore.js';
import { DashboardPage } from '../dashboard/DashboardPage.js';
import { MembersPagination } from '../chat-members/MembersPagination.js';
import { chatApi } from '../../services/api/chat.api.js';
import { ApiError } from '../../services/api/http.js';
import { JoinRequestRow } from './JoinRequestRow.js';
import { useJoinRequests } from './hooks/useJoinRequests.js';
import { getChatPrefix } from '../chat-public/utils/resolveChatPath.js';

type Status = 'pending' | 'approved' | 'rejected';

/**
 * `/{role}/chat/:conversationId/join-requests`
 *
 * Owner-only page to review/approve/reject join requests. Guards access by
 * first fetching the conversation owner — non-owners see a 403 message.
 */
export const JoinRequestsPage = () => {
  useDocumentTitle('Join Requests — CinemaConnect');

  const { conversationId = '' } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [ownerCheck, setOwnerCheck] = useState<'loading' | 'owner' | 'forbidden'>('loading');
  const [checkError, setCheckError] = useState<string | null>(null);

  // Verify the caller owns this conversation before hitting join-requests APIs.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { conversation } = await chatApi.getConversation(conversationId);
        if (cancelled) return;
        const createdBy = (conversation as unknown as { createdBy?: string }).createdBy ?? null;
        const isOwner = !!user && !!createdBy && String(createdBy) === String(user.id);
        setOwnerCheck(isOwner ? 'owner' : 'forbidden');
      } catch (e: unknown) {
        if (cancelled) return;
        setCheckError(e instanceof ApiError ? e.message : 'Failed to load');
        setOwnerCheck('forbidden');
      }
    })();
    return () => { cancelled = true; };
  }, [conversationId, user]);

  const backPath = useMemo(
    () => `${getChatPrefix(user?.role)}/chat/${conversationId}/members`,
    [user?.role, conversationId],
  );

  const requests = useJoinRequests(conversationId);

  const handleFilter = useCallback((status: Status) => {
    requests.setStatus(status);
  }, [requests]);

  return (
    <DashboardPage
      title="Join"
      accent="Requests"
      accentColor="text-amber-400"
      subtitle="Pending roster signups"
      headerActions={
        <button
          onClick={() => navigate(backPath)}
          className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-white/10 transition-all"
        >
          <ArrowLeft size={14} /> Back to Members
        </button>
      }
    >
      {ownerCheck === 'loading' ? (
        <div className="p-20 text-center">
          <div className="w-8 h-8 border-2 border-white/10 border-t-white/40 rounded-full animate-spin mx-auto" />
        </div>
      ) : ownerCheck === 'forbidden' ? (
        <div className="p-10 rounded-3xl border border-rose-500/20 bg-rose-500/5 text-rose-200 text-xs font-bold">
          {checkError ?? 'Only the group owner can view join requests.'}
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-white/5 rounded-[40px] shadow-2xl backdrop-blur-3xl overflow-hidden">
          <div className="flex items-center justify-between px-10 py-7 border-b border-white/5 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Inbox size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">
                  Pending
                </p>
                <p className="text-2xl font-black tracking-tight text-white">
                  {requests.pendingTotal}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {(['pending', 'approved', 'rejected'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => handleFilter(s)}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border transition-all ${
                    requests.status === s
                      ? 'bg-accent-blue/15 border-accent-blue/30 text-accent-blue'
                      : 'bg-white/[0.04] border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {requests.error && (
            <div className="px-10 py-4 border-b border-rose-500/20 bg-rose-500/5 text-rose-200 text-[11px] font-bold">
              {requests.error}
            </div>
          )}

          {requests.loading ? (
            <div className="p-16 text-center">
              <div className="w-6 h-6 border-2 border-white/10 border-t-white/40 rounded-full animate-spin mx-auto" />
            </div>
          ) : requests.requests.length === 0 ? (
            <div className="p-20 text-center space-y-3">
              <Inbox size={40} className="mx-auto text-gray-800" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-700">
                No {requests.status} requests
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {requests.requests.map((r) => (
                <JoinRequestRow
                  key={r._id}
                  request={r}
                  onApprove={requests.approve}
                  onReject={requests.reject}
                />
              ))}
            </ul>
          )}

          {requests.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 px-10 py-6 border-t border-white/5 flex-wrap">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
                Showing {requests.requests.length} of {requests.pagination.total}
              </p>
              <MembersPagination
                page={requests.pagination.page}
                totalPages={requests.pagination.totalPages}
                disabled={requests.loading}
                onChange={requests.goToPage}
                size="lg"
              />
            </div>
          )}
        </div>
      )}
    </DashboardPage>
  );
};
