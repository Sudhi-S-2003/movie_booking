import { http } from './http.js';

export interface Team {
  _id: string;
  ownerId: string;
  name: string;
  publicName: string;
  type: 'agent' | 'team';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  _id: string;
  memberId: string;
  teamId: string;
  isActive: boolean;
  joinedAt: string;
  user?: {
    _id: string;
    name: string;
    username: string;
    email: string;
    avatar?: string;
  } | null;
}

export interface MyTeamsResponse {
  teams: {
    owned: Team[];
    joined: Team[];
  };
}

export interface SingleTeamResponse {
  team: Team;
}

export interface TeamMembersResponse {
  members: TeamMember[];
  pagination?: {
    page: number;
    limit: number;
    pages: number;
    total: number;
  };
}

export interface SingleMemberResponse {
  member: {
    _id: string;
    memberId: string;
    teamId: string;
    isActive: boolean;
    joinedAt: string;
  };
}

export const teamsApi = {
  createTeam: (body: { name: string; publicName: string; type: 'agent' | 'team' }) =>
    http.post<SingleTeamResponse>('/chat/teams', body),

  getMyTeams: () =>
    http.get<MyTeamsResponse>('/chat/teams'),

  getTeamMembers: (teamId: string, page?: number, limit?: number) =>
    http.get<TeamMembersResponse>(`/chat/teams/${teamId}/members`, { params: { page, limit } }),

  addTeamMember: (teamId: string, memberId: string) =>
    http.post<SingleMemberResponse>(`/chat/teams/${teamId}/members`, { memberId }),

  removeTeamMember: (teamId: string, memberId: string) =>
    http.delete<SingleMemberResponse>(`/chat/teams/${teamId}/members/${memberId}`),

  assignAgent: (conversationId: string, agentId: string) =>
    http.post<{ conversation: any }>(`/chat/conversations/${conversationId}/assign-agent`, { agentId }),

  unassignAgent: (conversationId: string) =>
    http.post<{ conversation: any }>(`/chat/conversations/${conversationId}/unassign-agent`),
};

