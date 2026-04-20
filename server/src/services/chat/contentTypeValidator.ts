// ─────────────────────────────────────────────────────────────────────────────
// contentTypeValidator
//
// Server-side dispatch for the chat-message taxonomy. Shared by
// `sendMessage` (authenticated) and `sendGuestMessage` (signed URL) so both
// endpoints produce identical validation errors and persisted shape.
//
// Exports:
//   • validateIncomingMessage(body) — normalize + validate the raw request body
//   • buildPreviewText(msg)         — compute the sidebar preview snippet
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ChatContentType,
  ChatContactPayload,
  ChatLocationPayload,
  ChatDatePayload,
  ChatEventPayload,
} from '../../models/chat.model.js';

type ValidationReason =
  | 'missing_emoji'
  | 'invalid_contact'
  | 'invalid_location'
  | 'invalid_date'
  | 'invalid_event'
  | 'mixed_payload'
  | 'empty_text'
  | 'invalid_type';

interface NormalizedMessage {
  contentType: ChatContentType;
  text:        string;
  emoji?:      string;
  contact?:    ChatContactPayload;
  location?:   ChatLocationPayload;
  date?:       ChatDatePayload;
  event?:      ChatEventPayload;
  attachments: string[];
  replyTo?: {
    messageId:  string;
    senderName: string;
    text:       string;
  };
}

type ValidateResult =
  | { ok: true; message: NormalizedMessage }
  | { ok: false; reason: ValidationReason; detail?: string };

interface RawBody {
  text?:        unknown;
  contentType?: unknown;
  emoji?:       unknown;
  contact?:     unknown;
  location?:    unknown;
  date?:        unknown;
  event?:       unknown;
  attachments?: unknown;
  replyTo?:     unknown;
}

const ALLOWED_TYPES: ChatContentType[] = [
  'text', 'emoji', 'contact', 'location', 'image', 'file', 'system',
  'date', 'event',
];

// Grapheme-aware "is the whole string exactly one visible unit?" check. Used
// for the optional emoji auto-promotion — see `sendMessage` controllers.
const isSingleEmoji = (raw: string): boolean => {
  const trimmed = raw.trim();
  // `.length` is UTF-16 code units, not graphemes. A ZWJ sequence like
  // 👨‍👩‍👧‍👦 is 11 code units; flag/keycap/skin-tone chains can go higher.
  // Cap at 64 as a sanity guard — the Intl.Segmenter below is the real gate.
  if (!trimmed || trimmed.length > 64) return false;
  if (/[\u0000-\u007F]/.test(trimmed)) return false;
  try {
    const Seg = (Intl as unknown as {
      Segmenter?: new (locale?: string, opts?: { granularity: string }) => {
        segment: (s: string) => Iterable<{ segment: string }>;
      };
    }).Segmenter;
    if (!Seg) return false;
    const seg = new Seg('en', { granularity: 'grapheme' });
    let count = 0;
    for (const _ of seg.segment(trimmed)) {
      count += 1;
      if (count > 1) return false;
    }
    return count === 1;
  } catch {
    return false;
  }
};

const parseContact = (raw: unknown): ChatContactPayload | null => {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const phone = typeof r.phone === 'string' ? r.phone.trim() : '';
  const countryCode = typeof r.countryCode === 'string' ? r.countryCode.trim() : '';
  if (phone.length < 3 || phone.length > 20) return null;
  if (!/^\+\d{1,4}$/.test(countryCode)) return null;
  const out: ChatContactPayload = { phone, countryCode };
  if (typeof r.name === 'string' && r.name.trim()) out.name = r.name.trim().slice(0, 120);
  return out;
};

const parseLocation = (raw: unknown): ChatLocationPayload | null => {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const lat = typeof r.lat === 'number' ? r.lat : Number.NaN;
  const lng = typeof r.lng === 'number' ? r.lng : Number.NaN;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return null;
  const out: ChatLocationPayload = { lat, lng };
  if (typeof r.label === 'string' && r.label.trim()) out.label = r.label.trim().slice(0, 120);
  return out;
};

const parseDate = (raw: unknown): ChatDatePayload | null => {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const iso = typeof r.iso === 'string' ? r.iso.trim() : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  // Parse as a real date — rejects things like 2026-02-31.
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const test = new Date(Date.UTC(y, m - 1, d));
  if (
    test.getUTCFullYear() !== y ||
    test.getUTCMonth() !== m - 1 ||
    test.getUTCDate() !== d
  ) return null;
  const out: ChatDatePayload = { iso };
  if (typeof r.label === 'string' && r.label.trim()) out.label = r.label.trim().slice(0, 120);
  return out;
};

const parseEvent = (raw: unknown): ChatEventPayload | null => {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const title = typeof r.title === 'string' ? r.title.trim() : '';
  if (title.length < 1 || title.length > 120) return null;
  const startsAt = typeof r.startsAt === 'string' ? r.startsAt.trim() : '';
  const startDate = Date.parse(startsAt);
  if (!startsAt || Number.isNaN(startDate)) return null;
  const out: ChatEventPayload = { title, startsAt };
  if (typeof r.endsAt === 'string' && r.endsAt.trim()) {
    const endsAt = r.endsAt.trim();
    const endDate = Date.parse(endsAt);
    if (Number.isNaN(endDate) || endDate < startDate) return null;
    out.endsAt = endsAt;
  }
  if (typeof r.location === 'string' && r.location.trim()) {
    const loc = r.location.trim();
    if (loc.length > 200) return null;
    out.location = loc;
  }
  if (typeof r.description === 'string' && r.description.trim()) {
    const desc = r.description.trim();
    if (desc.length > 500) return null;
    out.description = desc;
  }
  return out;
};

const parseReplyTo = (raw: unknown): NormalizedMessage['replyTo'] | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r.messageId !== 'string' || typeof r.senderName !== 'string') return undefined;
  return {
    messageId:  r.messageId,
    senderName: r.senderName,
    text:       typeof r.text === 'string' ? r.text.slice(0, 200) : '',
  };
};

/**
 * Normalize + validate a raw send-message body. On success, returns the exact
 * fields that should be written to the DB. On failure, returns a `reason`
 * code the caller surfaces as `400 { reason }`.
 */
export const validateIncomingMessage = (body: RawBody): ValidateResult => {
  const typeRaw = typeof body.contentType === 'string' ? body.contentType : 'text';
  if (!ALLOWED_TYPES.includes(typeRaw as ChatContentType)) {
    return { ok: false, reason: 'invalid_type' };
  }
  const contentType = typeRaw as ChatContentType;

  const text = typeof body.text === 'string' ? body.text : '';
  const attachments = Array.isArray(body.attachments)
    ? body.attachments.filter((x): x is string => typeof x === 'string')
    : [];
  const replyTo = parseReplyTo(body.replyTo);

  const hasEmoji    = typeof body.emoji === 'string' && body.emoji.length > 0;
  const hasContact  = !!body.contact  && typeof body.contact  === 'object';
  const hasLocation = !!body.location && typeof body.location === 'object';
  const hasDate     = !!body.date     && typeof body.date     === 'object';
  const hasEvent    = !!body.event    && typeof body.event    === 'object';

  const anyExtraExcept = (keep: 'emoji' | 'contact' | 'location' | 'date' | 'event' | null): boolean => {
    if (keep !== 'emoji'    && hasEmoji)    return true;
    if (keep !== 'contact'  && hasContact)  return true;
    if (keep !== 'location' && hasLocation) return true;
    if (keep !== 'date'     && hasDate)     return true;
    if (keep !== 'event'    && hasEvent)    return true;
    return false;
  };

  if (contentType === 'text') {
    if (anyExtraExcept(null)) return { ok: false, reason: 'mixed_payload' };
    if (!text.trim()) return { ok: false, reason: 'empty_text' };
    const normalized: NormalizedMessage = {
      contentType,
      text: text.trim(),
      attachments,
    };
    if (replyTo) normalized.replyTo = replyTo;

    if (isSingleEmoji(text)) {
      normalized.contentType = 'emoji';
      normalized.emoji = text.trim();
    }
    return { ok: true, message: normalized };
  }

  if (contentType === 'emoji') {
    if (anyExtraExcept('emoji')) return { ok: false, reason: 'mixed_payload' };
    const emoji = typeof body.emoji === 'string' ? body.emoji.trim() : '';
    if (emoji.length < 1 || emoji.length > 8) return { ok: false, reason: 'missing_emoji' };
    const normalized: NormalizedMessage = {
      contentType,
      emoji,
      text: emoji,
      attachments,
    };
    if (replyTo) normalized.replyTo = replyTo;
    return { ok: true, message: normalized };
  }

  if (contentType === 'contact') {
    if (anyExtraExcept('contact')) return { ok: false, reason: 'mixed_payload' };
    const contact = parseContact(body.contact);
    if (!contact) return { ok: false, reason: 'invalid_contact' };
    const caption = text.trim();
    const normalized: NormalizedMessage = {
      contentType,
      contact,
      text: caption || buildPreviewForContact(contact),
      attachments,
    };
    if (replyTo) normalized.replyTo = replyTo;
    return { ok: true, message: normalized };
  }

  if (contentType === 'location') {
    if (anyExtraExcept('location')) return { ok: false, reason: 'mixed_payload' };
    const location = parseLocation(body.location);
    if (!location) return { ok: false, reason: 'invalid_location' };
    const caption = text.trim();
    const normalized: NormalizedMessage = {
      contentType,
      location,
      text: caption || buildPreviewForLocation(),
      attachments,
    };
    if (replyTo) normalized.replyTo = replyTo;
    return { ok: true, message: normalized };
  }

  if (contentType === 'date') {
    if (anyExtraExcept('date')) return { ok: false, reason: 'mixed_payload' };
    const date = parseDate(body.date);
    if (!date) return { ok: false, reason: 'invalid_date' };
    const caption = text.trim();
    const normalized: NormalizedMessage = {
      contentType,
      date,
      text: caption || buildPreviewForDate(date),
      attachments,
    };
    if (replyTo) normalized.replyTo = replyTo;
    return { ok: true, message: normalized };
  }

  if (contentType === 'event') {
    if (anyExtraExcept('event')) return { ok: false, reason: 'mixed_payload' };
    const event = parseEvent(body.event);
    if (!event) return { ok: false, reason: 'invalid_event' };
    const caption = text.trim();
    const normalized: NormalizedMessage = {
      contentType,
      event,
      text: caption || buildPreviewForEvent(event),
      attachments,
    };
    if (replyTo) normalized.replyTo = replyTo;
    return { ok: true, message: normalized };
  }

  // image / file / system — fall through, no new payload fields.
  if (anyExtraExcept(null)) return { ok: false, reason: 'mixed_payload' };
  const normalized: NormalizedMessage = {
    contentType,
    text: text.trim(),
    attachments,
  };
  if (replyTo) normalized.replyTo = replyTo;
  return { ok: true, message: normalized };
};

// ── Preview text ────────────────────────────────────────────────────────────

const buildPreviewForContact = (c: ChatContactPayload): string => {
  const who = (c.name && c.name.trim()) || `${c.countryCode} ${c.phone}`;
  return `📇 Contact: ${who}`;
};

const buildPreviewForLocation = (): string => '📍 Location shared';

const formatDateShort = (iso: string): string => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
};

const buildPreviewForDate = (d: ChatDatePayload): string =>
  `📅 ${d.label || formatDateShort(d.iso)}`;

const buildPreviewForEvent = (e: ChatEventPayload): string =>
  `🗓 ${e.title} · ${formatDateShort(e.startsAt)}`;

/**
 * Compute the sidebar `lastMessageText` snippet (≤100 chars). Dispatches on
 * message type so non-text messages render recognizably in the list without
 * leaking raw payload internals.
 */
export const buildPreviewText = (msg: {
  contentType: ChatContentType;
  text:        string;
  emoji?:      string;
  contact?:    ChatContactPayload;
  location?:   ChatLocationPayload;
  date?:       ChatDatePayload;
  event?:      ChatEventPayload;
}): string => {
  switch (msg.contentType) {
    case 'emoji':    return (msg.emoji || msg.text || '').slice(0, 100);
    case 'contact':  return msg.contact ? buildPreviewForContact(msg.contact).slice(0, 100) : '📇 Contact';
    case 'location': return buildPreviewForLocation();
    case 'image':    return '📷 Photo';
    case 'file':     return '📎 File';
    case 'date':     return msg.date  ? buildPreviewForDate(msg.date).slice(0, 100)   : '📅 Date';
    case 'event':    return msg.event ? buildPreviewForEvent(msg.event).slice(0, 100) : '🗓 Event';
    case 'system':
    case 'text':
    default:
      return (msg.text || '').slice(0, 100);
  }
};
