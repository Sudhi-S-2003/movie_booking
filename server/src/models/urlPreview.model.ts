import mongoose, { Schema } from 'mongoose';
import type { IUrlPreview } from '../interfaces/models.interface.js';

const UrlPreviewSchema = new Schema<IUrlPreview>(
  {
    url: { 
      type: String, 
      required: true, 
      unique: true, 
      index: true 
    },
    title: { type: String },
    description: { type: String },
    image: { type: String },
    siteName: { type: String },
    favIcon: { type: String },
    expiresAt: { 
      type: Date, 
      required: true, 
      index: { expires: 0 } // TTL index: documents expire at the value of expiresAt
    },
  },
  { timestamps: true }
);

export const UrlPreview = mongoose.model<IUrlPreview>('UrlPreview', UrlPreviewSchema);
