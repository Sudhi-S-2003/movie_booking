import { useCallback, useEffect, useRef, useState } from "react";
import { supportApi } from "../../../services/api/index.js";
import { supportListSocket } from "../../../services/socket/index.js";
import { useAuthStore } from "../../../store/authStore.js";


export interface UseUnreadCountsReturn {
  counts: Record<string, number>;
  lastReadMap: Record<string, string>;
  refresh: () => Promise<void>;
  clearIssue: (issueId: string) => void;
}

export function useUnreadCounts(enabled: boolean): UseUnreadCountsReturn {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [lastReadMap, setLastReadMap] = useState<Record<string, string>>({});
  const { user } = useAuthStore();
  const userId = user?.id;

  const refreshRef = useRef<() => Promise<void>>(async () => {});

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await supportApi.getUnreadCounts();
      setCounts(res.counts ?? {});
      setLastReadMap(res.lastReadMap ?? {});
    } catch (err) {
      console.error("[useUnreadCounts] refresh failed:", err);
    }
  }, [enabled]);

  refreshRef.current = refresh;

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!enabled || !userId) return;

    // Connect — server auto-joins user room from JWT (no client-sent userId)
    supportListSocket.connect();

    const unsubs = [
      supportListSocket.on("unread_changed", () => {
        refreshRef.current();
      }),
      supportListSocket.on("issue_updated", () => {
        refreshRef.current();
      }),
      // On reconnect: refetch to catch missed updates
      supportListSocket.onReconnect(() => {
        refreshRef.current();
      }),
    ];

    return () => {
      unsubs.forEach((u) => u());
      supportListSocket.disconnect(); // ref-counted
    };
  }, [enabled, userId]);

  const clearIssue = useCallback((issueId: string) => {
    setCounts((prev) => {
      if (!prev[issueId]) return prev;
      const next = { ...prev };
      delete next[issueId];
      return next;
    });
  }, []);

  return { counts, lastReadMap, refresh, clearIssue };
}
