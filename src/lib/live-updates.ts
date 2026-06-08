export const LIVE_UPDATE_CHANNEL = "website-live-updates";
export const LIVE_UPDATE_STORAGE_KEY = "website-live-update-event";

export type LiveUpdateEvent = {
  type: "tests-changed";
  timestamp: number;
};

export function broadcastTestsChanged() {
  if (typeof window === "undefined") {
    return;
  }

  const event: LiveUpdateEvent = {
    type: "tests-changed",
    timestamp: Date.now(),
  };

  try {
    const channel = new BroadcastChannel(LIVE_UPDATE_CHANNEL);
    channel.postMessage(event);
    channel.close();
  } catch {
    // BroadcastChannel is optional; storage event below remains as fallback.
  }

  try {
    window.localStorage.setItem(LIVE_UPDATE_STORAGE_KEY, JSON.stringify(event));
  } catch {
    // Ignore storage failures.
  }
}
