import type { Variants } from "framer-motion";

/** Shared motion vocabulary. Short, low travel, no bounce. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.985, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -12,
    scale: 0.99,
    filter: "blur(6px)",
    transition: { duration: 0.22 },
  },
};

export const listStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

export const toastMotion: Variants = {
  hidden: { opacity: 0, x: 28, scale: 0.97 },
  visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.24 } },
  exit: { opacity: 0, x: 28, transition: { duration: 0.18 } },
};

export const dialogMotion: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
  },
  exit: { opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.15 } },
};
