import mongoose, { Schema, Document } from 'mongoose';

export interface IChatbotSession extends Document {
  chatbotId: mongoose.Types.ObjectId;
  sessionKey: string;
  currentStepId?: mongoose.Types.ObjectId | null;
  data: Map<string, string>;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ChatbotSessionSchema = new Schema<IChatbotSession>(
  {
    chatbotId: { type: Schema.Types.ObjectId, ref: 'Chatbot', required: true },
    sessionKey: { type: String, required: true },
    currentStepId: { type: Schema.Types.ObjectId, ref: 'ChatbotFlow', default: null },
    data: { type: Map, of: String, default: {} },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

ChatbotSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
ChatbotSessionSchema.index({ chatbotId: 1, sessionKey: 1 }, { unique: true });

export const ChatbotSession = mongoose.model<IChatbotSession>(
  'ChatbotSession',
  ChatbotSessionSchema,
);
