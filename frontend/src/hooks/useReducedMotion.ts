import { useEffect, useState } from "react";

/**
 * True when the visitor asked for less motion, or when the device is a small
 * touch screen where heavy 3D work is not worth the frames.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarseQuery = window.matchMedia(
      "(hover: none) and (max-width: 900px)",
    );

    const update = () => setReduced(motionQuery.matches || coarseQuery.matches);
    update();

    motionQuery.addEventListener("change", update);
    coarseQuery.addEventListener("change", update);
    return () => {
      motionQuery.removeEventListener("change", update);
      coarseQuery.removeEventListener("change", update);
    };
  }, []);

  return reduced;
}
