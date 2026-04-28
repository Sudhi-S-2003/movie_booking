
import type {
  ID,
  Issue,
  IssueMessage,
  IssuePriority,
  IssueStatus,
  Movie,
  PublicUser,
  Review,
  ReviewTargetType,
  ISODateString,
  Screen,
  SeatReservation,
  Showtime,
  Theatre,
  User,
  UserStats,
} from './models.js';


export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorResponse;

export interface Pagination {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export interface PaginatedEnvelope<T> {
  items: T[];
  pagination: Pagination;
}


export interface AuthUserPayload {
  id: ID;
  name: string;
  username: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUserPayload;
}
export type RegisterResponse = LoginResponse;

export interface MeResponse {
  user: User;
}


export interface MoviesListQuery {
  page?: number;
  limit?: number;
  status?: string;
  genre?: string;
  search?: string;
  q?: string;
  minimal?: boolean;
}

export interface MoviesListResponse {
  movies: Movie[];
  pagination: Pagination;
}

export interface MovieResponse {
  movie: Movie & {
    isInterested?: boolean;
    isWatchlisted?: boolean;
  };
}

export interface ToggleInterestResponse {
  interestedUsers: ID[];
  isInterested: boolean;
}


export interface ShowtimeReservationLite {
  seatId: string;
  status: 'locked' | 'booked';
  expiresAt?: ISODateString;
}

export interface ShowtimeDetailsResponse {
  showtime: Showtime;
  reservations: ShowtimeReservationLite[];
}

export interface ShowtimesListResponse {
  showtimes:   Showtime[];
  pagination?: Pagination;
}

export interface LockSeatResponse {
  reservation?: SeatReservation;
  reservations?: SeatReservation[];
}

export interface UnlockSeatResponse {
  message: string;
  unlockedCount: number;
}

export interface ConfirmBookingResponse {
  message: string;
}

export interface MyBookingsResponse {
  bookings: SeatReservation[];
  pagination: Pagination;
}


export interface TheatresListResponse {
  theatres:    Theatre[];
  pagination?: Pagination;
}
/** The details endpoint now returns ONLY the theatre — reviews live at their own endpoint. */
export interface TheatreResponseOnly {
  theatre: Theatre;
}


export interface CreateReviewBody {
  targetId: ID;
  targetType: ReviewTargetType;
  rating: number;
  comment: string;
}
export interface ReviewResponse {
  review: Review;
}
export interface ReviewsListQuery {
  page?: number;
  limit?: number;
  sort?: 'newest' | 'highest' | 'lowest';
}

export interface ReviewBreakdownItem {
  _id: number;
  count: number;
}

export interface ReviewsListResponse {
  reviews: Review[];
  pagination?: Pagination;
  stats?: {
    averageRating: number;
    totalReviews: number;
    breakdown: ReviewBreakdownItem[];
  };
}


export interface WatchlistToggleResponse {
  added: boolean;
  message: string;
}
export interface WatchlistListResponse {
  watchlist: Movie[];
  pagination: Pagination;
}
export interface WatchlistStatusResponse {
  isWatchlisted: boolean;
}
export interface UsersListResponse {
  users: User[];
  pagination: Pagination;
}
export interface UserDetailsResponse {
  user: PublicUser & { stats: UserStats };
}


export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
}

export interface ConfirmPaymentResponse {
  status: string;
  transactionId: string;
}

export interface PaymentStatusResponse {
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
  transactionId?: string;
  createdAt: ISODateString;
}

export interface PaymentMethodInput {
  type: 'card' | 'upi' | 'netbanking' | 'wallet';
  card?: {
    number: string;
    expMonth: number;
    expYear: number;
    cvc: string;
  };
  upiId?: string;
  bank?: string;
}


export interface ScreensListResponse {
  screens: Screen[];
  pagination?: Pagination;
}
export interface ScreenResponse {
  screen: Screen;
}
export interface TheatreResponse {
  theatre: Theatre;
}
export interface ShowtimeResponse {
  showtime: Showtime;
}


export interface SearchPrimaryMatch {
  type: 'movie' | 'theatre' | 'hashtag' | 'user';
  data: unknown;
  redirectUrl?: string;
}

export interface SearchResponse {
  primaryMatch?: SearchPrimaryMatch;
  results: {
    movies: Movie[];
    theatres: Theatre[];
    issues: Issue[];
  };
}


export interface CreateIssueBody {
  category: string;
  title: string;
  description: string;
  priority: IssuePriority | string;
  metadata?: Record<string, unknown>;
  guestInfo?: { name?: string; email?: string; phone?: string };
}

export interface IssueResponse {
  issue: Issue;
}

export interface IssuesListQuery {
  page?: number;
  limit?: number;
  status?: IssueStatus;
  priority?: IssuePriority;
  category?: string;
}

export interface IssuesListResponse {
  issues: Issue[];
  pagination: Pagination;
}

export interface IssueMessagesQuery {
  before?: string;
  after?: string;
  around?: string;
  anchor?: string;
  limit?: number;
}

export interface IssueMessagesResponse {
  messages:    IssueMessage[];
  hasBefore:    boolean;
  hasAfter:    boolean;
  beforeCursor: string | null;
  afterCursor: string | null;
  targetIndex?: number;
}

export interface IssueReplyBody {
  text: string;
  replyTo?: {
    messageId: ID;
    senderName: string;
    text: string;
  };
}
export interface IssueReplyResponse {
  message: IssueMessage;
}

export interface IssueReadResponse {
  updated: number;
}

export interface IssueUnreadCountsResponse {
  counts: Record<ID, number>;
  lastReadMap: Record<ID, ISODateString>;
}

export interface IssueStatusUpdateResponse {
  message: string;
}
