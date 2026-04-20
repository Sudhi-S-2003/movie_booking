import { http } from './http.js';
import type {
  Conversation,
  ChatMessage,
  ChatContentType,
  ChatContactPayload,
  ChatLocationPayload,
  ChatDatePayload,
  ChatEventPayload,
  SearchedUser,
} from '../../components/chat/types.js';
import type { Pagination } from './hashtags.api.js';

// ── Response Types ───────────────────────────────────────────────────────────

interface ConversationsResponse {
  conversations: Conversation[];
  pagination:    Pagination;
}

interface SingleConversationResponse {
  conversation: Conversation;
  existing?:    boolean;
}

interface MessagesResponse {
  messages:           ChatMessage[];
  hasBefore:           boolean;
  hasAfter:           boolean;
  beforeCursor:        string | null;
  afterCursor:        string | null;
  targetIndex?:       number;
  lastReadMessageId?: string | null;
}

interface TokenResponse {
  plan:      'free' | 'pro';
  cost:      number;
  remaining: { daily?: number; weekly?: number; monthly?: number };
}

interface SendMessageResponse {
  message: ChatMessage;
  tokens?: TokenResponse;
}

interface UnreadCountsResponse {
  counts:      Record<string, number>;
  lastReadMap: Record<string, string | null>;
}

interface SearchUsersResponse {
  users:      SearchedUser[];
  pagination: Pagination;
}

export interface ConversationMember {
  _id:       string;
  name:      string;
  username:  string;
  avatar?:   string;
  bio?:      string;
  role:      'owner' | 'member';
  joinedAt:  string;
  isCreator: boolean;
  isYou:     boolean;
}

interface MembersResponse {
  members:    ConversationMember[];
  pagination: Pagination;
  conversation: {
    _id:        string;
    type:       'direct' | 'group' | 'system';
    title:      string | null;
    createdBy:  string | null;
    publicName: string | null;
  };
}

// ── Public / onboarding types ────────────────────────────────────────────────

export interface PublicChatSummary {
  _id:              string;
  type:             'direct' | 'group' | 'system';
  title:            string | null;
  avatarUrl:        string | null;
  publicName:       string;
  participantCount: number;
  createdAt:        string;
}

export interface PublicMembership {
  isMember:         boolean;
  canRequestToJoin: boolean;
  authenticated:    boolean;
}

export interface PublicChatResponse {
  conversation:   PublicChatSummary;
  membership:     PublicMembership;
  pendingRequest: boolean;
}

export interface JoinRequest {
  _id:       string;
  status:    'pending' | 'approved' | 'rejected';
  createdAt: string;
  resolvedAt?: string;
}

export interface JoinRequestWithUser {
  _id:       string;
  user:      { _id: string; name: string; username: string; avatar?: string };
  status:    'pending' | 'approved' | 'rejected';
  message?:  string;
  createdAt: string;
}

interface JoinRequestListResponse {
  requests:     JoinRequestWithUser[];
  pagination:   Pagination;
  pendingTotal: number;
}

export interface ChatInvite {
  _id:       string;
  token:     string;
  expiresAt: string | null;
  maxUses:   number | null;
  usesCount: number;
  revoked:   boolean;
  createdAt: string;
  createdBy: string;
}

interface InviteListResponse {
  invites:    ChatInvite[];
  pagination: Pagination;
}

export interface InvitePreviewResponse {
  conversation: {
    _id:              string;
    type:             'direct' | 'group' | 'system';
    title:            string | null;
    avatarUrl:        string | null;
    publicName:       string | null;
    participantCount: number;
  };
  invite: {
    expiresAt: string | null;
    usesCount: number;
    maxUses:   number | null;
  };
  membership: {
    isMember:      boolean;
    authenticated: boolean;
  };
}

// ── Query Types ──────────────────────────────────────────────────────────────

export type ConversationTypeFilter = 'direct' | 'group' | 'system' | 'api';
export type ConversationSortField  = 'activity' | 'created' | 'name';
export type ConversationSortOrder  = 'asc' | 'desc';

export interface ConversationsQuery {
  page?:      number;
  limit?:     number;
  q?:         string;
  type?:      ConversationTypeFilter;
  sortBy?:    ConversationSortField;
  sortOrder?: ConversationSortOrder;
}

interface MessagesQuery {
  limit?:  number;
  before?: string;
  after?:  string;
  around?: string;
  anchor?: string;
}

interface CreateConversationBody {
  type:           'direct' | 'group';
  participantIds: string[];
  title?:         string;
  /**
   * Optional slug for group conversations — makes the chat resolvable at
   * `/chat/g/:publicName` and lets non-members request to join. Ignored
   * (and rejected with 400) for direct chats.
   */
  publicName?:    string;
}

export interface SendMessageBody {
  text?:        string;
  contentType?: ChatContentType;
  emoji?:       string;
  contact?:     ChatContactPayload;
  location?:    ChatLocationPayload;
  date?:        ChatDatePayload;
  event?:       ChatEventPayload;
  attachments?: string[];
  replyTo?: {
    messageId:  string;
    senderName: string;
    text:       string;
  };
}

// ── API Client ───────────────────────────────────────────────────────────────

export const chatApi = {
  // Conversations
  getConversations: (params?: ConversationsQuery) =>
    http.get<ConversationsResponse>('/chat/conversations', { params }),

  createConversation: (body: CreateConversationBody) =>
    http.post<SingleConversationResponse>('/chat/conversations', body),

  getConversation: (id: string) =>
    http.get<SingleConversationResponse>(`/chat/conversations/${id}`),

  getMembers: (id: string, params?: { page?: number; limit?: number }) =>
    http.get<MembersResponse>(`/chat/conversations/${id}/members`, { params }),

  updateConversation: (id: string, body: { title?: string; avatarUrl?: string }) =>
    http.patch<SingleConversationResponse>(`/chat/conversations/${id}`, body),

  addParticipants: (id: string, userIds: string[]) =>
    http.post<SingleConversationResponse>(`/chat/conversations/${id}/participants`, { userIds }),

  removeParticipant: (conversationId: string, userId: string) =>
    http.delete<SingleConversationResponse>(`/chat/conversations/${conversationId}/participants/${userId}`),

  // Messages
  getMessages: (conversationId: string, params?: MessagesQuery, signal?: AbortSignal) =>
    http.get<MessagesResponse>(`/chat/conversations/${conversationId}/messages`, { params, signal }),

  sendMessage: (conversationId: string, body: SendMessageBody) =>
    http.post<SendMessageResponse>(`/chat/conversations/${conversationId}/messages`, body),

  deleteMessage: (conversationId: string, messageId: string) =>
    http.delete<{ message: ChatMessage }>(`/chat/conversations/${conversationId}/messages/${messageId}`),

  markMessagesRead: (conversationId: string, messageIds: string[]) =>
    http.post<{ success: boolean; markedIds?: string[] }>(
      `/chat/conversations/${conversationId}/messages/read`,
      { messageIds },
    ),

  // Unread
  getUnreadCounts: () =>
    http.get<UnreadCountsResponse>('/chat/unread-counts'),

  // User search
  searchUsers: (q: string, params?: { page?: number; limit?: number }) =>
    http.get<SearchUsersResponse>('/chat/users/search', { params: { q, ...params } }),

  // ── Public resolver ──────────────────────────────────────────────────────
  getPublicConversation: (publicName: string) =>
    http.get<PublicChatResponse>(`/chat/public/${encodeURIComponent(publicName)}`),

  setPublicName: (conversationId: string, publicName: string | null) =>
    http.post<{ conversation: { _id: string; publicName: string | null } }>(
      `/chat/conversations/${conversationId}/public-name`,
      { publicName },
    ),

  // ── Join requests ────────────────────────────────────────────────────────
  createJoinRequest: (conversationId: string, message?: string) =>
    http.post<{ request: JoinRequest; created: boolean }>(
      `/chat/conversations/${conversationId}/join-requests`,
      { message },
    ),

  listJoinRequests: (
    conversationId: string,
    params?: { status?: 'pending' | 'approved' | 'rejected'; page?: number; limit?: number },
  ) =>
    http.get<JoinRequestListResponse>(
      `/chat/conversations/${conversationId}/join-requests`,
      { params },
    ),

  approveJoinRequest: (conversationId: string, requestId: string) =>
    http.post<{ request: JoinRequest }>(
      `/chat/conversations/${conversationId}/join-requests/${requestId}/approve`,
    ),

  rejectJoinRequest: (conversationId: string, requestId: string) =>
    http.post<{ request: JoinRequest }>(
      `/chat/conversations/${conversationId}/join-requests/${requestId}/reject`,
    ),

  // ── Invite links ─────────────────────────────────────────────────────────
  createInvite: (
    conversationId: string,
    body?: { expiresInMs?: number; maxUses?: number },
  ) =>
    http.post<{ invite: ChatInvite }>(
      `/chat/conversations/${conversationId}/invites`,
      body ?? {},
    ),

  listInvites: (conversationId: string, params?: { page?: number; limit?: number }) =>
    http.get<InviteListResponse>(
      `/chat/conversations/${conversationId}/invites`,
      { params },
    ),

  revokeInvite: (conversationId: string, inviteId: string) =>
    http.delete<{ invite: ChatInvite }>(
      `/chat/conversations/${conversationId}/invites/${inviteId}`,
    ),

  getInviteByToken: (token: string) =>
    http.get<InvitePreviewResponse>(`/chat/invites/${encodeURIComponent(token)}`),

  acceptInvite: (token: string) =>
    http.post<{ conversationId: string }>(`/chat/invites/${encodeURIComponent(token)}/accept`),

  // ── Guest API (Signature Verified) ──────────────────────────────────────
  getGuestConversation: (id: string, params: { signature: string; expiresAt: string }) =>
    http.get<SingleConversationResponse>(`/public/chat/conversation/${id}`, { params: params as any }),

  getGuestMessages: (id: string, params: MessagesQuery & { signature: string; expiresAt: string }, signal?: AbortSignal) =>
    http.get<MessagesResponse>(`/public/chat/conversation/${id}/messages`, { params: params as any, signal }),

  sendGuestMessage: (id: string, body: SendMessageBody, params: { signature: string; expiresAt: string }) =>
    http.post<SendMessageResponse>(`/public/chat/conversation/${id}/messages`, body, { params: params as any }),

  markGuestMessagesRead: (
    id: string,
    messageIds: string[],
    params: { signature: string; expiresAt: string },
  ) =>
    http.post<{ success: boolean; markedIds?: string[] }>(
      `/public/chat/conversation/${id}/messages/read`,
      { messageIds },
      { params: params as any },
    ),

  deleteGuestMessage: (id: string, messageId: string, params: { signature: string; expiresAt: string }) =>
    http.delete<{ message: ChatMessage }>(`/public/chat/conversation/${id}/messages/${messageId}`, { params: params as any }),
};
