// In-memory live update signaling.
// On Vercel, the filesystem is read-only (except /tmp), so the previous
// approach of writing to .next/live-update.json silently failed on every call.
// In-memory storage works correctly within a warm serverless invocation's lifetime.

let lastUpdateTimestamp = 0;

export function writeServerLiveUpdate() {
  lastUpdateTimestamp = Date.now();
}

export function readServerLiveUpdate() {
  return { timestamp: lastUpdateTimestamp };
}

export default {
  writeServerLiveUpdate,
  readServerLiveUpdate,
};
