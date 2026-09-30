import { useEffect, useRef } from "react";

import { useReducedMotion } from "../hooks/useReducedMotion";

/**
 * Fixed cinematic backdrop behind the whole product.
 *
 * Three depth layers: a forest gradient, slow aurora light, and a canopy of
 * leaves that drift with the pointer. Everything is drawn with CSS and inline
 * SVG, so there are no image requests and nothing can 404.
 */
export function AmbientBackground() {
  const canopyRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    let frame = 0;

    const onPointer = (event: PointerEvent) => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const x = event.clientX / window.innerWidth - 0.5;
        const y = event.clientY / window.innerHeight - 0.5;
        if (canopyRef.current) {
          canopyRef.current.style.transform = `translate3d(${x * -26}px, ${
            y * -18
          }px, 0)`;
        }
        if (glowRef.current) {
          glowRef.current.style.transform = `translate3d(${x * 44}px, ${
            y * 30
          }px, 0)`;
        }
      });
    };

    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointer);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [reduced]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Layer 1 — deep forest floor. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_18%_-10%,#123727_0%,#0A1F16_38%,#06120C_72%)]" />

      {/* Layer 2 — slow aurora light, the only continuously moving element. */}
      <div
        ref={glowRef}
        className="absolute -left-40 -top-56 h-[38rem] w-[38rem] rounded-full bg-crop/12 blur-[130px] animate-aurora will-transform"
      />
      <div className="absolute -bottom-72 right-[-14rem] h-[42rem] w-[42rem] rounded-full bg-chill/8 blur-[150px] animate-aurora" />
      <div className="absolute left-1/2 top-1/3 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-harvest/6 blur-[140px]" />

      {/* Layer 3 — botanical canopy in the corners, as in the reference. */}
      <div ref={canopyRef} className="absolute inset-0 will-transform">
        <Leaf className="absolute -left-16 -top-10 h-72 w-72 text-crop/12 animate-floatSlow" />
        <Leaf className="absolute -right-20 top-24 h-80 w-80 rotate-[140deg] text-crop/10 animate-floatSlow [animation-delay:-3s]" />
        <Leaf className="absolute -bottom-24 left-10 h-72 w-72 rotate-[52deg] text-crop/8 animate-floatSlow [animation-delay:-6s]" />
        <Leaf className="absolute -bottom-16 right-1/4 h-56 w-56 -rotate-12 text-crop/8 animate-floatSlow [animation-delay:-1.5s]" />
      </div>

      {/* Fine grain keeps the large flat areas from banding. */}
      <div className="grain absolute inset-0" />

      {/* Vignette pulls the eye to the centre of the screen. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_50%,transparent_35%,rgba(6,18,12,0.85)_100%)]" />
    </div>
  );
}

function Leaf({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" fill="currentColor" className={className}>
      <path d="M186 16C120 12 66 32 40 70 16 105 20 148 44 176c10-30 30-60 62-85-26 31-42 61-50 90 42 12 84-2 110-34 26-33 30-84 20-131Z" />
      <path
        d="M186 16C140 54 100 96 70 148"
        stroke="rgba(6,18,12,0.5)"
        strokeWidth="3"
        fill="none"
      />
    </svg>
  );
}
