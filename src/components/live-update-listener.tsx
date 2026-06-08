"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LIVE_UPDATE_CHANNEL, LIVE_UPDATE_STORAGE_KEY, type LiveUpdateEvent } from "@/lib/live-updates";

function shouldRefreshForPath(pathname: string) {
  return pathname === "/"
    || pathname === "/analysis"
    || pathname === "/admin"
    || pathname === "/admin/tests"
    || pathname.startsWith("/sections/");
}

export function LiveUpdateListener() {
  const pathname = usePathname();
  const router = useRouter();
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    if (!shouldRefreshForPath(pathname)) {
      return;
    }

    const refresh = () => {
      const now = Date.now();

      if (now - lastRefreshRef.current < 750) {
        return;
      }

      lastRefreshRef.current = now;
      router.refresh();
    };

    const handleBroadcastMessage = (message: MessageEvent<LiveUpdateEvent>) => {
      if (message.data?.type === "tests-changed") {
        refresh();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== LIVE_UPDATE_STORAGE_KEY || !event.newValue) {
        return;
      }

      try {
        const payload = JSON.parse(event.newValue) as LiveUpdateEvent;

        if (payload.type === "tests-changed") {
          refresh();
        }
      } catch {
        // Ignore malformed storage payloads.
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    const interval = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    let channel: BroadcastChannel | null = null;

    try {
      channel = new BroadcastChannel(LIVE_UPDATE_CHANNEL);
      channel.addEventListener("message", handleBroadcastMessage);
    } catch {
      channel = null;
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      channel?.removeEventListener("message", handleBroadcastMessage);
      channel?.close();
    };
  }, [pathname, router]);

  return null;
}
