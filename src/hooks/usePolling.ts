import { useEffect, useRef } from 'react';

/** Calls `fn` every `ms` while the tab is visible (live status without websockets). */
export function usePolling(fn: () => void | Promise<void>, ms = 5000) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void ref.current();
    }, ms);
    return () => clearInterval(id);
  }, [ms]);
}
