import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  subscriptionApi,
  type SubscriptionInfo,
  type TokenRemaining,
  type SubscriptionPlan,
} from '../../../services/api/index.js';
import { chatListSocket } from '../../../services/socket/chat/list.socket.js';
import { useAuthStore } from '../../../store/authStore.js';

export interface UseSubscription {
  sub:        SubscriptionInfo | null;
  remaining:  TokenRemaining | null;
  plan:       SubscriptionPlan;
  loading:    boolean;
  /**
   * True when the provider is serving a signed-URL guest viewer. Consumers
   * use this to hide "Manage plan" affordances (the guest cannot visit
   * `/subscription` — it's protected and they have no JWT).
   */
  isGuest:    boolean;
  /** Merge a freshly-received token bundle (e.g. from sendMessage response). */
  merge:      (payload: { plan: SubscriptionPlan; remaining: TokenRemaining }) => void;
  refresh:    () => Promise<void>;
}

// ── Context ─────────────────────────────────────────────────────────────────

const SubscriptionContext = createContext<UseSubscription | null>(null);

/**
 * Guest consumer configuration.
 *
 * When provided, the provider fetches from the signature-authenticated
 * `/api/public/chat/conversation/:id/subscription` endpoint (which returns
 * the API-key owner's remaining tokens) instead of `/api/subscription`
 * (which requires a JWT the guest doesn't hold).
 */
export interface SubscriptionGuestConfig {
  signature:      string;
  expiresAt:      string;
  conversationId: string;
}

/**
 * Subscription state consumed by the chat header pill, the Subscription page,
 * and any future per-feature gate. Single state container at the provider —
 * that's what makes the sendMessage → merge() → badge update flow work
 * *across components* without a round-trip.
 */
export const SubscriptionProvider = ({
  children,
  guest,
}: {
  children: ReactNode;
  guest?:   SubscriptionGuestConfig;
}) => {
  const value = useSubscriptionState(guest);
  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export function useSubscription(): UseSubscription {
  const ctx = useContext(SubscriptionContext);
  if (ctx) return ctx;
  // Fallback so standalone callers (tests, stories) still work without a
  // provider — each gets their own independent state container.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useSubscriptionState();
}

// ── Underlying state hook ───────────────────────────────────────────────────

function useSubscriptionState(guest?: SubscriptionGuestConfig): UseSubscription {
  const { token } = useAuthStore();
  const [sub,        setSub]        = useState<SubscriptionInfo | null>(null);
  const [remaining,  setRemaining]  = useState<TokenRemaining  | null>(null);
  const [loading,    setLoading]    = useState<boolean>(false);

  // Stable, serializable key so the effect reruns on guest session change.
  const guestKey = guest
    ? `${guest.conversationId}|${guest.signature}|${guest.expiresAt}`
    : '';

  const refresh = useCallback(async () => {
    if (guest) {
      setLoading(true);
      try {
        const res = await subscriptionApi.getGuestSubscription(
          guest.conversationId,
          { signature: guest.signature, expiresAt: guest.expiresAt },
        );
        setSub(res.subscription);
        setRemaining(res.remaining);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!token) return;
    setLoading(true);
    try {
      const res = await subscriptionApi.getSubscription();
      setSub(res.subscription);
      setRemaining(res.remaining);
    } catch {
      /* ignore — surface via UI on next explicit attempt */
    } finally {
      setLoading(false);
    }
    // `guestKey` captures the full guest-session identity in one string.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, guestKey]);

  // Initial fetch on mount, auth change, or guest-session change.
  useEffect(() => {
    if (!token && !guest) {
      setSub(null); setRemaining(null); return;
    }
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, guestKey, refresh]);

  // Live updates via chat-list socket — covers server-initiated changes
  // (activation, expiry, cancellation). Guests can't join the list namespace
  // (it's JWT-gated), so this is authed-only.
  useEffect(() => {
    if (!token || guest) return;
    chatListSocket.connect();
    const off = chatListSocket.on<{
      plan:      SubscriptionPlan;
      remaining: { daily?: number; weekly?: number; monthly?: number };
      expiresAt?: string | null;
    }>('subscription_updated', (payload) => {
      setRemaining((prev) => ({
        plan:    payload.plan,
        daily:   payload.remaining.daily   ?? prev?.daily,
        weekly:  payload.remaining.weekly  ?? prev?.weekly,
        monthly: payload.remaining.monthly ?? prev?.monthly,
      }));
      setSub((prev) => prev ? {
        ...prev,
        plan: payload.plan,
        expiresAt: payload.expiresAt ?? prev.expiresAt,
      } : prev);
    });
    return () => {
      off();
      chatListSocket.disconnect();
    };
  }, [token, guest]);

  const merge = useCallback(
    (payload: { plan: SubscriptionPlan; remaining: TokenRemaining }) => {
      setRemaining((prev) => ({
        ...(prev ?? { plan: payload.plan }),
        ...payload.remaining,
        plan: payload.plan,
      }));
    },
    [],
  );

  return useMemo(
    () => ({
      sub,
      remaining,
      plan: sub?.plan ?? remaining?.plan ?? 'free',
      loading,
      isGuest: !!guest,
      merge,
      refresh,
    }),
    [sub, remaining, loading, merge, refresh, guest],
  );
}
