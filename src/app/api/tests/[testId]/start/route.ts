import { NextResponse } from "next/server";
import { startAttempt } from "@/lib/data";
import { getCurrentStudentRecord } from "@/lib/student-auth";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

export async function POST(_request: Request, { params }: { params: Promise<{ testId: string }> }) {
  try {
    const { testId } = await params;
    const student = await getCurrentStudentRecord();

    if (!student) {
      return NextResponse.json({ error: "Student login required." }, { status: 401 });
    }

    const attempt = await startAttempt(testId, student);
    return NextResponse.json({ attemptId: attempt.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to start attempt." }, { status: 400 });
  }
}
