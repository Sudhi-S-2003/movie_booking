import { http } from './http.js';
import { type User } from '../../store/authStore.js';

export interface UserSession {
  _id: string;
  userAgent: string;
  ip: string;
  lastActive: string;
  isValid: boolean;
  isCurrent?: boolean;
  isOnline?: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
  requires2FA?: boolean;
  tempToken?: string;
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
    
  getCaptcha: () =>
    http.get<{ success: boolean; captchaToken: string; captchaImage: string }>('/auth/captcha'),
    
  logout: () => 
    http.post<{ success: boolean; message: string }>('/auth/logout'),

  completeTwoFactorLogin: (payload: { code: string }, tempToken: string) =>
    http.post<AuthResponse>('/auth/2fa/complete-login', payload, {
      headers: { Authorization: `Bearer ${tempToken}` }
    }),

  setup2FA: () =>
    http.post<{ qrCodeDataUrl: string; secret: string }>('/auth/2fa/setup'),

  verify2FA: (payload: { code: string }) =>
    http.post<{ backupCodes: string[] }>('/auth/2fa/verify', payload),

  disable2FA: (payload: { code: string }) =>
    http.post<{ message: string }>('/auth/2fa/disable', payload),

  // Passkey (WebAuthn) Operations
  getPasskeyRegistrationOptions: () =>
    http.get<{ success: boolean; options: any; challengeToken: string }>('/auth/passkey/register/options'),

  verifyPasskeyRegistration: (payload: { response: any; friendlyName: string; challengeToken: string }) =>
    http.post<{ success: boolean; message: string }>('/auth/passkey/register/verify', payload),

  getPasskeyAuthenticationOptions: (email?: string) =>
    http.get<{ success: boolean; options: any; challengeToken: string }>(`/auth/passkey/login/options${email ? `?email=${encodeURIComponent(email)}` : ''}`),

  verifyPasskeyAuthentication: (payload: { response: any; challengeToken: string }) =>
    http.post<AuthResponse>('/auth/passkey/login/verify', payload),

  listPasskeys: () =>
    http.get<{ success: boolean; passkeys: any[] }>('/auth/passkey/list'),

  deletePasskey: (id: string) =>
    http.delete<{ success: boolean; message: string }>(`/auth/passkey/${id}`),
};
