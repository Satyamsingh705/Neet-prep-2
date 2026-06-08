import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const payloadSchema = z.object({
  username: z.string().trim().min(1, "Student ID is required.").max(50),
  password: z.string().min(1, "Password is required.").max(100),
  displayName: z.string().trim().max(100).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
    }

    const payload = payloadSchema.parse(await request.json());
    const existingStudent = await prisma.student.findUnique({ where: { username: payload.username } });

    if (existingStudent) {
      return NextResponse.json({ error: "Student ID already exists." }, { status: 409 });
    }

    const student = await prisma.student.create({
      data: {
        username: payload.username,
        passwordHash: hashPassword(payload.password),
        displayName: payload.displayName || payload.username,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
      },
    });

    return NextResponse.json({ ok: true, student });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create student." }, { status: 400 });
  }
}