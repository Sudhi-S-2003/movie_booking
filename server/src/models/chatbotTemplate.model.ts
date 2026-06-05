import mongoose, { Schema, Document } from 'mongoose';
import { TemplateStatus } from '../constants/chatbot.enums.js';

export interface ITemplateHeader {
  type: string; // 'text' | 'image' | 'video' | 'document'
  key: string;
  value: string;
  order: number;
}

export interface ITemplateSection {
  key: string;
  value: string;
  order: number;
}

export interface IChatbotTemplate extends Document {
  chatbotId: mongoose.Types.ObjectId;
  name: string;
  status: TemplateStatus;
  language: string;
  description?: string;
  nextFlowStepId?: mongoose.Types.ObjectId | null;
  headers: ITemplateHeader[];
  bodies: ITemplateSection[];
  footers: ITemplateSection[];
  createdAt: Date;
  updatedAt: Date;
}

const TemplateHeaderSchema = new Schema<ITemplateHeader>({
  type: { type: String, enum: ['text', 'image', 'video', 'document'], default: 'text' },
  key: { type: String, required: true, trim: true },
  value: { type: String, required: true },
  order: { type: Number, default: 0 },
});

const TemplateSectionSchema = new Schema<ITemplateSection>({
  key: { type: String, required: true, trim: true },
  value: { type: String, required: true },
  order: { type: Number, default: 0 },
});

const ChatbotTemplateSchema = new Schema<IChatbotTemplate>(
  {
    chatbotId: { type: Schema.Types.ObjectId, ref: 'Chatbot', required: true },
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: Object.values(TemplateStatus),
      default: TemplateStatus.DRAFT,
    },
    language: { type: String, default: 'en' },
    description: { type: String },
    nextFlowStepId: { type: Schema.Types.ObjectId, ref: 'ChatbotFlow', default: null },
    headers: { type: [TemplateHeaderSchema], default: [] },
    bodies: { type: [TemplateSectionSchema], default: [] },
    footers: { type: [TemplateSectionSchema], default: [] },
  },
  { timestamps: true },
);

ChatbotTemplateSchema.index({ chatbotId: 1, status: 1 });

export const ChatbotTemplate = mongoose.model<IChatbotTemplate>('ChatbotTemplate', ChatbotTemplateSchema);
