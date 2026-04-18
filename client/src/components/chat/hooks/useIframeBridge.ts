import { useEffect, useRef } from 'react';

/**
 * Cross-origin postMessage bridge for the signed-URL chat page.
 *
 * When our page is embedded in an iframe on a third-party site (React / Vue
 * / plain HTML — doesn't matter), the embedder typically wants to know
 * when messages come in and when the chat is "open" so they can:
 *   • badge their launcher bubble with an unread count
 *   • close the widget when the user finishes the conversation
 *   • forward analytics events upstream
 *
 * This hook fires `window.parent.postMessage({ type, payload }, '*')` for
 * the meaningful lifecycle events. Consumers in the embedder code listen
 * with `window.addEventListener('message', …)` and filter by their expected
 * `type` prefix.
 *
 * Wildcard target `"*"` is used because we don't know the parent origin
 * at build time. Since we only post public, non-sensitive metadata (no
 * tokens, no message bodies) this is acceptable. If you need to harden
 * this, pass `allowedParentOrigin` through a `?parent=` query param and
 * check it before posting.
 *
 * No-op when not inside an iframe (top-level page).
 */
export interface ChatWidgetEvent {
  type:    'chat:ready' | 'chat:unread' | 'chat:message' | 'chat:close';
  payload: Record<string, unknown>;
}

const inIframe = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    // Access to window.top throws across origins — which means we ARE framed.
    return true;
  }
};

export const useIframeBridge = () => {
  // Stable ref to the last-known parent — we never send to a concrete origin,
  // but keeping the ref means we can swap to a strict check later trivially.
  const framedRef = useRef(inIframe());

  useEffect(() => {
    if (!framedRef.current) return;
    post({ type: 'chat:ready', payload: { url: window.location.href } });
    return () => {
      post({ type: 'chat:close', payload: {} });
    };
  }, []);

  return {
    isEmbedded: framedRef.current,
    emit:       post,
  };
};

const post = (event: ChatWidgetEvent): void => {
  try {
    if (typeof window === 'undefined' || window.self === window.top) return;
    window.parent.postMessage(event, '*');
  } catch {
    // Silently drop — hostile parent or closed window.
  }
};
