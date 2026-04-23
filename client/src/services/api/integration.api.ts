import { http } from './http.js';

export interface IntegrationRecord {
  _id: string;
  userId: string;
  type: string;
  isActive: boolean;
  webhookUrl?: string;
  webhookSignature?: string;
  createdAt: string;
  updatedAt: string;
}

export const integrationApi = {
  /**
   * Get all integrations for the current user.
   */
  list: () => http.get<IntegrationRecord[]>('/integrations'),

  /**
   * Toggle the status of a specific integration.
   */
  toggle: (type: string) => http.post<IntegrationRecord>(`/integrations/${type}/toggle`),
};
