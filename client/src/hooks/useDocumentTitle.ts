import { useRef, useEffect } from "react";

const SUFFIX = " | CinemaConnect";

export function useDocumentTitle(
  title: string | undefined | null,
  options?: { restore?: boolean }
) {
  const prevTitle = useRef(document.title);
  const restore = options?.restore ?? true;

  useEffect(() => {
    if (!title) return;

    const next = title + SUFFIX;
    if (document.title !== next) {
      document.title = next;
    }
  }, [title]);

  useEffect(() => {
    const saved = prevTitle.current;
    return () => {
      if (restore) document.title = saved;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
