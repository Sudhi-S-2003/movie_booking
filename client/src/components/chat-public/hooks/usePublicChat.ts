import { useCallback, useEffect, useState } from 'react';
import { chatApi } from '../../../services/api/chat.api.js';
import type { PublicChatResponse } from '../../../services/api/chat.api.js';
import { ApiError } from '../../../services/api/http.js';

export interface UsePublicChatState {
  data:    PublicChatResponse | null;
  loading: boolean;
  /** HTTP status when we know it (404 / 403 / 500...) — helps the UI branch. */
  status:  number | null;
  error:   string | null;
  refetch: () => Promise<void>;
}

/**
 * Resolve a conversation by its publicName, returning enough context for the
 * client to decide:
 *   • Member → redirect into the chat
 *   • Anonymous → send to /login with `next=`
 *   • Not a group → show "not viewable" (service returns 403)
 *   • Group non-member → show "request to join" UI
 */
export const usePublicChat = (publicName: string): UsePublicChatState => {
  const [data,    setData]    = useState<PublicChatResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [status,  setStatus]  = useState<number | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!publicName) return;
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const res = await chatApi.getPublicConversation(publicName);
      setData(res);
      setStatus(200);
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setStatus(e.status || 500);
        setError(e.message);
      } else {
        setStatus(500);
        setError(e instanceof Error ? e.message : 'Failed to load chat');
      }
    } finally {
      setLoading(false);
    }
  }, [publicName]);

  useEffect(() => { void fetch(); }, [fetch]);

  return { data, loading, status, error, refetch: fetch };
};
