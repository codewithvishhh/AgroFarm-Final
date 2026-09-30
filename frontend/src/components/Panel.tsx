import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { useReducedMotion } from "../hooks/useReducedMotion";

interface PanelProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/**
 * Frosted glass surface used for every data panel.
 *
 * Reveals itself with a short depth travel the first time it scrolls into
 * view, and lifts a little under the pointer. Props and children are exactly
 * what they were before.
 */
export function Panel({
  title,
  description,
  action,
  children,
  className = "",
  bodyClassName = "p-5",
}: PanelProps) {
  const reduced = useReducedMotion();

  const body = (
    <>
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-husk/8 px-5 py-4">
          <div>
            {title && (
              <h2 className="font-display text-sm font-semibold tracking-tight text-husk">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-xs text-moss">{description}</p>
            )}
          </div>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </>
  );

  const shell = `glass edge-light relative overflow-hidden rounded-2xl transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-lift ${className}`;

  if (reduced) return <section className={shell}>{body}</section>;

  return (
    <motion.section
      className={shell}
      initial={{ opacity: 0, y: 22, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {body}
    </motion.section>
  );
}
