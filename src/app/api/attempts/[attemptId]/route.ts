import { NextResponse } from "next/server";
import { z } from "zod";
import { persistAttempt } from "@/lib/data";
import { getCurrentStudentRecord } from "@/lib/student-auth";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

const payloadSchema = z.object({
  answers: z.record(z.string(), z.object({
    selectedOptions: z.array(z.enum(["A", "B", "C", "D"])).default([]),
    markedForReview: z.boolean(),
    visited: z.boolean(),
    timeSpentSeconds: z.number().min(0),
  })),
  currentQuestionIndex: z.number().min(1),
  tabSwitchCount: z.number().min(0),
  totalTimeSpentSeconds: z.number().min(0),
});

function isAttemptNotFoundError(error: unknown): error is Error {
  return error instanceof Error && error.message === "Attempt not found.";
}

export async function PUT(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  try {
    const { attemptId } = await params;
    const student = await getCurrentStudentRecord();

    if (!student) {
      return NextResponse.json({ error: "Student login required." }, { status: 401 });
    }

    const payload = payloadSchema.parse(await request.json());
    await persistAttempt({ attemptId, studentId: student.id, ...payload });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAttemptNotFoundError(error)) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error("[attempt-save]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save attempt." }, { status: 400 });
  }
}
