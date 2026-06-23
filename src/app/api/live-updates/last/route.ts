import { NextResponse } from "next/server";
import { readServerLiveUpdate } from "@/lib/live-update-server";

export async function GET() {
  try {
    const data = readServerLiveUpdate();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ timestamp: 0 });
  }
}
