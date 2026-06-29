import { NextResponse } from "next/server";
import { getLiveLeaderboard } from "@/lib/data";
import { isTransientDbError } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entries = await getLiveLeaderboard(id);
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("API Error [leaderboard]:", error);
    if (isTransientDbError(error)) {
      return NextResponse.json({ error: "Server is under heavy load. Please retry." }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}

