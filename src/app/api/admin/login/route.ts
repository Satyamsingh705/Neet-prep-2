import { NextResponse } from "next/server";
import { z } from "zod";
import { buildAdminSessionCookie } from "@/lib/admin-auth";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const payloadSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    
    const admin = await prisma.admin.findUnique({
      where: { username: payload.username },
      select: {
        id: true,
        username: true,
        displayName: true,
        passwordHash: true,
      },
    });

    if (!admin || !verifyPassword(payload.password, admin.passwordHash)) {
      return NextResponse.json({ error: "Invalid admin ID or password." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, admin: { username: admin.username, displayName: admin.displayName } });
    response.cookies.set(buildAdminSessionCookie({ adminId: admin.id, username: admin.username, displayName: admin.displayName }));
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Login failed." }, { status: 400 });
  }
}