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

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete student." }, { status: 400 });
  }
}