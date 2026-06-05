import { http } from './http.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Chatbot {
  _id: string;
  name: string;
  description?: string;
  userId: string;
  type: 'keyword-only' | 'flow' | 'menu' | 'form';
  isActive: boolean;
  language: string;
  welcomeTemplateId?: string | null;
  fallbackTemplateId?: string | null;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  // counts (from list endpoint)
  keywordCount?: number;
  templateCount?: number;
  flowStepCount?: number;
  menuCount?: number;
  formFieldCount?: number;
}

export interface ChatbotKeyword {
  _id: string;
  chatbotId: string;
  keyword: string;
  matchType: 'exact' | 'contains' | 'startsWith' | 'regex';
  priority: number;
  sessionId: string;
  templateId: string;
  isActive: boolean;
  createdAt: string;
}

export interface ChatbotTemplate {
  _id: string;
  chatbotId: string;
  name: string;
  status: 'draft' | 'published';
  language: string;
  description?: string;
  nextFlowStepId?: string | null;
  headers: ChatbotTemplateSection[];
  bodies: ChatbotTemplateSection[];
  footers: ChatbotTemplateSection[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatbotTemplateSection {
  _id?: string;
  type?: string; // for headers
  key: string;
  value: string;
  order: number;
}

export interface ChatbotVariable {
  _id: string;
  chatbotId: string;
  name: string;
  description?: string;
  defaultValue?: string;
  required: boolean;
  createdAt: string;
}

export interface ChatbotFlow {
  _id: string;
  chatbotId: string;
  stepName: string;
  description?: string;
  templateId: string;
  previousStep: { stepId: string | null; type: 'chatbot-trigger' | 'chatbot-flow' };
  condition?: string;
  order: number;
  createdAt: string;
}

export interface ChatbotMenu {
  _id: string;
  chatbotId: string;
  name: string;
  title: string;
  body?: string;
  footerText?: string;
  keywordId?: string;
  items: ChatbotMenuItem[];
  createdAt: string;
}

export interface ChatbotMenuItem {
  _id?: string;
  label: string;
  description?: string;
  order: number;
  actionType: 'template' | 'flow' | 'menu';
  templateId?: string | null;
  flowStepId?: string | null;
  subMenuId?: string | null;
}

export interface ChatbotFormField {
  _id: string;
  chatbotId: string;
  name: string;
  label: string;
  fieldType: 'text' | 'number' | 'email' | 'phone' | 'date' | 'select';
  required: boolean;
  order: number;
  options?: string[];
  placeholder?: string;
  validationRegex?: string;
  validationMessage?: string;
  submissionTemplateId?: string | null;
  createdAt: string;
}

// ── Pagination helpers ────────────────────────────────────────────────────────

export interface ChatbotListParams {
  page?: number;
  limit?: number;
  type?: string;
  q?: string;
  isActive?: boolean;
}

export interface ChatbotListResponse {
  chatbots: Chatbot[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Client ────────────────────────────────────────────────────────────────────

export const chatbotApi = {
  // ── Chatbots ──────────────────────────────────────────────────────────────
  /** List chatbots with server-side pagination and filtering. */
  list: (params?: ChatbotListParams) =>
    http.get<ChatbotListResponse>('/chatbots', { params: params as Record<string, unknown> | undefined }),

  /** Create a new chatbot. */
  create: (data: Partial<Chatbot>) =>
    http.post<{ chatbot: Chatbot }>('/chatbots', data),

  /** Get a single chatbot by ID. */
  getById: (id: string) =>
    http.get<{ chatbot: Chatbot }>(`/chatbots/${id}`),

  /** Update a chatbot. */
  update: (id: string, data: Partial<Chatbot>) =>
    http.patch<{ chatbot: Chatbot }>(`/chatbots/${id}`, data),

  /** Delete a chatbot. */
  remove: (id: string) =>
    http.delete<{ message: string }>(`/chatbots/${id}`),

  // ── Keywords ──────────────────────────────────────────────────────────────
  /** List keywords for a chatbot. */
  listKeywords: (chatbotId: string, params?: Record<string, unknown>) =>
    http.get<{ keywords: ChatbotKeyword[] }>(`/chatbots/${chatbotId}/keywords`, { params }),

  /** Add a keyword to a chatbot. */
  addKeyword: (chatbotId: string, data: Partial<ChatbotKeyword>) =>
    http.post<{ keyword: ChatbotKeyword }>(`/chatbots/${chatbotId}/keywords`, data),

  /** Update a keyword. */
  updateKeyword: (chatbotId: string, kwId: string, data: Partial<ChatbotKeyword>) =>
    http.patch<{ keyword: ChatbotKeyword }>(`/chatbots/${chatbotId}/keywords/${kwId}`, data),

  /** Delete a keyword. */
  deleteKeyword: (chatbotId: string, kwId: string) =>
    http.delete<{ message: string }>(`/chatbots/${chatbotId}/keywords/${kwId}`),

  // ── Templates ─────────────────────────────────────────────────────────────
  /** List templates for a chatbot. */
  listTemplates: (chatbotId: string, params?: Record<string, unknown>) =>
    http.get<{ templates: ChatbotTemplate[] }>(`/chatbots/${chatbotId}/templates`, { params }),

  /** Create a template. */
  createTemplate: (chatbotId: string, data: Partial<ChatbotTemplate>) =>
    http.post<{ template: ChatbotTemplate }>(`/chatbots/${chatbotId}/templates`, data),

  /** Get a single template. */
  getTemplate: (chatbotId: string, tplId: string) =>
    http.get<{ template: ChatbotTemplate }>(`/chatbots/${chatbotId}/templates/${tplId}`),

  /** Update a template. */
  updateTemplate: (chatbotId: string, tplId: string, data: Partial<ChatbotTemplate>) =>
    http.patch<{ template: ChatbotTemplate }>(`/chatbots/${chatbotId}/templates/${tplId}`, data),

  /** Delete a template. */
  deleteTemplate: (chatbotId: string, tplId: string) =>
    http.delete<{ message: string }>(`/chatbots/${chatbotId}/templates/${tplId}`),

  // ── Variables ─────────────────────────────────────────────────────────────
  listVariables: (chatbotId: string) =>
    http.get<{ variables: ChatbotVariable[] }>(`/chatbots/${chatbotId}/variables`),

  addVariable: (chatbotId: string, data: Partial<ChatbotVariable>) =>
    http.post<{ variable: ChatbotVariable }>(`/chatbots/${chatbotId}/variables`, data),

  updateVariable: (chatbotId: string, vId: string, data: Partial<ChatbotVariable>) =>
    http.patch<{ variable: ChatbotVariable }>(`/chatbots/${chatbotId}/variables/${vId}`, data),

  deleteVariable: (chatbotId: string, vId: string) =>
    http.delete<{ message: string }>(`/chatbots/${chatbotId}/variables/${vId}`),

  // ── Flows ─────────────────────────────────────────────────────────────────
  listFlows: (chatbotId: string) =>
    http.get<{ flows: ChatbotFlow[] }>(`/chatbots/${chatbotId}/flows`),

  createFlow: (chatbotId: string, data: Partial<ChatbotFlow>) =>
    http.post<{ flow: ChatbotFlow }>(`/chatbots/${chatbotId}/flows`, data),

  updateFlow: (chatbotId: string, stepId: string, data: Partial<ChatbotFlow>) =>
    http.patch<{ flow: ChatbotFlow }>(`/chatbots/${chatbotId}/flows/${stepId}`, data),

  deleteFlow: (chatbotId: string, stepId: string) =>
    http.delete<{ message: string }>(`/chatbots/${chatbotId}/flows/${stepId}`),

  // ── Menus ─────────────────────────────────────────────────────────────────
  listMenus: (chatbotId: string) =>
    http.get<{ menus: ChatbotMenu[] }>(`/chatbots/${chatbotId}/menus`),

  createMenu: (chatbotId: string, data: Partial<ChatbotMenu>) =>
    http.post<{ menu: ChatbotMenu }>(`/chatbots/${chatbotId}/menus`, data),

  getMenu: (chatbotId: string, menuId: string) =>
    http.get<{ menu: ChatbotMenu }>(`/chatbots/${chatbotId}/menus/${menuId}`),

  updateMenu: (chatbotId: string, menuId: string, data: Partial<ChatbotMenu>) =>
    http.patch<{ menu: ChatbotMenu }>(`/chatbots/${chatbotId}/menus/${menuId}`, data),

  deleteMenu: (chatbotId: string, menuId: string) =>
    http.delete<{ message: string }>(`/chatbots/${chatbotId}/menus/${menuId}`),

  // ── Form Fields ───────────────────────────────────────────────────────────
  listFormFields: (chatbotId: string) =>
    http.get<{ fields: ChatbotFormField[] }>(`/chatbots/${chatbotId}/form-fields`),

  addFormField: (chatbotId: string, data: Partial<ChatbotFormField>) =>
    http.post<{ field: ChatbotFormField }>(`/chatbots/${chatbotId}/form-fields`, data),

  updateFormField: (chatbotId: string, fieldId: string, data: Partial<ChatbotFormField>) =>
    http.patch<{ field: ChatbotFormField }>(`/chatbots/${chatbotId}/form-fields/${fieldId}`, data),

  deleteFormField: (chatbotId: string, fieldId: string) =>
    http.delete<{ message: string }>(`/chatbots/${chatbotId}/form-fields/${fieldId}`),
};
