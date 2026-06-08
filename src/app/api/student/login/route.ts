import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { buildStudentSessionCookie } from "@/lib/student-auth";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

const payloadSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    
    const student = await prisma.student.findUnique({
      where: { username: payload.username },
      select: {
        id: true,
        username: true,
        displayName: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!student || !student.isActive || !verifyPassword(payload.password, student.passwordHash)) {
      return NextResponse.json({ error: "Invalid student ID or password." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, student: { username: student.username, displayName: student.displayName } });
    response.cookies.set(buildStudentSessionCookie({ studentId: student.id, username: student.username, displayName: student.displayName }));
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Login failed." }, { status: 400 });
  }
}
