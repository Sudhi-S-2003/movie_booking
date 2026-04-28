import { http } from './http.js';

export interface UserSession {
  _id: string;
  userAgent: string;
  ip: string;
  lastActive: string;
  isValid: boolean;
  isCurrent?: boolean;
  createdAt: string;
}

export const authApi = {
  listSessions: () => 
    http.get<{ success: boolean; sessions: UserSession[] }>('/auth/sessions'),
    
  revokeSession: (id: string) => 
    http.delete<{ success: boolean; message: string }>(`/auth/sessions/${id}`),
};
