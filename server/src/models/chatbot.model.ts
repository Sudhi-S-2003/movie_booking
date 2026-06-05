import mongoose, { Schema, Document } from 'mongoose';
import { ChatbotType } from '../constants/chatbot.enums.js';

export interface IChatbot extends Document {
  name: string;
  description?: string;
  userId: mongoose.Types.ObjectId;
  type: ChatbotType;
  isActive: boolean;
  language: string;
  welcomeTemplateId?: mongoose.Types.ObjectId;
  fallbackTemplateId?: mongoose.Types.ObjectId;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChatbotSchema = new Schema<IChatbot>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, maxlength: 300 },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: Object.values(ChatbotType),
      required: true,
    },
    isActive: { type: Boolean, default: true },
    language: { type: String, default: 'en' },
    welcomeTemplateId: { type: Schema.Types.ObjectId, ref: 'ChatbotTemplate' },
    fallbackTemplateId: { type: Schema.Types.ObjectId, ref: 'ChatbotTemplate' },
    avatarUrl: { type: String },
  },
  { timestamps: true },
);

ChatbotSchema.index({ userId: 1, createdAt: -1 });

export const Chatbot = mongoose.model<IChatbot>('Chatbot', ChatbotSchema);
