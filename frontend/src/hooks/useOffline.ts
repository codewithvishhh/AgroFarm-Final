import { useEffect, useState } from "react";

/** Browser online state, used for the header indicator and refetch on return. */
export function useOffline(onReconnect?: () => void) {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      onReconnect?.();
    };
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [onReconnect]);

  return online;
}
