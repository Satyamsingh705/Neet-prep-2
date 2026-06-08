import { NextResponse } from "next/server";
import { getCurrentStudent } from "@/lib/student-auth";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

export async function GET() {
  const student = await getCurrentStudent();

  if (!student) {
    return NextResponse.json({ student: null });
  }

  return NextResponse.json({
    student: {
      id: student.id,
      username: student.username,
      displayName: student.displayName,
    },
  });
}