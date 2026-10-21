"use client";

import { useCallback, useEffect, useState } from "react";

const INTERVAL_MS = 5000;

/**
 * Which card is in front. Turns on its own every few seconds, holds still
 * while `paused` (pointer or focus inside), and never on its own under
 * reduced motion — the dots still work.
 */
export function useFeatureRotation(count: number, paused: boolean) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (paused || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % count), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [count, paused, active]);

  const show = useCallback((index: number) => setActive(((index % count) + count) % count), [count]);

  return { active, show };
}
