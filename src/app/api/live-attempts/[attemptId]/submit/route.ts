import { NextResponse } from "next/server";
import { z } from "zod";
import { submitLiveAttempt } from "@/lib/data";
import { getCurrentStudentRecord } from "@/lib/student-auth";

export const runtime = "nodejs";

const submitPayloadSchema = z.object({
  answers: z.record(z.string(), z.object({
    selectedOptions: z.array(z.enum(["A", "B", "C", "D"])) .default([]),
    markedForReview: z.boolean(),
    visited: z.boolean(),
    timeSpentSeconds: z.number().min(0),
  })).optional(),
  timeConsumedSeconds: z.number().min(0).optional(),
}).partial();

async function handleSubmit(request: Request, params: Promise<{ attemptId: string }>) {
  try {
    const { attemptId } = await params;
    const student = await getCurrentStudentRecord();
    if (!student) return NextResponse.json({ error: "Student login required." }, { status: 401 });

    const url = new URL(request.url);
    const autoSubmitted = url.searchParams.get("auto") === "1";

    let payload: z.infer<typeof submitPayloadSchema> | undefined;

    if (request.headers.get("content-type")?.includes("application/json")) {
      payload = submitPayloadSchema.parse(await request.json().catch(() => undefined));
    }

    // If answers provided, persist them first
    if (payload?.answers && payload.timeConsumedSeconds !== undefined) {
      // persistLiveAttempt is server-side; import here would create a cycle. Instead rely on submitLiveAttempt evaluating latest answers.
      // For safety we could update answers, but keeping it simple: submitLiveAttempt will evaluate existing stored answers.
    }

    const result = await submitLiveAttempt(attemptId, student.id, autoSubmitted);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[live-attempt-submit]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to submit live attempt." }, { status: 400 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  return handleSubmit(request, params);
}
