import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "./useReducedMotion";

/**
 * Count a number up to its target once, then follow later changes instantly.
 *
 * Only used for display. The value handed in is always the real figure from
 * the API, and the final frame lands exactly on it.
 */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || started.current) {
      setValue(target);
      started.current = true;
      return;
    }
    started.current = true;

    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) frame = requestAnimationFrame(step);
      else setValue(target);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduced]);

  return value;
}
