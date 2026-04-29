import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Crown, LogOut, UserMinus } from 'lucide-react';
import { ChatAvatar } from '../chat/ui/ChatAvatar.js';
import { formatJoinDate } from './utils/formatJoinDate.js';
import type { ConversationMember } from '../../services/api/chat.api.js';

interface MemberRowProps {
  member:           ConversationMember;
  /** The current caller is the group owner. */
  canManage:        boolean;
  /** The conversation is a group (non-group rows never show remove/leave). */
  isGroup:          boolean;
  /** This row is currently being acted on — disable its controls. */
  isBusy:           boolean;
  onRemove:         (member: ConversationMember) => void;
}

/**
 * Single member row. Renders identity chips, bio, join date, and a
 * context-appropriate action:
 *   • Owner sees "Remove" on every non-owner, non-self row.
 *   • Any non-owner member sees "Leave" on their own row.
 *   • Owner row has no action (ownership transfer is out of scope).
 */
export const MemberRow = memo(({
  member,
  canManage,
  isGroup,
  isBusy,
  onRemove,
}: MemberRowProps) => {
  const canRemoveOther = canManage && !member.isCreator && !member.isYou;
  const canLeave       = isGroup && member.isYou && !member.isCreator;
  const showAction     = canRemoveOther || canLeave;

  return (
    <li className="flex items-center gap-5 px-10 py-6 hover:bg-white/[0.015] transition-colors">
      <ChatAvatar participant={member} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            to={`/user/${member.username}`}
            className="text-[13px] font-black tracking-tight text-white hover:text-accent-blue transition-colors truncate"
          >
            {member.name}
          </Link>
          {member.isYou && (
            <span className="px-2.5 py-1 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-[9px] font-black uppercase tracking-[0.2em]">
              You
            </span>
          )}
          {member.isCreator && (
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5">
              <Crown size={10} /> Owner
            </span>
          )}
        </div>
        <p className="text-[11px] font-bold text-gray-500 truncate">@{member.username}</p>
        {member.bio && (
          <p className="text-[11px] font-medium text-gray-600 truncate mt-1">{member.bio}</p>
        )}
      </div>

      <div className="text-right hidden md:block">
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-600">Joined</p>
        <p className="text-[11px] font-black text-gray-400 tabular-nums">
          {formatJoinDate(member.joinedAt)}
        </p>
      </div>

      {showAction && (
        <button
          onClick={() => onRemove(member)}
          disabled={isBusy}
          className={`ml-2 px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            canLeave
              ? 'bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08] hover:text-white'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300 hover:bg-rose-500/15 hover:text-rose-200'
          }`}
          title={canLeave ? 'Leave this group' : 'Remove from group'}
        >
          {canLeave ? <LogOut size={11} /> : <UserMinus size={11} />}
          {canLeave ? 'Leave' : 'Remove'}
        </button>
      )}
    </li>
  );
});

MemberRow.displayName = 'MemberRow';
