import mongoose, { Schema, Document } from 'mongoose';
import { FormFieldType } from '../constants/chatbot.enums.js';

export interface IChatbotFormField extends Document {
  chatbotId: mongoose.Types.ObjectId;
  name: string;
  label: string;
  fieldType: FormFieldType;
  required: boolean;
  order: number;
  options?: string[];
  placeholder?: string;
  validationRegex?: string;
  validationMessage?: string;
  submissionTemplateId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ChatbotFormFieldSchema = new Schema<IChatbotFormField>(
  {
    chatbotId: { type: Schema.Types.ObjectId, ref: 'Chatbot', required: true },
    name: { type: String, required: true, trim: true },
    label: { type: String, required: true },
    fieldType: {
      type: String,
      enum: Object.values(FormFieldType),
      required: true,
    },
    required: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    options: { type: [String], default: [] },
    placeholder: { type: String },
    validationRegex: { type: String },
    validationMessage: { type: String },
    submissionTemplateId: { type: Schema.Types.ObjectId, ref: 'ChatbotTemplate', default: null },
  },
  { timestamps: true },
);

ChatbotFormFieldSchema.index({ chatbotId: 1, order: 1 });

export const ChatbotFormField = mongoose.model<IChatbotFormField>(
  'ChatbotFormField',
  ChatbotFormFieldSchema,
);
