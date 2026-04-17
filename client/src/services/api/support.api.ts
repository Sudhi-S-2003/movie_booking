import { http } from './http.js';
import type {
  CreateIssueBody,
  IssueMessagesQuery,
  IssueMessagesResponse,
  IssueReadResponse,
  IssueReplyBody,
  IssueReplyResponse,
  IssueResponse,
  IssueStatusUpdateResponse,
  IssueUnreadCountsResponse,
  IssuesListQuery,
  IssuesListResponse,
} from '../../types/api.js';
import type { IssueStatus } from '../../types/models.js';

const guestHeaders = (issueId: string): Record<string, string> | undefined => {
  if (typeof localStorage === 'undefined') return undefined;
  const key = `guest_session_${issueId}`;
  if (!localStorage.getItem(key)) return undefined;
  return { 'x-guest-session-id': issueId };
};

export const supportApi = {
  create: (data: CreateIssueBody) => http.post<IssueResponse>('/issues', data),

  listMine: (params?: IssuesListQuery) => {
    const merged: Record<string, unknown> = { ...(params ?? {}) };
    if (typeof localStorage !== 'undefined') {
      const guestIds = localStorage.getItem('myGuestTickets');
      if (guestIds) merged.guestIssueIds = guestIds;
    }
    return http.get<IssuesListResponse>('/issues/my', { params: merged });
  },

  listAll: (params?: IssuesListQuery) =>
    http.get<IssuesListResponse>('/issues/all', {
      params: (params ?? {}) as Record<string, unknown>,
    }),

  getMessages: (issueId: string, params?: IssueMessagesQuery, signal?: AbortSignal) => {
    const headers = guestHeaders(issueId);
    const opts: { params: Record<string, unknown>; headers?: Record<string, string>; signal?: AbortSignal } = {
      params: (params ?? {}) as Record<string, unknown>,
    };
    if (headers) opts.headers = headers;
    if (signal) opts.signal = signal;
    return http.get<IssueMessagesResponse>(`/issues/${issueId}/messages`, opts);
  },

  markMessagesRead: (issueId: string, messageIds: string[]) =>
    http.post<IssueReadResponse>(`/issues/${issueId}/messages/read`, { messageIds }),

  getUnreadCounts: () => http.get<IssueUnreadCountsResponse>('/issues/unread-counts'),

  addReply: (issueId: string, body: IssueReplyBody) => {
    const headers = guestHeaders(issueId);
    const opts = headers ? { headers } : undefined;
    return http.post<IssueReplyResponse>(`/issues/${issueId}/replies`, body, opts);
  },

  updateStatus: (issueId: string, status: IssueStatus | string) => {
    const headers = guestHeaders(issueId);
    const opts = headers ? { headers } : undefined;
    return http.patch<IssueStatusUpdateResponse>(`/issues/${issueId}/status`, { status }, opts);
  },
};
