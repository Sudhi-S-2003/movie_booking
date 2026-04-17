import { useCallback, useEffect, useState } from 'react';
import { chatApi } from '../../../services/api/chat.api.js';
import type { InvitePreviewResponse } from '../../../services/api/chat.api.js';
import { ApiError } from '../../../services/api/http.js';

export interface UseInvitePreviewState {
  data:    InvitePreviewResponse | null;
  loading: boolean;
  status:  number | null;
  error:   string | null;
  refetch: () => Promise<void>;
}

/** Loads the public preview for an invite token. See `GET /chat/invites/:token`. */
export const useInvitePreview = (token: string): UseInvitePreviewState => {
  const [data,    setData]    = useState<InvitePreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [status,  setStatus]  = useState<number | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await chatApi.getInviteByToken(token);
      setData(res);
      setStatus(200);
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setStatus(e.status || 500);
        setError(e.message);
      } else {
        setStatus(500);
        setError(e instanceof Error ? e.message : 'Invite could not be loaded');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void fetch(); }, [fetch]);

  return { data, loading, status, error, refetch: fetch };
};
