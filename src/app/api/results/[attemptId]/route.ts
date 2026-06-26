import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
    }

    const { attemptId } = await params;
    const result = await prisma.attempt.deleteMany({ where: { id: attemptId } });

    if (result.count === 0) {
      return NextResponse.json({ error: "Attempt not found or already deleted." }, { status: 404 });
    }

    revalidateTag("attempts", undefined as any);
    try {
      const { revalidateTag } = await import("next/cache");
      try {
        revalidateTag("tests", undefined as any);
      } catch {}
    } catch {}
    try {
      const { writeServerLiveUpdate } = await import("@/lib/live-update-server");
      writeServerLiveUpdate();
    } catch (err) {
      console.error("Failed to write server live update:", err);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete result." }, { status: 400 });
  }
}