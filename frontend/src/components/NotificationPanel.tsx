import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";

import { listItem, listStagger } from "../animations/variants";
import { useLive } from "../hooks/useLive";
import { timeAgo } from "../utils/format";

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const { notifications, markAllRead } = useLive();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="absolute right-0 top-12 z-50 w-[22rem] overflow-hidden rounded-2xl border border-husk/12 bg-soil-800/55 backdrop-blur shadow-panel"
        >
          <header className="flex items-center justify-between border-b border-husk/8 px-4 py-3">
            <p className="font-display text-sm text-husk">Notifications</p>
            <button
              onClick={markAllRead}
              className="text-[11px] text-moss hover:text-crop"
            >
              Mark all read
            </button>
          </header>

          <motion.ul
            variants={listStagger}
            initial="hidden"
            animate="visible"
            className="max-h-[22rem] divide-y divide-husk/8 overflow-y-auto"
          >
            {notifications.length === 0 && (
              <li className="px-4 py-8 text-center text-xs text-moss">
                Nothing yet. Dispatch a shipment to start the feed.
              </li>
            )}
            {notifications.map((notification) => (
              <motion.li
                key={notification.id}
                variants={listItem}
                className={`px-4 py-3 ${
                  notification.is_read ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-xs font-medium text-husk">
                    {notification.title}
                  </p>
                  <span className="shrink-0 text-[10px] text-moss">
                    {timeAgo(notification.created_at)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-moss">
                  {notification.message}
                </p>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
