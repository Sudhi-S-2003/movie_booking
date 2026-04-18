import React from 'react';
import { AlertTriangle, Clock, Link2Off, MessageSquareOff } from 'lucide-react';

export type SignedLinkErrorKind =
  | 'expired'        // `expiresAt` is in the past
  | 'invalid'        // signature mismatch, tampered URL, or bad HMAC
  | 'not-found'      // conversation doesn't exist (deleted?)
  | 'generic';       // fallback — network error, 5xx, unknown

interface SignedLinkErrorProps {
  kind:    SignedLinkErrorKind;
  /** Server-supplied message (optional). Shown as small detail text. */
  detail?: string | null;
}

/**
 * Terminal UI for a signed-URL chat that can't be opened. Kept deliberately
 * minimal (no links back into the app, no "retry" button) because the guest
 * user is anonymous — the only valid action is to ask whoever sent them the
 * link to generate a fresh one.
 */
export const SignedLinkError: React.FC<SignedLinkErrorProps> = ({ kind, detail }) => {
  const { Icon, title, message, tone } = presentationFor(kind);

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div
          className={`mx-auto w-20 h-20 rounded-3xl border flex items-center justify-center ${tone.bg} ${tone.border} ${tone.text}`}
        >
          <Icon size={36} strokeWidth={1.75} />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-black tracking-tight">{title}</h1>
          <p className="text-[13px] leading-relaxed text-white/60">{message}</p>
          {detail && (
            <p className="text-[10px] text-white/25 font-mono mt-3 px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded-md inline-block">
              {detail}
            </p>
          )}
        </div>

        <p className="text-[10px] uppercase tracking-[0.3em] text-white/25">
          Ask for a new link to continue
        </p>
      </div>
    </div>
  );
};

// ── Presentation ────────────────────────────────────────────────────────────

interface Presentation {
  Icon:    React.ComponentType<{ size?: number; strokeWidth?: number }>;
  title:   string;
  message: string;
  tone:    { bg: string; border: string; text: string };
}

const presentationFor = (kind: SignedLinkErrorKind): Presentation => {
  switch (kind) {
    case 'expired':
      return {
        Icon:    Clock,
        title:   'This link has expired',
        message:
          'Signed chat links stay valid for a few minutes for security. ' +
          'Ask the person who sent you this link to generate a new one.',
        tone: {
          bg:     'bg-amber-500/10',
          border: 'border-amber-500/25',
          text:   'text-amber-300',
        },
      };

    case 'invalid':
      return {
        Icon:    Link2Off,
        title:   'Invalid chat link',
        message:
          'The signature on this URL doesn\'t match. It may have been edited, ' +
          'or it was generated for a different conversation.',
        tone: {
          bg:     'bg-rose-500/10',
          border: 'border-rose-500/25',
          text:   'text-rose-300',
        },
      };

    case 'not-found':
      return {
        Icon:    MessageSquareOff,
        title:   'Conversation not available',
        message:
          'The conversation this link points to has been removed or archived.',
        tone: {
          bg:     'bg-gray-500/10',
          border: 'border-gray-500/25',
          text:   'text-gray-300',
        },
      };

    case 'generic':
    default:
      return {
        Icon:    AlertTriangle,
        title:   'Couldn\'t open this chat',
        message:
          'Something went wrong while validating the link. Check your ' +
          'connection and try again; if it keeps happening, request a new link.',
        tone: {
          bg:     'bg-rose-500/10',
          border: 'border-rose-500/25',
          text:   'text-rose-300',
        },
      };
  }
};
