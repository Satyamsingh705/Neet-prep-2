import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/student-auth";

export async function GET() {
  try {
    const student = await getCurrentStudent();
    if (!student) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [liveTests, registeredBattleIds] = await Promise.all([
      prisma.liveTest.findMany({
        where: {
          visibility: "PUBLIC",
          status: { not: "CANCELLED" },
        },
        orderBy: { startTime: "asc" },
        include: {
          _count: { select: { attempts: true } },
          testTemplate: {
            select: {
              totalQuestions: true,
              durationMinutes: true,
            },
          },
        },
      }),
      prisma.battleRegistration.findMany({
        where: { studentId: student.id },
        select: { liveTestId: true },
      }),
    ]);

    const registeredSet = new Set(registeredBattleIds.map((r) => r.liveTestId));

    const testsWithRegistration = liveTests.map((t) => ({
      ...t,
      isRegistered: registeredSet.has(t.id),
    }));

    return NextResponse.json(testsWithRegistration);
  } catch (error) {
    console.error("API Error [live-tests]:", error);
    return NextResponse.json({ error: "Failed to fetch live tests" }, { status: 500 });
  }
}
