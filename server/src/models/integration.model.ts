import mongoose, { Schema } from 'mongoose';
import type { IIntegration } from '../interfaces/models.interface.js';
import { IntegrationType } from '../constants/enums.js';

const IntegrationSchema = new Schema<IIntegration>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true 
    },
    type: { 
      type: String, 
      enum: Object.values(IntegrationType), 
      required: true 
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
  },
  { timestamps: true }
);

// Ensure unique integration per user and type
IntegrationSchema.index({ userId: 1, type: 1 }, { unique: true });

export const Integration = mongoose.model<IIntegration>('Integration', IntegrationSchema);
