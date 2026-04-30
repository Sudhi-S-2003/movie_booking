import { useEffect, memo } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Automatically scrolls the window to the top on navigation.
 * Bypasses scrolling if a hash (#section-id) is present in the URL
 * to allow browser-native anchor scrolling.
 */
export const ScrollToTop = memo(() => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant',
      });
    }
  }, [pathname, hash]);

  return null;
});

ScrollToTop.displayName = 'ScrollToTop';
