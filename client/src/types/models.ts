
import type {
  UserRole,
  AuthProvider,
  MovieStatus,
  SeatStatus,
  ShowFormat,
  PricingTier,
} from '../constants/enums.js';

export type ID = string;
export type ISODateString = string;


export interface LayoutColumn {
  type: 'seat' | 'space';
  name?: string;
  priceGroup?: PricingTier;
}

export interface LayoutRow {
  type: 'row' | 'space';
  name?: string;
  columns?: LayoutColumn[];
}


export interface User {
  _id: ID;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  authProvider: AuthProvider;
  avatar?: string;
  phoneNumber?: string;
  managedTheatres?: ID[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type PublicUser = Omit<User, 'email' | 'phoneNumber'> & {
  email?: string;
  phoneNumber?: string;
  stats?: UserStats;
};

export interface UserStats {
  bookings: number;
  reviews: number;
  watchlist: number;
  issues: number;
}


export interface MovieCastMember {
  name: string;
  role: string;
  profileUrl?: string;
}
export interface MovieCrewMember {
  name: string;
  job: string;
  profileUrl?: string;
}

export interface Movie {
  _id: ID;
  title: string;
  description: string;
  trailerUrl: string;
  posterUrl: string;
  backdropUrl: string;
  genres: string[];
  duration: number;
  releaseDate: ISODateString;
  showStatus: MovieStatus;
  certification: string;
  language: string;
  rating?: number;
  interestedUsers: ID[];
  cast: MovieCastMember[];
  crew: MovieCrewMember[];
  tags: string[];
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
}


export interface Theatre {
  _id: ID;
  name: string;
  city: string;
  address: string;
  ownerId: ID;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  amenities: string[];
  contactEmail?: string;
  contactPhone?: string;
  tags: string[];
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
}


export interface Screen {
  _id: ID;
  theatreId: ID;
  name: string;
  layout: LayoutRow[];
  totalCapacity: number;
}


export interface PricingOverride {
  tier: PricingTier;
  price: number;
}

export interface Showtime {
  _id: ID;
  movieId: ID | Movie;
  theatreId: ID | Theatre;
  screenId: ID | Screen;
  startTime: ISODateString;
  endTime: ISODateString;
  format: ShowFormat;
  pricingOverrides?: PricingOverride[];
}


export interface SeatReservation {
  _id: ID;
  showtimeId: ID;
  userId: ID;
  seatId: string;
  status: SeatStatus;
  expiresAt: ISODateString;
  transactionId?: string;
  price: number;
}


export interface WatchlistItem {
  _id: ID;
  userId: ID;
  movieId: ID | Movie;
  createdAt: ISODateString;
}


export type ReviewTargetType = 'Movie' | 'Theatre';

export interface Review {
  _id: ID;
  userId: ID | Pick<User, '_id' | 'name' | 'avatar'>;
  targetId: ID;
  targetType: ReviewTargetType;
  rating: number;
  comment: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}


export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface IssueReply {
  messageId: ID;
  senderName: string;
  text: string;
}

export interface IssueMessage {
  _id: ID;
  issueId: ID;
  senderId: ID | null;
  senderName: string;
  senderRole?: string;
  text: string;
  replyTo?: IssueReply;
  createdAt: ISODateString;
  isYou?: boolean;
  deliveryStatus?: 'sent' | 'delivered' | 'read';
}

export interface Issue {
  _id: ID;
  userId: ID | null;
  category: string;
  title: string;
  description: string;
  priority: IssuePriority;
  status: IssueStatus;
  unreadCount?: number;
  lastMessageAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
