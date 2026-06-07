import { NotificationType } from '../constants/enums.js';

export interface NotificationPayload {
  id?: string;
  title: string;
  message?: string;
  body?: string; // Fallback for standard notification body
  url?: string;
  icon?: string;
  image?: string;
  badge?: string;
  tag?: string;
  type?: NotificationType;
  silent?: boolean;
  sound?: boolean;
}

export interface Toast extends NotificationPayload {
  id: string;
  createdAt: number;
}
