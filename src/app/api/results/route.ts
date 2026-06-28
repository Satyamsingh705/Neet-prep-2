import { NextRequest, NextResponse } from "next/server";
import { getSubmittedAttemptResults } from "@/lib/data";
import { getCurrentStudent } from "@/lib/student-auth";

export async function GET(request: NextRequest) {
  const student = await getCurrentStudent();

  if (!student) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const offset = parseInt(request.nextUrl.searchParams.get("offset") ?? "0", 10);
  const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "5", 10);

  const attempts = await getSubmittedAttemptResults(student.id, { limit, offset });

  // Serialize dates for JSON transport
  const serialized = attempts.map((attempt) => ({
    ...attempt,
    submittedAt: attempt.submittedAt ? new Date(attempt.submittedAt).toISOString() : null,
  }));

  return NextResponse.json({ attempts: serialized });
}
