import { useEffect, useRef, useState } from "react";

// Scene animations (swaying plants, fans, LEDs) are SVG transforms, which
// browsers repaint on the main thread every frame. Run them only while the
// scene is on screen and the browser tab is visible.
export function useLiveScene(enabled = true) {
  const ref = useRef(null);
  const [onScreen, setOnScreen] = useState(false);
  const [tabVisible, setTabVisible] = useState(() => typeof document === "undefined" || !document.hidden);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setOnScreen(true);
      return undefined;
    }
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), {
      rootMargin: "80px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onChange = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return [ref, enabled && onScreen && tabVisible];
}
