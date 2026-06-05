import mongoose, { Schema, Document } from 'mongoose';
import { MenuItemActionType } from '../constants/chatbot.enums.js';

export interface IMenuItem {
  label: string;
  description?: string;
  order: number;
  actionType: MenuItemActionType;
  templateId?: mongoose.Types.ObjectId | null;
  flowStepId?: mongoose.Types.ObjectId | null;
  subMenuId?: mongoose.Types.ObjectId | null;
}

export interface IChatbotMenu extends Document {
  chatbotId: mongoose.Types.ObjectId;
  name: string;
  title: string;
  body?: string;
  footerText?: string;
  keywordId?: mongoose.Types.ObjectId;
  items: IMenuItem[];
  createdAt: Date;
  updatedAt: Date;
}

const MenuItemSchema = new Schema<IMenuItem>({
  label: { type: String, required: true, trim: true },
  description: { type: String },
  order: { type: Number, default: 0 },
  actionType: {
    type: String,
    enum: Object.values(MenuItemActionType),
    required: true,
  },
  templateId: { type: Schema.Types.ObjectId, ref: 'ChatbotTemplate', default: null },
  flowStepId: { type: Schema.Types.ObjectId, ref: 'ChatbotFlow', default: null },
  subMenuId: { type: Schema.Types.ObjectId, ref: 'ChatbotMenu', default: null },
});

const ChatbotMenuSchema = new Schema<IChatbotMenu>(
  {
    chatbotId: { type: Schema.Types.ObjectId, ref: 'Chatbot', required: true },
    name: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    body: { type: String },
    footerText: { type: String },
    keywordId: { type: Schema.Types.ObjectId, ref: 'ChatbotKeyword' },
    items: { type: [MenuItemSchema], default: [] },
  },
  { timestamps: true },
);

ChatbotMenuSchema.index({ chatbotId: 1 });
ChatbotMenuSchema.index({ keywordId: 1 }, { unique: true, sparse: true });

export const ChatbotMenu = mongoose.model<IChatbotMenu>('ChatbotMenu', ChatbotMenuSchema);
