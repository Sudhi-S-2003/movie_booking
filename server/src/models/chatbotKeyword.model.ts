import mongoose, { Schema, Document } from 'mongoose';
import { KeywordMatchType } from '../constants/chatbot.enums.js';

export interface IChatbotKeyword extends Document {
  chatbotId: mongoose.Types.ObjectId;
  keyword: string;
  matchType: KeywordMatchType;
  priority: number;
  sessionId: string;
  templateId: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ChatbotKeywordSchema = new Schema<IChatbotKeyword>(
  {
    chatbotId: { type: Schema.Types.ObjectId, ref: 'Chatbot', required: true },
    keyword: { type: String, required: true, lowercase: true, trim: true },
    matchType: {
      type: String,
      enum: Object.values(KeywordMatchType),
      default: KeywordMatchType.CONTAINS,
    },
    priority: { type: Number, default: 0 },
    sessionId: { type: String, required: true, trim: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'ChatbotTemplate', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

ChatbotKeywordSchema.index({ chatbotId: 1, keyword: 1 }, { unique: true });
ChatbotKeywordSchema.index({ chatbotId: 1, sessionId: 1 });
ChatbotKeywordSchema.index({ chatbotId: 1, priority: -1 });

export const ChatbotKeyword = mongoose.model<IChatbotKeyword>('ChatbotKeyword', ChatbotKeywordSchema);
