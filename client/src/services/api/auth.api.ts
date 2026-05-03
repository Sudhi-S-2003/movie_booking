import { http } from './http.js';
import { type User } from '../../store/authStore.js';

export interface UserSession {
  _id: string;
  userAgent: string;
  ip: string;
  lastActive: string;
  isValid: boolean;
  isCurrent?: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const authApi = {
  listSessions: () => 
    http.get<{ success: boolean; sessions: UserSession[] }>('/auth/sessions'),
    
  revokeSession: (id: string) => 
    http.delete<{ success: boolean; message: string }>(`/auth/sessions/${id}`),

  login: (payload: any) => 
    http.post<AuthResponse>('/auth/login', payload),

  register: (payload: any) => 
    http.post<AuthResponse>('/auth/register', payload),
};
