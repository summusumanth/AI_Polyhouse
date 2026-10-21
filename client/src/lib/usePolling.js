import { useEffect, useRef } from "react";

// Runs `callback` every `ms` while the browser tab is visible. Paused in a
// background tab; on return it refreshes at once so data is never stale.
// `deps` re-run it immediately when they change (e.g. a new chart range).
export function usePolling(callback, ms, deps = [], { immediate = true } = {}) {
  const saved = useRef(callback);
  saved.current = callback;

  useEffect(() => {
    let timer;
    const run = () => saved.current();
    const start = () => {
      clearInterval(timer);
      timer = setInterval(() => {
        if (!document.hidden) run();
      }, ms);
    };
    const onVisibility = () => {
      if (!document.hidden) {
        run();
        start();
      }
    };

    if (immediate) run();
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms, ...deps]);
}
