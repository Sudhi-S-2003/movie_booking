import { useEffect, useState } from 'react';
import { statsApi, type PlatformStats } from '../services/api/index.js';

/**
 * Single source of truth for platform-wide counts (users, movies, theatres, etc.).
 * Cached in a module-level variable so multiple components don't refetch.
 */
let cached: PlatformStats | null = null;
let inflight: Promise<PlatformStats> | null = null;

const fetchOnce = async (): Promise<PlatformStats> => {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = statsApi.platform().then((r) => {
    cached = r.stats;
    inflight = null;
    return cached;
  });
  return inflight;
};

export const usePlatformStats = () => {
  const [stats,   setStats]   = useState<PlatformStats | null>(cached);
  const [loading, setLoading] = useState<boolean>(!cached);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (cached) return;
    let alive = true;
    fetchOnce()
      .then((s) => alive && setStats(s))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return { stats, loading, error };
};

/** Force re-fetch — use after mutating data that affects platform counts. */
export const invalidatePlatformStats = () => {
  cached = null;
  inflight = null;
};
