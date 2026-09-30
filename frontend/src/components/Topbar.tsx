import { Bell, Menu, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";

import { useI18n } from "../i18n/LanguageProvider";
import { useAuth } from "../hooks/useAuth";
import { useLive } from "../hooks/useLive";
import { NAVIGATION, ROLE_LABEL } from "../utils/navigation";
import { LanguageSelector } from "./LanguageSelector";
import { NotificationPanel } from "./NotificationPanel";

interface TopbarProps {
  online: boolean;
  onMenu: () => void;
}

export function Topbar({ online, onMenu }: TopbarProps) {
  const { pathname } = useLocation();
  const { session } = useAuth();
  const { unreadCount, connected } = useLive();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const link = session
    ? NAVIGATION[session.role].find((item) => item.to === pathname)
    : undefined;
  const title =
    t(link?.label ?? "") ||
    (pathname.startsWith("/shipments/") ? t("Shipment detail") : "AgroFarm");

  return (
    <header className="glass relative z-20 m-3 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenu}
          className="glass rounded-xl p-2 text-moss transition-colors hover:text-crop lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={16} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate font-display text-base font-semibold tracking-tight text-husk">
            {title}
          </h1>
          <p className="truncate text-[11px] text-moss">
            {session
              ? `${session.name} · ${t(ROLE_LABEL[session.role])}`
              : "AgroFarm"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <span
          className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] sm:inline-flex ${
            online
              ? "border-husk/12 bg-husk/4 text-moss backdrop-blur"
              : "border-harvest/40 bg-harvest/10 text-harvest"
          }`}
          title={
            online
              ? t("Connected to the AgroFarm API")
              : t("Offline. Cached dashboard data is shown.")
          }
        >
          {online ? <Wifi size={12} /> : <WifiOff size={12} />}
          {online
            ? connected
              ? t("Online")
              : t("Online, feed reconnecting")
            : t("Offline — cached data")}
        </span>

        <LanguageSelector />

        <button
          onClick={() => setOpen((value) => !value)}
          className="glass relative rounded-xl p-2 text-husk transition-all duration-200 hover:-translate-y-0.5 hover:text-crop"
          aria-label={t("Open notifications")}
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-harvest px-1 text-[10px] font-medium text-soil-900">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        <NotificationPanel open={open} onClose={() => setOpen(false)} />
      </div>
    </header>
  );
}
