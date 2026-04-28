import mongoose, { Schema } from 'mongoose';
import type { ITheatre } from '../interfaces/models.interface.js';

const TheatreSchema = new Schema<ITheatre>(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, lowercase: true, trim: true },
    address: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
    amenities: [{ type: String }],
    contactEmail: { type: String, lowercase: true, trim: true },
    contactPhone: { type: String },
    imageUrl: { type: String },
    backdropUrl: { type: String },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

// Geo-spatial index for finding nearby theatres
TheatreSchema.index({ location: '2dsphere' });
// Index city for fast filtering
TheatreSchema.index({ city: 1 });
// Full-text search index for name, city, and tags
TheatreSchema.index({ name: 'text', city: 'text', tags: 'text' });

export const Theatre = mongoose.model<ITheatre>('Theatre', TheatreSchema);
