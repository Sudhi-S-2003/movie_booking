import mongoose, { Schema } from 'mongoose';
import type { IScreen, ILayoutRow, ILayoutColumn } from '../interfaces/models.interface.js';
import { PricingTier } from '../constants/enums.js';

const LayoutColumnSchema = new Schema<ILayoutColumn>({
  type: { type: String, enum: ['seat', 'space'], required: true },
  name: { type: String },
  priceGroup: { type: String, enum: Object.values(PricingTier) }
}, { _id: false });

const LayoutRowSchema = new Schema<ILayoutRow>({
  type: { type: String, enum: ['row', 'space'], required: true },
  name: { type: String },
  columns: [LayoutColumnSchema]
}, { _id: false });

const ScreenSchema = new Schema<IScreen>(
  {
    theatreId: { type: Schema.Types.ObjectId, ref: 'Theatre', required: true },
    name: { type: String, required: true, trim: true },
    layout: [LayoutRowSchema],
    totalCapacity: { type: Number, required: true }
  },
  { timestamps: true }
);

ScreenSchema.index({ theatreId: 1 });

export const Screen = mongoose.model<IScreen>('Screen', ScreenSchema);
