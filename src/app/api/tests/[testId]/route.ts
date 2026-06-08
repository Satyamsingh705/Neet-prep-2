import { NextResponse } from "next/server";
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
    await prisma.test.delete({ where: { id: testId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete test." }, { status: 400 });
  }
}
