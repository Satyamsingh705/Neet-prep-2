import fs from "fs";
import path from "path";

const UPDATE_FILE = path.join(process.cwd(), ".next", "live-update.json");

export function writeServerLiveUpdate() {
  try {
    const payload = { timestamp: Date.now() };
    // ensure .next exists
    const dir = path.dirname(UPDATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(UPDATE_FILE, JSON.stringify(payload), "utf8");
  } catch (err) {
    // ignore write failures
    console.error("Failed to write live update file:", err);
  }
}

export function readServerLiveUpdate() {
  try {
    if (!fs.existsSync(UPDATE_FILE)) return { timestamp: 0 };
    const raw = fs.readFileSync(UPDATE_FILE, "utf8");
    return JSON.parse(raw) as { timestamp: number };
  } catch (err) {
    return { timestamp: 0 };
  }
}

export default {
  writeServerLiveUpdate,
  readServerLiveUpdate,
};
