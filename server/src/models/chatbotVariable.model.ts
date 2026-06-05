import mongoose, { Schema, Document } from 'mongoose';

export interface IChatbotVariable extends Document {
  chatbotId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  defaultValue?: string;
  required: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ChatbotVariableSchema = new Schema<IChatbotVariable>(
  {
    chatbotId: { type: Schema.Types.ObjectId, ref: 'Chatbot', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    defaultValue: { type: String },
    required: { type: Boolean, default: false },
  },
  { timestamps: true },
);

ChatbotVariableSchema.index({ chatbotId: 1, name: 1 }, { unique: true });

export const ChatbotVariable = mongoose.model<IChatbotVariable>(
  'ChatbotVariable',
  ChatbotVariableSchema,
);
