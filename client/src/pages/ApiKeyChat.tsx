import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ChatPage } from '@/components/chat/ChatPage.js';
import { SEO } from '../components/common/SEO.js';
import { useIframeBridge } from '@/components/chat/hooks/useIframeBridge.js';
import {
  SignedLinkError,
  useSignedLinkPreflight,
} from '@/components/chat-signed/index.js';
import { SubscriptionProvider } from '@/components/chat/hooks/useSubscription.js';

/**
 * Signed-URL guest chat route (`/chat/:conversationId?signature=…&expiresAt=…`).
 *
 * Runs a preflight validation BEFORE mounting the full ChatPage so that
 * expired / tampered links fall onto a dedicated error page instead of a
 * broken empty chat UI. Flow:
 *
 *   1. `useSignedLinkPreflight` checks the URL params client-side (missing
 *      fields / past `expiresAt`) and then hits `GET /public/chat/conversation/:id`
 *      with the signature to get the server's verdict.
 *   2. While validating → loading spinner.
 *   3. On failure → SignedLinkError with kind = 'expired' | 'invalid' |
 *      'not-found' | 'generic'.
 *   4. On success → full ChatPage in guest mode. The postMessage bridge
 *      also emits `chat:ready` / `chat:close` for iframe embedders.
 */
export const ApiKeyChat = () => {

  const { conversationId = '' } = useParams<{ conversationId: string }>();
  const [searchParams] = useSearchParams();

  const signature = searchParams.get('signature');
  const expiresAt = searchParams.get('expiresAt');

  const preflight = useSignedLinkPreflight({
    conversationId: conversationId || null,
    signature,
    expiresAt,
  });

  const guestSession = useMemo(
    () => (signature && expiresAt ? { signature, expiresAt } : undefined),
    [signature, expiresAt],
  );

  // `chat:ready` on mount, `chat:close` on unmount.
  useIframeBridge();

  if (preflight.status === 'loading') return <PreflightLoading />;
  if (preflight.status === 'error') {
    return <SignedLinkError kind={preflight.kind} detail={preflight.detail} />;
  }

  // Re-mount the subscription provider in guest mode so the header pill
  // reads from the signature-authenticated endpoint (the API-key owner's
  // pool) instead of the JWT-gated `/api/subscription`. The outer provider
  // in App.tsx is eclipsed by this inner one for the subtree.
  const inner = (
    <>
      <SEO title="Secure Chat" description="Participate in a secure conversation via signed link." />
      <ChatPage guestSession={guestSession} />
    </>
  );
  if (!guestSession) return inner;
  return (
    <SubscriptionProvider
      guest={{
        signature:      guestSession.signature,
        expiresAt:      guestSession.expiresAt,
        conversationId: conversationId,
      }}
    >
      {inner}
    </SubscriptionProvider>
  );
};

// ── Loading state ───────────────────────────────────────────────────────────

const PreflightLoading = () => (
  <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-white/15 border-t-white/60 rounded-full animate-spin" />
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-semibold">
        Verifying link
      </p>
    </div>
  </div>
);
