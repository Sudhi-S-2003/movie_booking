import mongoose, { Schema } from 'mongoose';
import type { IMovie } from '../interfaces/models.interface.js';
import { MovieStatus, MovieCertification, Language } from '../constants/enums.js';

const MovieSchema = new Schema<IMovie>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    trailerUrl: { type: String, required: true },
    posterUrl: { type: String, required: true },
    backdropUrl: { type: String, required: true },
    genres: [{ type: String }],
    duration: { type: Number, required: true }, // in minutes
    releaseDate: { type: Date, required: true },
    showStatus: { 
      type: String, 
      enum: Object.values(MovieStatus), 
      default: MovieStatus.NOW_SHOWING 
    },
    certification: { 
      type: String, 
      enum: Object.values(MovieCertification), 
      default: MovieCertification.UA 
    },
    language: { 
      type: String, 
      enum: Object.values(Language), 
      required: true 
    },
    rating: { type: Number, min: 0, max: 10, default: 0 },
    interestedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    cast: [
      {
        name: { type: String, required: true },
        role: { type: String, required: true },
        profileUrl: { type: String }
      }
    ],
    crew: [
      {
        name: { type: String, required: true },
        job: { type: String, required: true },
        profileUrl: { type: String }
      }
    ],
    tags: [{ type: String }]
  },
  { timestamps: true }
);

// Search indexing
MovieSchema.index({ title: 'text', genres: 'text', tags: 'text' }, { language_override: 'dummy' });

// Sort/filter indexes used by listing endpoints
MovieSchema.index({ showStatus: 1, releaseDate: -1 });
MovieSchema.index({ releaseDate: -1 });
MovieSchema.index({ language: 1, showStatus: 1 });

export const Movie = mongoose.model<IMovie>('Movie', MovieSchema);
