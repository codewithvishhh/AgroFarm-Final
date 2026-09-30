import { useRef, type CSSProperties, type ReactNode } from "react";

import { useReducedMotion } from "../hooks/useReducedMotion";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Degrees of rotation at the far edge. Keep it small for data panels. */
  intensity?: number;
  /** Follow the pointer with a soft highlight. */
  glare?: boolean;
}

/**
 * Pointer-driven 3D tilt.
 *
 * Writes transforms straight to the node inside one animation frame, so no
 * React state changes and no re-render happens while the pointer moves. Falls
 * back to a plain container when reduced motion is requested or on touch.
 */
export function TiltCard({
  children,
  className = "",
  style,
  intensity = 6,
  glare = true,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);
  const reduced = useReducedMotion();

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    if (frame.current) return;
    frame.current = window.requestAnimationFrame(() => {
      frame.current = 0;
      if (!ref.current) return;
      ref.current.style.transform = `perspective(900px) rotateX(${
        -y * intensity
      }deg) rotateY(${x * intensity}deg) translate3d(0,-4px,0)`;
      if (glareRef.current) {
        glareRef.current.style.opacity = "1";
        glareRef.current.style.background = `radial-gradient(28rem circle at ${
          (x + 0.5) * 100
        }% ${(y + 0.5) * 100}%, rgba(230,239,232,0.10), transparent 45%)`;
      }
    });
  };

  const reset = () => {
    if (!ref.current) return;
    ref.current.style.transform = "";
    if (glareRef.current) glareRef.current.style.opacity = "0";
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={style}
      className={`relative transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-transform ${className}`}
    >
      {children}
      {glare && !reduced && (
        <span
          ref={glareRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300"
        />
      )}
    </div>
  );
}
