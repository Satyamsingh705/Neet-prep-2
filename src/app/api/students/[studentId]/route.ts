import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
    }

    const { studentId } = await params;
    await prisma.$transaction(async (tx) => {
      await tx.attempt.deleteMany({
        where: { studentId },
      });

      await tx.student.delete({
        where: { id: studentId },
      });
    });

    try {
      const { writeServerLiveUpdate } = await import("@/lib/live-update-server");
      writeServerLiveUpdate();
    } catch (err) {
      console.error("Failed to write server live update:", err);
    }

    try {
      const { revalidateTag } = await import("next/cache");
      try {
        revalidateTag("attempts");
        revalidateTag("tests");
      } catch (err) {
        // ignore
      }
    } catch (err) {
      // ignore
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete student." }, { status: 400 });
  }
}