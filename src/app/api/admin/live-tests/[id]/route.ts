import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Admin authentication required." },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Delete in transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // First delete all battle registrations for this live test
      await tx.battleRegistration.deleteMany({
        where: { liveTestId: id },
      });

      // Then delete all live test attempts for this live test
      await tx.liveTestAttempt.deleteMany({
        where: { liveTestId: id },
      });

      // Finally delete the live test itself
      await tx.liveTest.delete({
        where: { id },
      });
    });

    // Revalidate all cached data so students see the deletion immediately
    revalidateTag("live-tests", undefined as any);
    revalidateTag("live-arena", undefined as any);

    // Notify other server instances / clients about this change
    try {
      const { writeServerLiveUpdate } = await import("@/lib/live-update-server");
      writeServerLiveUpdate();
    } catch (err) {
      console.error("Failed to write server live update:", err);
    }

    return NextResponse.json({ ok: true, message: "Arena deleted successfully" });
  } catch (error) {
    console.error("Error deleting live test:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete arena test.",
      },
      { status: 400 }
    );
  }
}
