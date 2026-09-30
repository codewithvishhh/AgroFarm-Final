import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import type { MotionValue } from "framer-motion";
import type { RefObject } from "react";

import { useReducedMotion } from "../hooks/useReducedMotion";

/**
 * Scroll World — a scroll-scrubbed fly-through of the AgroFarm supply chain.
 *
 * Four depth layers (sky, ridge, fields, foreground canopy) plus a camera dolly
 * that pushes the whole diorama forward as the visitor scrolls. Every scene is
 * inline SVG and CSS: no video, no WebGL, no image requests, so it stays cheap
 * on a phone and cannot break on a slow connection.
 *
 * The scenes are farm gate, collection yard, warehouse, transport corridor and
 * retail — the same five stages the product itself tracks.
 */
export function ScrollWorld({
  containerRef,
}: {
  containerRef: RefObject<HTMLElement>;
}) {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    container: containerRef,
    offset: ["start start", "end end"],
  });

  // Springing the progress keeps the camera continuous instead of jumpy.
  const progress = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 22,
    mass: 0.4,
  });

  const still = reduced;
  const depth = (from: number, to: number): MotionValue<number> =>
    useTransform(progress, [0, 1], still ? [0, 0] : [from, to]);

  const skyY = depth(0, 60);
  const ridgeY = depth(0, 140);
  const fieldY = depth(0, 300);
  const frontY = depth(0, 520);
  const camera = useTransform(progress, [0, 1], still ? [1, 1] : [1, 1.35]);
  const haze = useTransform(progress, [0, 0.5, 1], [0.25, 0.55, 0.8]);
  const truckX = useTransform(progress, [0.15, 0.85], still ? [0, 0] : [-30, 130]);
  const truckXvw = useTransform(truckX, (value) => `${value}vw`);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[radial-gradient(130%_100%_at_50%_-10%,#15452F_0%,#0A2418_40%,#06120C_78%)]"
    >
      <motion.div style={{ scale: camera }} className="absolute inset-0">
        {/* Sun shafts, the slowest layer. */}
        <motion.div style={{ y: skyY }} className="absolute inset-x-0 top-0 h-[70vh]">
          <div className="absolute left-1/4 top-[-30vh] h-[90vh] w-[40vw] -rotate-12 bg-gradient-to-b from-crop/15 to-transparent blur-3xl" />
          <div className="absolute right-1/4 top-[-32vh] h-[90vh] w-[26vw] rotate-6 bg-gradient-to-b from-harvest/10 to-transparent blur-3xl" />
        </motion.div>

        {/* Distant ridge line. */}
        <motion.svg
          style={{ y: ridgeY }}
          viewBox="0 0 1440 400"
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-[26vh] h-[36vh] w-full text-emeraldDeep"
        >
          <path
            fill="currentColor"
            opacity="0.75"
            d="M0 240 L160 180 L320 232 L470 150 L620 226 L780 160 L940 230 L1100 176 L1260 236 L1440 190 L1440 400 L0 400 Z"
          />
        </motion.svg>

        {/* Ploughed fields with a warehouse and a moving truck. */}
        <motion.svg
          style={{ y: fieldY }}
          viewBox="0 0 1440 600"
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-[44vh] h-[52vh] w-full"
        >
          <defs>
            <linearGradient id="sw-field" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#143D2A" />
              <stop offset="100%" stopColor="#081B12" />
            </linearGradient>
          </defs>
          <path fill="url(#sw-field)" d="M0 60 L1440 0 L1440 600 L0 600 Z" />
          {Array.from({ length: 16 }).map((_, index) => (
            <path
              key={index}
              d={`M${-200 + index * 130} 600 L${420 + index * 42} 40`}
              stroke="rgba(79,191,122,0.16)"
              strokeWidth="2"
            />
          ))}
          {/* Warehouse block. */}
          <g opacity="0.85">
            <rect x="1080" y="140" width="180" height="90" fill="#0E2B1E" />
            <path d="M1080 140 L1170 100 L1260 140 Z" fill="#17402C" />
            <rect x="1120" y="180" width="34" height="50" fill="#06120C" />
          </g>
          {/* Road the truck runs along. */}
          <path
            d="M-40 520 L1480 300"
            stroke="rgba(230,239,232,0.10)"
            strokeWidth="46"
            strokeLinecap="round"
          />
        </motion.svg>

        {/* Truck moving through the corridor. */}
        <motion.div
          style={{ x: truckXvw }}
          className="absolute left-0 top-[72vh] hidden h-16 w-16 items-center justify-center sm:flex"
        >
          <svg viewBox="0 0 64 40" className="h-12 w-16 text-crop drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]">
            <rect x="2" y="8" width="34" height="20" rx="3" fill="#123727" stroke="currentColor" strokeWidth="1.5" />
            <path d="M36 14 h12 l8 8 v6 H36 Z" fill="#0E2B1E" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="14" cy="31" r="4" fill="#06120C" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="46" cy="31" r="4" fill="#06120C" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </motion.div>

        {/* Foreground canopy, the fastest layer, frames the shot. */}
        <motion.div style={{ y: frontY }} className="absolute inset-0">
          <svg viewBox="0 0 200 200" className="absolute -left-14 bottom-[-4rem] h-[26rem] w-[26rem] text-canopy">
            <path fill="currentColor" d="M200 20C120 16 54 44 24 92 0 130 6 176 30 200H200Z" />
          </svg>
          <svg viewBox="0 0 200 200" className="absolute -right-16 bottom-[-6rem] h-[30rem] w-[30rem] rotate-[18deg] text-canopy">
            <path fill="currentColor" d="M0 30C80 24 150 54 180 104c22 38 18 74-4 96H0Z" />
          </svg>
        </motion.div>
      </motion.div>

      {/* Cinematic grade over the whole world. */}
      <motion.div
        style={{ opacity: haze }}
        className="absolute inset-0 bg-gradient-to-b from-canopy/30 via-canopy/45 to-canopy"
      />
      <div className="absolute inset-0 bg-[radial-gradient(110%_110%_at_50%_45%,transparent_30%,rgba(6,18,12,0.9)_100%)]" />
    </div>
  );
}
