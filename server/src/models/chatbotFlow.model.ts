import mongoose, { Schema, Document } from 'mongoose';
import { ChatbotStepType } from '../constants/chatbot.enums.js';

export interface IChatbotFlow extends Document {
  chatbotId: mongoose.Types.ObjectId;
  stepName: string;
  description?: string;
  templateId: mongoose.Types.ObjectId;
  previousStep: {
    stepId: mongoose.Types.ObjectId | null;
    type: ChatbotStepType;
  };
  condition?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  isEntryPoint: boolean;
}

const ChatbotFlowSchema = new Schema<IChatbotFlow>(
  {
    chatbotId: { type: Schema.Types.ObjectId, ref: 'Chatbot', required: true },
    stepName: { type: String, required: true, trim: true },
    description: { type: String },
    templateId: { type: Schema.Types.ObjectId, ref: 'ChatbotTemplate', required: true },
    previousStep: {
      stepId: { type: Schema.Types.ObjectId, ref: 'ChatbotFlow', default: null },
      type: {
        type: String,
        enum: Object.values(ChatbotStepType),
        required: true,
      },
    },
    condition: { type: String },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

ChatbotFlowSchema.virtual('isEntryPoint').get(function (this: IChatbotFlow) {
  return this.previousStep.stepId === null;
});

ChatbotFlowSchema.index({ chatbotId: 1, order: 1 });
ChatbotFlowSchema.index({ chatbotId: 1, 'previousStep.stepId': 1 });

export const ChatbotFlow = mongoose.model<IChatbotFlow>('ChatbotFlow', ChatbotFlowSchema);
