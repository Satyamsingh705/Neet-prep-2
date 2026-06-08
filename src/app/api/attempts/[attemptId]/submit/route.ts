import { NextResponse } from "next/server";
import { z } from "zod";
import { persistAttempt, submitAttempt } from "@/lib/data";
import { getCurrentStudentRecord } from "@/lib/student-auth";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

const submitPayloadSchema = z.object({
  answers: z.record(z.string(), z.object({
    selectedOptions: z.array(z.enum(["A", "B", "C", "D"])).default([]),
    markedForReview: z.boolean(),
    visited: z.boolean(),
    timeSpentSeconds: z.number().min(0),
  })),
  currentQuestionIndex: z.number().min(1),
  tabSwitchCount: z.number().min(0),
  totalTimeSpentSeconds: z.number().min(0),
}).partial().optional();

function isAttemptNotFoundError(error: unknown): error is Error {
  return error instanceof Error && error.message === "Attempt not found.";
}

async function handleSubmit(request: Request, params: Promise<{ attemptId: string }>) {
  try {
    const { attemptId } = await params;
    const student = await getCurrentStudentRecord();

    if (!student) {
      return NextResponse.json({ error: "Student login required." }, { status: 401 });
    }

    const url = new URL(request.url);
    const autoSubmitted = url.searchParams.get("auto") === "1";

    let payload: z.infer<typeof submitPayloadSchema> | undefined;

    if (request.headers.get("content-type")?.includes("application/json")) {
      payload = submitPayloadSchema.parse(await request.json().catch(() => undefined));
    }

    if (payload?.answers && payload.currentQuestionIndex && payload.totalTimeSpentSeconds !== undefined && payload.tabSwitchCount !== undefined) {
      await persistAttempt({
        attemptId,
        studentId: student.id,
        answers: payload.answers,
        currentQuestionIndex: payload.currentQuestionIndex,
        tabSwitchCount: payload.tabSwitchCount,
        totalTimeSpentSeconds: payload.totalTimeSpentSeconds,
      });
    }

    await submitAttempt(attemptId, autoSubmitted, student.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAttemptNotFoundError(error)) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error("[attempt-submit]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to submit attempt." }, { status: 400 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  return handleSubmit(request, params);
}
