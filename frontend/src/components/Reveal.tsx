import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { useReducedMotion } from "../hooks/useReducedMotion";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Seconds of delay, for staggering siblings by hand. */
  delay?: number;
  /** Depth travel. "up" for content, "depth" for hero-scale blocks. */
  variant?: "up" | "depth";
}

/** Scroll-triggered entrance: travel, depth, and a short blur release. */
export function Reveal({
  children,
  className = "",
  delay = 0,
  variant = "up",
}: RevealProps) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  const hidden =
    variant === "depth"
      ? { opacity: 0, scale: 0.94, y: 48, filter: "blur(10px)" }
      : { opacity: 0, y: 26, filter: "blur(6px)" };

  return (
    <motion.div
      className={className}
      initial={hidden}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
