import type { Types } from 'mongoose';
import {
  UserRole,
  AuthProvider,
  MovieStatus,
  SeatStatus,
  ShowFormat,
  PricingTier,
  MovieCertification,
  Language,
  IntegrationType,
} from '../constants/enums.js';


/**
 * RefId — the shape a Mongoose foreign-key field can take in application code.
 *
 * It's `ObjectId | string` because:
 *   - Mongoose stores ObjectIds, so documents coming OUT of queries have them.
 *   - Controllers often pass raw string IDs from req.params / req.body and
 *     Mongoose auto-casts on save.
 *   - Using this union everywhere lets schemas declare `ref` fields without
 *     `as any` casts while still allowing string assignment from callers.
 *
 * Compare with `.equals()` or `.toString()` — NEVER `===` — when you need
 * to match two RefIds, since one side may be an ObjectId and the other a string.
 */
export type RefId = Types.ObjectId | string;

/* ---------------- SEAT LAYOUT STRUCTURE ---------------- */

export interface ILayoutColumn {
  type: 'seat' | 'space';
  /** Seat number within the row (e.g. "1", "2"). Omitted for spacer columns. */
  name?: string;
  priceGroup?: PricingTier;
}

export interface ILayoutRow {
  type: 'row' | 'space';
  /** Row letter (A, B, C…). Omitted for spacer rows. */
  name?: string;
  columns: ILayoutColumn[];
}

/* ---------------- MODELS ---------------- */

export interface IUser {
  _id: RefId;
  name: string;
  username: string;
  email: string;
  password?: string;
  role: UserRole;
  authProvider: AuthProvider;
  avatar?: string;
  googleId?: string;
  /** Theatre IDs managed by TheatreOwner users. */
  managedTheatres?: RefId[];
  phoneNumber?: string;
  /** Profile page — short first-person bio, supports #hashtags and @mentions. */
  bio?: string;
  /** Banner image shown on the profile hero. */
  coverImageUrl?: string;
  location?: string;
  website?: string;
  pronouns?: string;
  /** Social handles (twitter, instagram, letterboxd, …). */
  socialLinks?: { platform: string; url: string }[];
  /** Denormalized counters kept in sync by follow/unfollow endpoints. */
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMovie {
  _id: RefId;
  title: string;
  description: string;
  trailerUrl: string;
  posterUrl: string;
  /** Background image shown on the movie details hero. */
  backdropUrl: string;
  genres: string[];
  /** Runtime in minutes. */
  duration: number;
  releaseDate: Date;
  showStatus: MovieStatus;
  certification: MovieCertification;
  language: Language;
  rating?: number;
  /** User IDs who marked themselves "interested" in this movie. */
  interestedUsers: RefId[];
  cast: { name: string; role: string; profileUrl?: string }[];
  crew: { name: string; job: string; profileUrl?: string }[];
  tags: string[];
  technicalSpecs?: string[];
  isTrending?: boolean;
}

export interface ITheatre {
  _id: RefId;
  name: string;
  city: string;
  address: string;
  /** Owning TheatreOwner user. */
  ownerId: RefId;
  location: {
    type: 'Point';
    /** [longitude, latitude] — GeoJSON order. */
    coordinates: [number, number];
  };
  /** e.g. ["Parking", "Cafe", "Food Court"] */
  amenities: string[];
  contactEmail?: string;
  contactPhone?: string;
  imageUrl?: string;
  backdropUrl?: string;
  tags: string[];
}

export interface IScreen {
  _id: RefId;
  theatreId: RefId;
  name: string;
  /** Dynamic layout defined on the admin screen editor. */
  layout: ILayoutRow[];
  totalCapacity: number;
}

export interface IShowtime {
  _id: RefId;
  movieId: RefId;
  /** Denormalized for faster city-based queries. */
  theatreId: RefId;
  screenId: RefId;
  startTime: Date;
  endTime: Date;
  format: ShowFormat;
  isActive: boolean;
  pricingOverrides?: {
    tier: PricingTier;
    price: number;
  }[];
}

export interface ISeatReservation {
  _id: RefId;
  showtimeId: RefId;
  userId: RefId;
  /** Composite "RowName-SeatName" (e.g. "A-10"). */
  seatId: string;
  status: SeatStatus;
  /** TTL index expiry. */
  expiresAt: Date;
  transactionId?: string;
  price: number;
}

export interface IWatchlist {
  _id: RefId;
  userId: RefId;
  movieId: RefId;
  createdAt: Date;
}

/** Entity a review can target — polymorphic via refPath. */
export type ReviewTargetType = 'Movie' | 'Theatre';

export interface IReview {
  _id: RefId;
  userId:     RefId;
  targetId:   RefId;
  targetType: ReviewTargetType;
  rating:     number;
  comment:    string;
  createdAt:  Date;
  updatedAt:  Date;
}

export interface IIntegration {
  _id: RefId;
  userId: RefId;
  type: IntegrationType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

