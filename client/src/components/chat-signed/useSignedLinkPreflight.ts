import { useEffect, useState } from 'react';
import { chatApi } from '../../services/api/chat.api.js';
import { ApiError } from '../../services/api/http.js';
import type { SignedLinkErrorKind } from './SignedLinkError.js';

export type PreflightState =
  | { status: 'loading' }
  | { status: 'ok' }
  | { status: 'error'; kind: SignedLinkErrorKind; detail: string | null };

interface PreflightArgs {
  /** Conversation id from the URL (`/chat/:id`). */
  conversationId: string | null;
  /** HMAC signature from the `?signature=` query param. */
  signature:      string | null;
  /** Expiry timestamp (ms epoch) from the `?expiresAt=` query param. */
  expiresAt:      string | null;
}

/**
 * Validate a signed chat URL before mounting the chat UI.
 *
 *   1. Client-side: reject missing or already-expired `expiresAt` without
 *      even hitting the network. This is purely UX — the server still has
 *      the authoritative HMAC + timestamp check.
 *   2. Server-side: call `chatApi.getGuestConversation` as the canonical
 *      preflight. A 401 is the signature path (bad sig OR past expiry);
 *      a 404 is "conversation not found"; anything else is generic.
 *
 * Maps every failure mode onto a `SignedLinkErrorKind` so the caller can
 * render one deterministic error screen.
 */
export const useSignedLinkPreflight = ({
  conversationId,
  signature,
  expiresAt,
}: PreflightArgs): PreflightState => {
  const [state, setState] = useState<PreflightState>({ status: 'loading' });

  useEffect(() => {
    if (!conversationId || !signature || !expiresAt) {
      setState({
        status: 'error',
        kind:   'invalid',
        detail: 'Signed URL is missing required query parameters.',
      });
      return;
    }

    // Cheap client-side expiry check — avoids a guaranteed-failing network
    // call when the link is already stale.
    const expiresAtMs = Number(expiresAt);
    if (!Number.isFinite(expiresAtMs)) {
      setState({ status: 'error', kind: 'invalid', detail: 'expiresAt is not a valid number.' });
      return;
    }
    if (expiresAtMs <= Date.now()) {
      setState({ status: 'error', kind: 'expired', detail: null });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    (async () => {
      try {
        await chatApi.getGuestConversation(conversationId, { signature, expiresAt });
        if (!cancelled) setState({ status: 'ok' });
      } catch (e: unknown) {
        if (cancelled) return;
        setState(classify(e));
      }
    })();

    return () => { cancelled = true; };
  }, [conversationId, signature, expiresAt]);

  return state;
};

// ── Error classification ────────────────────────────────────────────────────

const classify = (e: unknown): Extract<PreflightState, { status: 'error' }> => {
  if (e instanceof ApiError) {
    const detail = e.message || null;
    // The signature middleware responds 401 for both bad-hmac and past-ttl.
    // Past-ttl would already be caught by the client-side check above, so a
    // 401 reaching here almost always means "invalid signature". Still,
    // surface the server message verbatim for debugging.
    if (e.status === 401) return { status: 'error', kind: 'invalid',   detail };
    if (e.status === 404) return { status: 'error', kind: 'not-found', detail };
    return { status: 'error', kind: 'generic', detail };
  }
  return {
    status: 'error',
    kind:   'generic',
    detail: e instanceof Error ? e.message : null,
  };
};
