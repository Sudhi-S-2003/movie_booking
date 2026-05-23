import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users, Search, Trash2, UserPlus, ArrowLeft, Shield,
  ChevronLeft, ChevronRight, Info, X, Loader2
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { teamsApi, type Team, type TeamMember } from '../../services/api/teams.api.js';
import { chatApi } from '../../services/api/chat.api.js';
import { toast } from '../../utils/toast.js';
import type { SearchedUser } from '../chat/types.js';

export const TeamManagementPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userId = user?.id || (user as any)?._id;

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersPage, setMembersPage] = useState(1);
  const [membersTotalPages, setMembersTotalPages] = useState(1);

  // Add member modal states
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<SearchedUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Compute prefix for navigation
  const prefix = useMemo(() => {
    const role = (user?.role ?? 'user').toString().toLowerCase();
    return role === 'admin'
      ? '/admin'
      : role === 'theatre_owner'
        ? '/owner'
        : '/user';
  }, [user]);

  // Load team info by searching getMyTeams
  const fetchTeamDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await teamsApi.getMyTeams();
      if (res.teams) {
        const found = [...res.teams.owned, ...res.teams.joined].find((t) => t._id === id);
        if (found) {
          setTeam(found);
        } else {
          toast.error('Team not found or access denied');
          navigate(`${prefix}/teams`);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch team details');
      navigate(`${prefix}/teams`);
    } finally {
      setLoading(false);
    }
  }, [id, prefix, navigate]);

  useEffect(() => {
    fetchTeamDetails();
  }, [fetchTeamDetails]);

  // Fetch members
  const fetchMembers = useCallback(async (page = 1) => {
    if (!id) return;
    try {
      setMembersLoading(true);
      const res = await teamsApi.getTeamMembers(id, page);
      if (res.members) {
        setMembers(res.members);
        const pag = res.pagination;
        if (pag) {
          setMembersPage(pag.page);
          setMembersTotalPages(pag.pages);
        } else {
          setMembersPage(1);
          setMembersTotalPages(1);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch team members');
    } finally {
      setMembersLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (team) {
      fetchMembers(1);
    }
  }, [team, fetchMembers]);

  // Handle User Search (for adding member)
  useEffect(() => {
    if (!userQuery.trim()) {
      setSearchedUsers([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const res = await chatApi.searchUsers(userQuery);
        if (res.users) {
          setSearchedUsers(res.users);
        }
      } catch (err) {
        console.error('Failed to search users:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [userQuery]);

  // Handle Add Member
  const handleAddMember = async (targetUserId: string) => {
    if (!team) return;

    try {
      const res = await teamsApi.addTeamMember(team._id, targetUserId);
      if (res.member) {
        toast.success('Member added successfully');
        setShowAddMemberModal(false);
        setUserQuery('');
        setSearchedUsers([]);
        fetchMembers(membersPage);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    }
  };

  // Handle Remove Member
  const handleRemoveMember = async (memberUserId: string, memberName: string) => {
    if (!team) return;
    const isSelf = memberUserId === userId;

    if (!window.confirm(isSelf ? 'Are you sure you want to leave this team?' : `Are you sure you want to remove ${memberName}?`)) {
      return;
    }

    try {
      const res = await teamsApi.removeTeamMember(team._id, memberUserId);
      if (res.member) {
        toast.success(isSelf ? 'You left the team' : `${memberName} removed`);
        if (isSelf) {
          navigate(`${prefix}/teams`);
        } else {
          fetchMembers(membersPage);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#09090b] text-white min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-accent-pink" size={32} />
          <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Loading details...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#09090b] text-white p-6">
        <div className="text-center">
          <Info size={32} className="text-white/20 mx-auto mb-3" />
          <p className="text-xs font-bold text-white/60">Team not found</p>
        </div>
      </div>
    );
  }

  const isOwner = team.ownerId === userId;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#09090b] text-white p-4 sm:p-6 overflow-y-auto">
      {/* Detail Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`${prefix}/teams`)}
            className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              {team.name}
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-black ${
                team.type === 'agent'
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}>
                {team.type}
              </span>
            </h2>
            <p className="text-xs text-white/40 mt-1">
              Identifier: <span className="font-mono text-purple-300">@{team.publicName}</span>
            </p>
          </div>
        </div>

        {isOwner && (
          <button
            onClick={() => setShowAddMemberModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-pink to-accent-purple hover:opacity-90 active:scale-95 transition-all text-xs font-black uppercase tracking-wider rounded-xl shadow-lg"
          >
            <UserPlus size={14} />
            Add Member
          </button>
        )}
      </div>

      {/* Member list section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-white/50">Members</h3>
          <span className="text-xs text-white/30">{members.length} Active</span>
        </div>

        {membersLoading && members.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12 text-white/40 text-xs">
            Loading members...
          </div>
        ) : members.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center border border-dashed border-white/[0.06] rounded-2xl bg-white/[0.01]">
            <Users size={32} className="text-white/20 mb-3" />
            <p className="text-xs font-bold text-white/50">No members found</p>
            <p className="text-[10px] text-white/30 mt-1">This team doesn't have any active members yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => {
              const isMemOwner = team.ownerId === member.memberId;
              const isSelf = member.memberId === userId;
              return (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-white/[0.08] to-white/[0.02] border border-white/[0.06] flex items-center justify-center text-sm font-bold text-white/70">
                      {member.user?.name ? member.user.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        {member.user?.name || 'Unknown User'}
                        {isSelf && (
                          <span className="text-[9px] bg-white/10 text-white/80 px-1 py-0.5 rounded uppercase tracking-wider font-bold">
                            You
                          </span>
                        )}
                        {isMemOwner && (
                          <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-black flex items-center gap-0.5">
                            <Shield size={8} /> Owner
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-white/40 mt-0.5">
                        @{member.user?.username || 'unknown'} • Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {(!isMemOwner) && (isOwner || isSelf) && (
                    <button
                      onClick={() => handleRemoveMember(member.memberId, member.user?.name || '')}
                      title={isSelf ? 'Leave Team' : 'Remove Member'}
                      className="p-2 rounded-lg text-rose-400/50 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Members Pagination */}
        {membersTotalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-white/[0.06]">
            <button
              disabled={membersPage <= 1}
              onClick={() => fetchMembers(membersPage - 1)}
              className="p-1.5 rounded bg-white/[0.04] text-white/60 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-white/60">
              Page {membersPage} of {membersTotalPages}
            </span>
            <button
              disabled={membersPage >= membersTotalPages}
              onClick={() => fetchMembers(membersPage + 1)}
              className="p-1.5 rounded bg-white/[0.04] text-white/60 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#0b0b0e] border border-white/[0.1] shadow-2xl p-5 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-white/90">Add Team Member</h3>
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setUserQuery('');
                  setSearchedUsers([]);
                }}
                className="p-1.5 rounded hover:bg-white/[0.06] text-white/40 hover:text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search input */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search users by name or username..."
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-purple-500/50 text-white placeholder-white/20 outline-none transition-all"
              />
              <Search size={14} className="absolute left-3 top-3 text-white/30" />
            </div>

            {/* Search list */}
            <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[350px] space-y-2 pr-1">
              {searchLoading ? (
                <div className="text-center py-8 text-white/40 text-xs">Searching users...</div>
              ) : userQuery && searchedUsers.length === 0 ? (
                <div className="text-center py-8 text-white/30 text-xs">No users found matching "{userQuery}"</div>
              ) : !userQuery ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-white/30">
                  <Info size={20} className="mb-2 text-white/10" />
                  <p className="text-[10px] font-bold">Type to search for users</p>
                </div>
              ) : (
                searchedUsers.map((u) => {
                  const alreadyMember = members.some((m) => m.memberId === u._id);
                  return (
                    <div
                      key={u._id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.04] transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-white/[0.08] flex items-center justify-center text-xs font-bold text-white/60">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{u.name}</p>
                          <p className="text-[9px] text-white/40 truncate">@{u.username}</p>
                        </div>
                      </div>

                      {alreadyMember ? (
                        <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider px-2 py-1 bg-emerald-500/10 rounded">
                          Member
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddMember(u._id)}
                          className="px-2.5 py-1 bg-purple-500/20 text-purple-300 hover:bg-purple-500 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
