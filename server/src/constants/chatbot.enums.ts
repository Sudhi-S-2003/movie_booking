export const ChatbotType = {
  KEYWORD_ONLY: 'keyword-only',
  FLOW: 'flow',
  MENU: 'menu',
  FORM: 'form',
} as const;
export type ChatbotType = (typeof ChatbotType)[keyof typeof ChatbotType];

export const ChatbotStepType = {
  TRIGGER: 'chatbot-trigger',
  FLOW: 'chatbot-flow',
} as const;
export type ChatbotStepType = (typeof ChatbotStepType)[keyof typeof ChatbotStepType];

export const KeywordMatchType = {
  EXACT: 'exact',
  CONTAINS: 'contains',
  STARTS_WITH: 'startsWith',
  REGEX: 'regex',
} as const;
export type KeywordMatchType = (typeof KeywordMatchType)[keyof typeof KeywordMatchType];

export const TemplateStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
} as const;
export type TemplateStatus = (typeof TemplateStatus)[keyof typeof TemplateStatus];

export const HeaderType = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  DOCUMENT: 'document',
} as const;
export type HeaderType = (typeof HeaderType)[keyof typeof HeaderType];

export const MenuItemActionType = {
  TEMPLATE: 'template',
  FLOW: 'flow',
  MENU: 'menu',
} as const;
export type MenuItemActionType = (typeof MenuItemActionType)[keyof typeof MenuItemActionType];

export const FormFieldType = {
  TEXT: 'text',
  NUMBER: 'number',
  EMAIL: 'email',
  PHONE: 'phone',
  DATE: 'date',
  SELECT: 'select',
} as const;
export type FormFieldType = (typeof FormFieldType)[keyof typeof FormFieldType];
