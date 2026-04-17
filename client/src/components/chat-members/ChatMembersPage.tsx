import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Inbox, Settings, UserPlus, Users, X } from 'lucide-react';
import { chatApi } from '../../services/api/chat.api.js';
import type { ConversationMember } from '../../services/api/chat.api.js';
import { useAuthStore } from '../../store/authStore.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { DashboardPage } from '../dashboard/DashboardPage.js';
import { useChatMembers } from './hooks/useChatMembers.js';
import { MemberRow } from './MemberRow.js';
import { MembersSkeleton } from './MembersSkeleton.js';
import { MembersEmpty } from './MembersEmpty.js';
import { MembersPagination } from './MembersPagination.js';
import { AddMembersModal } from './AddMembersModal.js';
import { ManageInvitesPanel } from '../chat-invitations/ManageInvitesPanel.js';
import { PublicNameForm }     from '../chat-invitations/PublicNameForm.js';

const PAGE_LIMIT = 15;

/**
 * `/{role}/chat/:conversationId/members`
 *
 * Roster page for a group conversation with add/remove management.
 * State is split into focused hooks and child components; this page
 * orchestrates navigation, permissions, and member mutations.
 */
export const ChatMembersPage = () => {
  useDocumentTitle('Group Members — CinemaConnect');
  const { conversationId = '' } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const {
    members,
    conversation,
    pagination,
    page,
    loading,
    error,
    goToPage,
    reload,
  } = useChatMembers(conversationId, PAGE_LIMIT);

  const [actionError,  setActionError]  = useState<string | null>(null);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [addOpen,      setAddOpen]      = useState(false);
  const [manageOpen,   setManageOpen]   = useState(false);

  const backPath = useMemo(() => {
    const role = (user?.role ?? 'user').toString().toLowerCase();
    const prefix = role === 'admin'
      ? '/admin'
      : role === 'theatre_owner'
        ? '/owner'
        : '/user';
    return `${prefix}/chat/${conversationId}`;
  }, [user, conversationId]);

  const currentUserId = user?.id ?? null;
  const isOwnerMe = !!(conversation && currentUserId && conversation.createdBy === currentUserId);
  const isGroup   = conversation?.type === 'group';
  const canManage = isOwnerMe && isGroup;

  const handleRemove = useCallback(async (member: ConversationMember) => {
    if (!conversationId || busyMemberId) return;

    const confirmMsg = member.isYou
      ? 'Leave this group? You will no longer receive messages from this conversation.'
      : `Remove ${member.name} from the group?`;
    if (!window.confirm(confirmMsg)) return;

    setBusyMemberId(member._id);
    setActionError(null);
    try {
      await chatApi.removeParticipant(conversationId, member._id);
      if (member.isYou) {
        navigate(backPath);
        return;
      }
      // Step back a page if the current one just emptied out.
      const shouldStepBack = members.length === 1 && page > 1;
      await reload(shouldStepBack ? page - 1 : page);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Failed to remove member');
    } finally {
      setBusyMemberId(null);
    }
  }, [conversationId, busyMemberId, navigate, backPath, members.length, page, reload]);

  const handleAdded = useCallback(async () => {
    setAddOpen(false);
    await reload(1);
  }, [reload]);

  return (
    <>
      <DashboardPage
        title="Group"
        accent="Members"
        accentColor="text-emerald-400"
        subtitle={conversation?.title ? `Roster — ${conversation.title}` : 'Conversation Roster'}
        headerActions={
          <div className="flex flex-wrap gap-3">
            {canManage && (
              <>
                <button
                  onClick={() => setAddOpen(true)}
                  className="px-6 py-3 bg-accent-blue/10 border border-accent-blue/30 text-accent-blue rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-accent-blue/15 transition-all"
                >
                  <UserPlus size={14} /> Add Members
                </button>
                <button
                  onClick={() => navigate(`${backPath.replace(/\/chat\/[^/]+$/, '')}/chat/${conversationId}/join-requests`)}
                  className="px-6 py-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-amber-500/15 transition-all"
                >
                  <Inbox size={14} /> Join Requests
                </button>
                <button
                  onClick={() => setManageOpen((v) => !v)}
                  className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-white/10 transition-all"
                >
                  <Settings size={14} /> {manageOpen ? 'Hide Settings' : 'Group Settings'}
                </button>
              </>
            )}
            <button
              onClick={() => navigate(backPath)}
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-white/10 transition-all"
            >
              <ArrowLeft size={14} /> Back to Chat
            </button>
          </div>
        }
      >
        {error ? (
          <div className="p-10 rounded-3xl border border-rose-500/20 bg-rose-500/5 text-rose-200 text-xs font-bold">
            {error}
          </div>
        ) : (<>
          {canManage && manageOpen && (
            <div className="mb-6 bg-white/[0.02] border border-white/5 rounded-[40px] shadow-2xl backdrop-blur-3xl p-8 space-y-8">
              <PublicNameForm
                conversationId={conversationId}
                initialValue={conversation?.publicName ?? null}
              />
              <div className="h-px bg-white/[0.05]" />
              <ManageInvitesPanel conversationId={conversationId} />
            </div>
          )}
          <div className="bg-white/[0.02] border border-white/5 rounded-[40px] shadow-2xl backdrop-blur-3xl overflow-hidden">
            <div className="flex items-center justify-between px-10 py-7 border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Users size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Total Members</p>
                  <p className="text-2xl font-black tracking-tight text-white">{pagination.total}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Page</p>
                <p className="text-2xl font-black tracking-tight text-white">
                  {pagination.page}
                  <span className="text-gray-700 font-black"> / {pagination.totalPages}</span>
                </p>
              </div>
            </div>

            {actionError && (
              <div className="px-10 py-4 border-b border-rose-500/20 bg-rose-500/5 flex items-center justify-between">
                <p className="text-[11px] font-bold text-rose-200">{actionError}</p>
                <button
                  onClick={() => setActionError(null)}
                  className="text-rose-300/60 hover:text-rose-200"
                  aria-label="Dismiss error"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {loading ? (
              <MembersSkeleton rows={PAGE_LIMIT} />
            ) : members.length === 0 ? (
              <MembersEmpty />
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {members.map((m) => (
                  <MemberRow
                    key={m._id}
                    member={m}
                    canManage={canManage}
                    isGroup={isGroup}
                    isBusy={busyMemberId === m._id}
                    onRemove={handleRemove}
                  />
                ))}
              </ul>
            )}

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between gap-4 px-10 py-6 border-t border-white/5 flex-wrap">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
                  Showing {members.length} of {pagination.total}
                </p>
                <MembersPagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  disabled={loading}
                  onChange={goToPage}
                  size="lg"
                />
              </div>
            )}
          </div>
        </>)}
      </DashboardPage>

      <AddMembersModal
        open={addOpen && canManage}
        conversationId={conversationId}
        onClose={() => setAddOpen(false)}
        onAdded={handleAdded}
      />
    </>
  );
};
