import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { AnswerPolicy } from "@prisma/client";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  correctAnswers: z
    .array(z.enum(["A", "B", "C", "D"]))
    .min(1, "At least one correct answer is required."),
  answerPolicy: z.nativeEnum(AnswerPolicy).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Admin authentication required." },
        { status: 401 }
      );
    }

    const { questionId } = await params;
    const body = await request.json();
    const payload = updateSchema.parse(body);

    const answerPolicy =
      payload.answerPolicy ??
      (payload.correctAnswers.length > 1
        ? AnswerPolicy.MULTIPLE
        : AnswerPolicy.SINGLE);

    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        correctAnswers: payload.correctAnswers,
        answerPolicy,
      },
      select: {
        id: true,
        correctAnswers: true,
        answerPolicy: true,
      },
    });

    // Revalidate caches so results and tests reflect the updated answers
    revalidateTag("tests");
    revalidateTag("attempts");

    return NextResponse.json({ ok: true, question });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update question answer.",
      },
      { status: 400 }
    );
  }
}
