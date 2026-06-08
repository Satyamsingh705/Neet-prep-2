import { NextResponse } from "next/server";
import { getLiveLeaderboard } from "@/lib/data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entries = await getLiveLeaderboard(id);
    return NextResponse.json({ entries });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
