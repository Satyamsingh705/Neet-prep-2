import { NextResponse } from "next/server";
import { clearStudentSessionCookie } from "@/lib/student-auth";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(clearStudentSessionCookie());
  return response;
}

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearStudentSessionCookie());
  return response;
}
