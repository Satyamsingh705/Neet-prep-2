import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { title, description, startTime, endTime, durationMinutes, testTemplateId, visibility } = body;

    const liveTest = await prisma.liveTest.create({
      data: {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        durationMinutes,
        testTemplateId,
        visibility,
        status: "SCHEDULED",
      },
    });

    return NextResponse.json(liveTest);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create live test" }, { status: 500 });
  }
}

export async function GET(request: Request) {
    try {
        const admin = await getCurrentAdmin();
        if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const liveTests = await prisma.liveTest.findMany({
            orderBy: { startTime: "desc" },
            include: {
                _count: { select: { attempts: true } },
                testTemplate: { select: { name: true } }
            }
        });

        return NextResponse.json(liveTests);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch live tests" }, { status: 500 });
    }
}
