import { AnimatePresence, motion } from "framer-motion";

import { toastMotion } from "../animations/variants";
import { useLive } from "../hooks/useLive";

const TONE_STYLES = {
  info: "border-chill/35 bg-chill/10",
  good: "border-crop/35 bg-crop/10",
  warn: "border-harvest/40 bg-harvest/10",
  danger: "border-rot/40 bg-rot/10",
} as const;

export function ToastHost() {
  const { toasts, dismissToast } = useLive();

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex w-80 flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            variants={toastMotion}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="status"
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-lift backdrop-blur-xl ${
              TONE_STYLES[toast.tone]
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium capitalize text-husk">
                {toast.title}
              </p>
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-moss hover:text-husk"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-husk/80">
              {toast.message}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
