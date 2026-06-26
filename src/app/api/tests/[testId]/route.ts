import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  published: z.boolean(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ testId: string }> }) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
    }

    const { testId } = await params;
    const payload = updateSchema.parse(await request.json());
    const test = await prisma.test.update({
      where: { id: testId },
      data: { published: payload.published },
      select: {
        id: true,
        published: true,
      },
    });

    // Revalidate the tests cache so students and admin see the updated published state immediately
    revalidateTag("tests", undefined as any);

    return NextResponse.json({ ok: true, test });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update test." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ testId: string }> }) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
    }

    const { testId } = await params;

    const url = new URL(_request.url);
    const force = url.searchParams.get("force");

    const activeLiveTests = await prisma.liveTest.count({ where: { testTemplateId: testId } });
    if (activeLiveTests > 0 && force !== "1" && force !== "true") {
      return NextResponse.json(
        {
          error: "Cannot delete this test because it is used by one or more live tests. Re-run with ?force=1 to remove associated live events and delete.",
        },
        { status: 400 }
      );
    }

    // If force delete requested, remove dependent live test attempts and live tests first.
    if (activeLiveTests > 0 && (force === "1" || force === "true")) {
      // Find live tests for this template
      const liveTests = await prisma.liveTest.findMany({ where: { testTemplateId: testId }, select: { id: true } });
      const liveTestIds = liveTests.map((t) => t.id);

      if (liveTestIds.length > 0) {
        await prisma.liveTestAttempt.deleteMany({ where: { liveTestId: { in: liveTestIds } } });
        await prisma.liveTest.deleteMany({ where: { id: { in: liveTestIds } } });
      }
    }

    await prisma.test.delete({ where: { id: testId } });
    try {
      // Trigger Next.js cache revalidation for pages/tags depending on tests
      const { revalidateTag } = await import("next/cache");
      try {
        revalidateTag("tests", undefined as any);
        revalidateTag("live-tests", undefined as any);
        revalidateTag("attempts", undefined as any);
      } catch (err) {
        // ignore revalidation errors
        console.error("revalidateTag failed:", err);
      }
    } catch (err) {
      // ignore import errors
    }
    // Notify other server instances / clients about this change
    try {
      const { writeServerLiveUpdate } = await import("@/lib/live-update-server");
      writeServerLiveUpdate();
    } catch (err) {
      console.error("Failed to write server live update:", err);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete test." }, { status: 400 });
  }
}
