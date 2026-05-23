import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users, ArrowLeft, Shield, ChevronLeft, ChevronRight, Check,
  Loader2, Info, UserCheck
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { teamsApi, type Team, type TeamMember } from '../../services/api/teams.api.js';
import { chatApi } from '../../services/api/chat.api.js';
import type { Conversation } from '../chat/types.js';
import { toast } from '../../utils/toast.js';
import { SEO } from '../../components/common/SEO.js';
import { DashboardPage } from '../dashboard/DashboardPage.js';

export const ChatAssignAgentPage: React.FC = () => {
  const { conversationId = '' } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userId = user?.id || (user as any)?._id;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [ownedAgentTeams, setOwnedAgentTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Teams search/filter
  const [teamSearchQuery, setTeamSearchQuery] = useState('');

  // Selected team preview (can be the assigned team or an available team being browsed)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersPage, setMembersPage] = useState(1);
  const [membersTotalPages, setMembersTotalPages] = useState(1);

  // Back path computation
  const backPath = useMemo(() => {
    const role = (user?.role ?? 'user').toString().toLowerCase();
    const prefix = role === 'admin'
      ? '/admin'
      : role === 'theatre_owner'
        ? '/owner'
        : '/user';
    return `${prefix}/chat/${conversationId}`;
  }, [user, conversationId]);

  // Load conversation details
  const fetchConversation = useCallback(async () => {
    try {
      const res = await chatApi.getConversation(conversationId);
      if (res.conversation) {
        setConversation(res.conversation);
      }
    } catch (err: any) {
      toast.error('Failed to load conversation details');
    }
  }, [conversationId]);

  // Load owned agent teams
  const fetchOwnedTeams = useCallback(async () => {
    try {
      const res = await teamsApi.getMyTeams();
      if (res.teams) {
        // Filter only teams of type 'agent'
        const agents = res.teams.owned.filter((t) => t.type === 'agent');
        setOwnedAgentTeams(agents);
      }
    } catch (err: any) {
      toast.error('Failed to fetch your agent teams');
    }
  }, []);

  // Initialize
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchConversation(), fetchOwnedTeams()]);
      setLoading(false);
    };
    init();
  }, [fetchConversation, fetchOwnedTeams]);

  // If conversation has an assigned team and no team is selected yet, select it to preview
  useEffect(() => {
    if (conversation?.conversationAssign && !selectedTeam && ownedAgentTeams.length > 0) {
      const assigned = ownedAgentTeams.find(
        (t) => t._id === conversation.conversationAssign?._id
      );
      if (assigned) {
        setSelectedTeam(assigned);
      }
    }
  }, [conversation, ownedAgentTeams, selectedTeam]);

  // Fetch preview members whenever selectedTeam or membersPage changes
  const fetchMembers = useCallback(async (teamId: string, page = 1) => {
    try {
      setMembersLoading(true);
      const res = await teamsApi.getTeamMembers(teamId, page, 10);
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
      toast.error('Failed to fetch team members');
    } finally {
      setMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      fetchMembers(selectedTeam._id, 1);
    } else {
      setMembers([]);
      setMembersPage(1);
      setMembersTotalPages(1);
    }
  }, [selectedTeam, fetchMembers]);

  // Filter agent teams on query
  const filteredTeams = useMemo(() => {
    return ownedAgentTeams.filter((t) =>
      t.name.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
      t.publicName.toLowerCase().includes(teamSearchQuery.toLowerCase())
    );
  }, [ownedAgentTeams, teamSearchQuery]);

  // Handle Assign Agent Team
  const handleAssignAgent = async (team: Team) => {
    try {
      setActionLoading(true);
      const res = await teamsApi.assignAgent(conversationId, team._id);
      if (res.conversation) {
        toast.success(`Assigned team "${team.name}" successfully`);
        // Refresh local conversation status
        setConversation(res.conversation);
        // Refresh preview
        const updatedAssigned = ownedAgentTeams.find((t) => t._id === res.conversation.conversationAssign?._id);
        if (updatedAssigned) setSelectedTeam(updatedAssigned);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to assign agent team');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Unassign Agent Team
  const handleUnassignAgent = async () => {
    if (!window.confirm('Are you sure you want to unassign the agent team? The members of this team will be removed from the conversation.')) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await teamsApi.unassignAgent(conversationId);
      if (res.conversation) {
        toast.success('Agent team unassigned successfully');
        setConversation(res.conversation);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to unassign agent team');
    } finally {
      setActionLoading(false);
    }
  };

  // Check permissions
  const isDirectParent = conversation?.isDirectParentUser;

  const displayName = conversation?.conversation?.userName || conversation?.title || 'Chat';

  return (
    <>
      <SEO title="Assign Agent Team" description="Assign an agent team to handle support and chats." />
      <DashboardPage
        title="Assign Agent"
        accent="Team"
        accentColor="text-purple-400"
        subtitle={conversation ? `Manage agent assignment for "${displayName}"` : 'Manage conversation assignment'}
        icon={<UserCheck className="text-purple-400" size={24} />}
        headerActions={
          <button
            onClick={() => navigate(backPath)}
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-white/10 transition-all text-white/80 hover:text-white"
          >
            <ArrowLeft size={14} /> Back to Chat
          </button>
        }
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-purple-400" size={32} />
            <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Loading details...</p>
          </div>
        ) : !isDirectParent ? (
          <div className="p-8 rounded-3xl border border-rose-500/20 bg-rose-500/5 text-rose-200 text-xs font-bold text-center">
            You do not have permission to assign an agent team to this conversation. Only direct parent users can perform this action.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left/Middle sections: Current & Available teams list */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Current Assignment Status */}
              <div className="bg-white/[0.02] border border-white/5 rounded-[40px] shadow-2xl backdrop-blur-3xl p-6 sm:p-8">
                <h3 className="text-xs font-black uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  Current Assignment
                </h3>

                {conversation?.conversationAssign ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-purple-500/5 border border-purple-500/20">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                        <Users size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          {conversation.conversationAssign.name}
                          <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                            Assigned
                          </span>
                        </h4>
                        <p className="text-[10px] text-white/40 font-mono mt-0.5">
                          @{conversation.conversationAssign.publicName}
                        </p>
                      </div>
                    </div>
                    <button
                      disabled={actionLoading}
                      onClick={handleUnassignAgent}
                      className="px-5 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                      {actionLoading ? 'Processing...' : 'Unassign Team'}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-white/10 rounded-3xl text-white/40 text-xs">
                    <p className="font-bold text-white/60">No Agent Team Assigned</p>
                    <p className="text-[10px] mt-1 text-white/30">
                      Select one of your agent teams below to assign handling responsibility.
                    </p>
                  </div>
                )}
              </div>

              {/* Available Agent Teams */}
              <div className="bg-white/[0.02] border border-white/5 rounded-[40px] shadow-2xl backdrop-blur-3xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-white/80">Available Agent Teams</h3>
                    <p className="text-[10px] text-white/40 mt-1">Select from agent teams you own</p>
                  </div>
                  <div className="w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Filter agent teams..."
                      value={teamSearchQuery}
                      onChange={(e) => setTeamSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white placeholder-white/20 outline-none focus:border-purple-500/30 transition-all font-semibold"
                    />
                  </div>
                </div>

                {filteredTeams.length === 0 ? (
                  <div className="text-center py-10 border border-white/5 rounded-3xl text-white/40 text-xs">
                    <Info className="mx-auto mb-2 text-white/20" size={24} />
                    <p className="font-bold text-white/60">No agent teams found</p>
                    {ownedAgentTeams.length === 0 ? (
                      <p className="text-[10px] mt-1 text-white/30">
                        You haven't created any 'agent' type teams yet. Go to <span onClick={() => navigate('/owner/teams')} className="text-purple-400 underline cursor-pointer hover:text-purple-300">Teams Management</span>.
                      </p>
                    ) : (
                      <p className="text-[10px] mt-1 text-white/30">Try a different search filter.</p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredTeams.map((team) => {
                      const isCurrentlyAssigned = conversation?.conversationAssign?._id === team._id;
                      const isBrowsed = selectedTeam?._id === team._id;
                      return (
                        <div
                          key={team._id}
                          onClick={() => setSelectedTeam(team)}
                          className={`group relative p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between min-h-[140px] ${
                            isBrowsed
                              ? 'border-purple-500 bg-purple-500/5 shadow-lg shadow-purple-500/5'
                              : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.12]'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-bold text-white leading-tight group-hover:text-purple-300 transition-colors">
                                {team.name}
                              </h4>
                              {isCurrentlyAssigned && (
                                <span className="text-[8px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold shrink-0">
                                  Current
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-white/40 font-mono mt-1">@{team.publicName}</p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between">
                            <span className="text-[9px] text-white/40 font-medium">Click to preview members</span>
                            {!isCurrentlyAssigned ? (
                              <button
                                disabled={actionLoading}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAssignAgent(team);
                                }}
                                className="px-4 py-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all disabled:opacity-50"
                              >
                                {actionLoading ? 'Assigning...' : 'Assign'}
                              </button>
                            ) : (
                              <span className="text-purple-400 flex items-center gap-1 text-[9px] uppercase tracking-widest font-black">
                                <Check size={12} /> Active
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right section: Team Member Preview */}
            <div className="space-y-6">
              <div className="bg-white/[0.02] border border-white/5 rounded-[40px] shadow-2xl backdrop-blur-3xl p-6 sm:p-8 h-full flex flex-col min-h-[400px]">
                <h3 className="text-xs font-black uppercase tracking-widest text-white/80 mb-4 flex items-center gap-2">
                  <Users size={14} className="text-purple-400" />
                  Team Roster Preview
                </h3>

                {selectedTeam ? (
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="pb-4 border-b border-white/[0.06] mb-4">
                        <h4 className="text-xs font-bold text-white">{selectedTeam.name}</h4>
                        <p className="text-[10px] text-white/40 font-mono mt-0.5">@{selectedTeam.publicName}</p>
                      </div>

                      {membersLoading ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-3">
                          <Loader2 className="animate-spin text-purple-400" size={20} />
                          <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Loading roster...</p>
                        </div>
                      ) : members.length === 0 ? (
                        <div className="text-center py-10 text-white/40 text-[10px] font-bold">
                          No active members in this team.
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                          {members.map((member) => {
                            const isMemOwner = selectedTeam.ownerId === member.memberId;
                            const isSelf = member.memberId === userId;
                            return (
                              <div
                                key={member._id}
                                className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.01] border border-white/[0.04]"
                              >
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-white/[0.08] to-white/[0.02] border border-white/[0.06] flex items-center justify-center text-xs font-bold text-white/70">
                                  {member.user?.name ? member.user.name.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                                    <span className="truncate">{member.user?.name || 'Unknown User'}</span>
                                    {isSelf && (
                                      <span className="text-[8px] bg-white/10 text-white/80 px-1 py-0.5 rounded font-bold">
                                        You
                                      </span>
                                    )}
                                    {isMemOwner && (
                                      <span className="text-[8px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1 py-0.5 rounded-full font-black flex items-center gap-0.5">
                                        <Shield size={6} /> Owner
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[9px] text-white/40 truncate">
                                    @{member.user?.username || 'unknown'}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Members Pagination */}
                    {membersTotalPages > 1 && (
                      <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-white/[0.06]">
                        <button
                          disabled={membersPage <= 1 || membersLoading}
                          onClick={() => fetchMembers(selectedTeam._id, membersPage - 1)}
                          className="p-1 rounded bg-white/[0.04] text-white/60 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-[10px] font-bold text-white/60">
                          {membersPage} / {membersTotalPages}
                        </span>
                        <button
                          disabled={membersPage >= membersTotalPages || membersLoading}
                          onClick={() => fetchMembers(selectedTeam._id, membersPage + 1)}
                          className="p-1 rounded bg-white/[0.04] text-white/60 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-white/30 text-[10px] py-10">
                    <Info size={24} className="mb-2 text-white/15" />
                    <p className="font-bold">No Team Selected</p>
                    <p className="text-white/20 mt-1 max-w-[200px]">
                      Select an agent team to preview its member list.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DashboardPage>
    </>
  );
};
