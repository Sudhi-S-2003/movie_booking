/**
 * Code-level registry of every service the platform can offer.
 *
 * Adding a service = adding an entry here + mounting its routes behind
 * `requireService('<key>')`. On startup the registry is synced into the
 * `services` collection (missing entries inserted; admin-edited fields such
 * as price, status and description are never overwritten).
 *
 * Prices are integer micro-units of the platform currency
 * (1 INR = 1_000_000 micros) per `unitLabel`.
 */
export interface ServiceDefinition {
  key: string;
  name: string;
  description: string;
  category: 'security' | 'communication' | 'developer' | 'media' | 'commerce' | 'community' | 'integration';
  unitLabel: string;
  defaultBasePrice: number;
  /** Platform-direct users can enable it themselves without an assignment. */
  selfServe: boolean;
  sortOrder: number;
}

export const SERVICE_KEYS = {
  AUTH: 'auth',
  CHAT: 'chat',
  CHATBOT: 'chatbot',
  CODE_SHARE: 'code-share',
  CODE_SHARE_V2: 'code-share-v2',
  LINK_SHARE: 'link-share',
  SUPPORT: 'support',
  IMAGE: 'image',
  URL_PREVIEW: 'url-preview',
  MESSAGING: 'messaging-integrations',
  MOVIES: 'movies',
  SOCIAL: 'social',
} as const;
export type ServiceKey = (typeof SERVICE_KEYS)[keyof typeof SERVICE_KEYS];

const MICROS = 1_000_000;

export const SERVICE_REGISTRY: readonly ServiceDefinition[] = [
  { key: SERVICE_KEYS.AUTH, name: 'Authentication', category: 'security', unitLabel: 'verification', defaultBasePrice: 0.05 * MICROS, selfServe: true, sortOrder: 10,
    description: 'Captcha challenges, TOTP two-factor and passkey verification for your own apps through API keys.' },
  { key: SERVICE_KEYS.CHAT, name: 'Chat', category: 'communication', unitLabel: 'token', defaultBasePrice: 0.0007 * MICROS, selfServe: true, sortOrder: 20,
    description: 'Real-time conversations, groups, invites and embeddable guest chat via signed links.' },
  { key: SERVICE_KEYS.CHATBOT, name: 'Chatbot', category: 'communication', unitLabel: 'reply', defaultBasePrice: 0.01 * MICROS, selfServe: true, sortOrder: 30,
    description: 'Keyword, menu, form and flow driven chatbots attached to your conversations.' },
  { key: SERVICE_KEYS.CODE_SHARE, name: 'Code Share', category: 'developer', unitLabel: 'token', defaultBasePrice: 0.0005 * MICROS, selfServe: true, sortOrder: 40,
    description: 'Share single-file code snippets through signed, expiring links.' },
  { key: SERVICE_KEYS.CODE_SHARE_V2, name: 'Code Workspaces', category: 'developer', unitLabel: 'token', defaultBasePrice: 0.0005 * MICROS, selfServe: true, sortOrder: 50,
    description: 'Multi-file workspaces with commits, diffs, history and ZIP download.' },
  { key: SERVICE_KEYS.LINK_SHARE, name: 'Link Share', category: 'developer', unitLabel: 'link', defaultBasePrice: 0.02 * MICROS, selfServe: true, sortOrder: 60,
    description: 'Short public share links with owner-controlled lifetime.' },
  { key: SERVICE_KEYS.SUPPORT, name: 'Support Desk', category: 'communication', unitLabel: 'ticket', defaultBasePrice: 0, selfServe: true, sortOrder: 70,
    description: 'Ticketing with live replies, read receipts and guest tickets.' },
  { key: SERVICE_KEYS.IMAGE, name: 'Image Generator', category: 'media', unitLabel: 'image', defaultBasePrice: 0.002 * MICROS, selfServe: true, sortOrder: 80,
    description: 'Generated avatars and badges in PNG, JPEG, WebP or SVG.' },
  { key: SERVICE_KEYS.URL_PREVIEW, name: 'URL Preview', category: 'developer', unitLabel: 'preview', defaultBasePrice: 0.005 * MICROS, selfServe: true, sortOrder: 90,
    description: 'Fetch titles, descriptions and images for links (safe, cached fetcher).' },
  { key: SERVICE_KEYS.MESSAGING, name: 'Messaging Integrations', category: 'integration', unitLabel: 'event', defaultBasePrice: 0.01 * MICROS, selfServe: false, sortOrder: 100,
    description: 'Inbound webhooks from messaging providers (Telinfy) with signed endpoints.' },
  { key: SERVICE_KEYS.MOVIES, name: 'Movie Booking', category: 'commerce', unitLabel: 'booking', defaultBasePrice: 2 * MICROS, selfServe: true, sortOrder: 110,
    description: 'Movie catalog, theatres, screens, showtimes and seat booking.' },
  { key: SERVICE_KEYS.SOCIAL, name: 'Social', category: 'community', unitLabel: 'post', defaultBasePrice: 0, selfServe: true, sortOrder: 120,
    description: 'Profiles, posts, hashtags, comments, follows, reviews and bookmarks.' },
];

export const isKnownServiceKey = (key: string): key is ServiceKey =>
  SERVICE_REGISTRY.some((s) => s.key === key);
