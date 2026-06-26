import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Admin authentication required." },
        { status: 401 }
      );
    }

    const { testId } = await params;

    const test = await prisma.test.findUnique({
      where: { id: testId },
      select: {
        id: true,
        name: true,
        testCode: true,
        testQuestions: {
          orderBy: { orderIndex: "asc" },
          select: {
            orderIndex: true,
            section: true,
            questionId: true,
            question: {
              select: {
                id: true,
                subject: true,
                chapter: true,
                type: true,
                prompt: true,
                options: true,
                imagePath: true,
                correctAnswers: true,
                answerPolicy: true,
              },
            },
          },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found." }, { status: 404 });
    }

    const questions = test.testQuestions.map((tq) => ({
      questionId: tq.question.id,
      orderIndex: tq.orderIndex,
      section: tq.section,
      subject: tq.question.subject,
      chapter: tq.question.chapter,
      type: tq.question.type,
      prompt: tq.question.prompt,
      options: tq.question.options,
      imagePath: tq.question.imagePath,
      correctAnswers: tq.question.correctAnswers,
      answerPolicy: tq.question.answerPolicy,
    }));

    return NextResponse.json({
      test: { id: test.id, name: test.name, testCode: test.testCode },
      questions,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch test questions.",
      },
      { status: 500 }
    );
  }
}
