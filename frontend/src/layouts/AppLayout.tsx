import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { pageTransition } from "../animations/variants";
import { AgroAssistant } from "../components/AgroAssistant";
import { AmbientBackground } from "../components/AmbientBackground";
import { Sidebar } from "../components/Sidebar";
import { ToastHost } from "../components/ToastHost";
import { Topbar } from "../components/Topbar";
import { useI18n } from "../i18n/LanguageProvider";
import { useOffline } from "../hooks/useOffline";

export function AppLayout() {
  const location = useLocation();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Coming back online remounts the routed page, which refetches its data.
  const online = useOffline(useCallback(() => setRefreshKey((n) => n + 1), []));

  return (
    <div className="scene relative flex h-full">
      <AmbientBackground />
      <Sidebar mobileOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar online={online} onMenu={() => setMenuOpen(true)} />
        {!online && (
          <p className="glass mx-3 rounded-xl border-harvest/30 bg-harvest/10 px-6 py-2 text-[11px] text-harvest">
            {t(
              "Offline. Showing the last data cached on this device. AgroFarm refreshes automatically when the connection returns.",
            )}
          </p>
        )}
        <main className="scene flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${location.pathname}-${refreshKey}`}
              variants={pageTransition}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <AgroAssistant />
      <ToastHost />
    </div>
  );
}
