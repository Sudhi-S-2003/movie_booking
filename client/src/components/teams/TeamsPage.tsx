import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Plus, Briefcase, Network, Shield, Activity, X
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { teamsApi, type Team } from '../../services/api/teams.api.js';
import { toast } from '../../utils/toast.js';

export const TeamsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [ownedTeams, setOwnedTeams] = useState<Team[]>([]);
  const [joinedTeams, setJoinedTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'owned' | 'joined'>('owned');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamPublicName, setNewTeamPublicName] = useState('');
  const [newTeamType, setNewTeamType] = useState<'agent' | 'team'>('agent');
  const [createLoading, setCreateLoading] = useState(false);

  // Compute prefix for navigation
  const prefix = useMemo(() => {
    const role = (user?.role ?? 'user').toString().toLowerCase();
    return role === 'admin'
      ? '/admin'
      : role === 'theatre_owner'
        ? '/owner'
        : '/user';
  }, [user]);

  // Fetch teams
  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const res = await teamsApi.getMyTeams();
      if (res.teams) {
        setOwnedTeams(res.teams.owned);
        setJoinedTeams(res.teams.joined);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch teams');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Handle Team Creation
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newTeamPublicName.trim()) {
      toast.error('All fields are required');
      return;
    }

    try {
      setCreateLoading(true);
      const res = await teamsApi.createTeam({
        name: newTeamName.trim(),
        publicName: newTeamPublicName.trim(),
        type: newTeamType,
      });

      if (res.team) {
        toast.success(`Team "${res.team.name}" created successfully`);
        setShowCreateModal(false);
        setNewTeamName('');
        setNewTeamPublicName('');
        fetchTeams();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create team');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#09090b] text-white p-4 sm:p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Network className="text-accent-pink" size={24} />
            Teams Management
          </h2>
          <p className="text-xs text-white/40 mt-1">
            Organize teams and agents to collaborate on support issues and chats.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-accent-pink to-accent-purple hover:opacity-90 active:scale-95 transition-all text-xs font-black uppercase tracking-wider rounded-xl shadow-lg"
        >
          <Plus size={14} />
          Create Team
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.04] mb-6">
        <button
          onClick={() => setActiveTab('owned')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'owned'
              ? 'border-accent-pink text-white bg-white/[0.01]'
              : 'border-transparent text-white/40 hover:text-white/70'
          }`}
        >
          My Teams (Owned)
        </button>
        <button
          onClick={() => setActiveTab('joined')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'joined'
              ? 'border-accent-pink text-white bg-white/[0.01]'
              : 'border-transparent text-white/40 hover:text-white/70'
          }`}
        >
          Joined Teams
        </button>
      </div>

      {/* Content grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20 text-white/40 text-xs">
          Loading teams...
        </div>
      ) : activeTab === 'owned' ? (
        ownedTeams.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/[0.06] rounded-2xl bg-white/[0.01]">
            <Briefcase size={36} className="text-white/20 mb-3" />
            <p className="text-xs font-bold text-white/50">You don't own any teams yet</p>
            <p className="text-[10px] text-white/30 mt-1">Create an Agent team to assign support chats to them.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ownedTeams.map((team) => (
              <div
                key={team._id}
                onClick={() => navigate(`${prefix}/teams/${team._id}/managemnent`)}
                className="group relative flex flex-col justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all cursor-pointer shadow-lg shadow-black/30"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <h3 className="text-sm font-bold text-white group-hover:text-accent-pink transition-colors">
                      {team.name}
                    </h3>
                    <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-black ${
                      team.type === 'agent'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {team.type}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-white/30 mt-1">@{team.publicName}</p>
                </div>
                <div className="flex items-center justify-between mt-6 pt-3 border-t border-white/[0.04] text-[10px] text-white/40">
                  <span>Created {new Date(team.createdAt).toLocaleDateString()}</span>
                  <span className="font-bold text-accent-pink opacity-0 group-hover:opacity-100 transition-opacity">
                    Manage →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : joinedTeams.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/[0.06] rounded-2xl bg-white/[0.01]">
          <Users size={36} className="text-white/20 mb-3" />
          <p className="text-xs font-bold text-white/50">You haven't joined any teams</p>
          <p className="text-[10px] text-white/30 mt-1">When you are added to an agent team, it will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {joinedTeams.map((team) => (
            <div
              key={team._id}
              onClick={() => navigate(`${prefix}/teams/${team._id}/managemnent`)}
              className="group relative flex flex-col justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all cursor-pointer shadow-lg shadow-black/30"
            >
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-bold text-white group-hover:text-accent-pink transition-colors">
                    {team.name}
                  </h3>
                  <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-black ${
                    team.type === 'agent'
                      ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}>
                    {team.type}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-white/30 mt-1">@{team.publicName}</p>
              </div>
              <div className="flex items-center justify-between mt-6 pt-3 border-t border-white/[0.04] text-[10px] text-white/40">
                <span>Joined Team</span>
                <span className="font-bold text-accent-pink opacity-0 group-hover:opacity-100 transition-opacity">
                  View →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleCreateTeam}
            className="w-full max-w-md rounded-2xl bg-[#0b0b0e] border border-white/[0.1] shadow-2xl p-5 overflow-hidden"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-white/95">Create Collaboration Team</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded hover:bg-white/[0.06] text-white/40 hover:text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-white/40 uppercase tracking-widest mb-1.5">
                  Team Display Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Premium Support"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-purple-500/50 text-white placeholder-white/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-white/40 uppercase tracking-widest mb-1.5">
                  Public Name / Identifier
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. premium-support (lowercase, alphanumeric)"
                  value={newTeamPublicName}
                  onChange={(e) => setNewTeamPublicName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-purple-500/50 text-white placeholder-white/20 outline-none transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-white/40 uppercase tracking-widest mb-1.5">
                  Team Purpose / Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTeamType('agent')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      newTeamType === 'agent'
                        ? 'border-purple-500 bg-purple-500/5 text-white'
                        : 'border-white/[0.06] bg-white/[0.01] text-white/50 hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <Shield size={12} /> Agent
                    </div>
                    <p className="text-[9px] text-white/40 mt-1">Can be assigned to support chats.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTeamType('team')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      newTeamType === 'team'
                        ? 'border-blue-500 bg-blue-500/5 text-white'
                        : 'border-white/[0.06] bg-white/[0.01] text-white/50 hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <Activity size={12} /> Team
                    </div>
                    <p className="text-[9px] text-white/40 mt-1">For general developer collaboration.</p>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-white/[0.08] hover:bg-white/[0.04] text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="px-5 py-2 bg-gradient-to-r from-accent-pink to-accent-purple hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all text-xs font-black uppercase tracking-wider rounded-xl shadow-lg"
              >
                {createLoading ? 'Creating...' : 'Create Team'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
