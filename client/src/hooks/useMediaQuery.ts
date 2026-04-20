import { useEffect, useState } from 'react';

/**
 * Returns a boolean that reflects whether the given CSS media query matches
 * the viewport. SSR-safe: starts as `false` when `window` is unavailable and
 * updates on mount + resize.
 *
 * The listener is attached to the MediaQueryList itself so we only re-render
 * when the match actually flips — cheaper than a raw resize listener.
 */
export const useMediaQuery = (query: string): boolean => {
  const getMatch = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false;

  const [matches, setMatches] = useState<boolean>(getMatch);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);

    // Initial sync (handles cases where the query changed since first render).
    setMatches(mql.matches);

    // Modern browsers — fall back to the deprecated addListener for older ones.
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [query]);

  return matches;
};

/** Tailwind's default `lg` breakpoint (≥ 1024 px). */
export const useIsLgUp = (): boolean => useMediaQuery('(min-width: 1024px)');

/** XS phones / narrow iframe embeds (≤ 380 px). */
export const useIsXs = (): boolean => useMediaQuery('(max-width: 380px)');
