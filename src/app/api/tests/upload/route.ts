import { NextResponse } from "next/server";
import { AnswerPolicy, Prisma, QuestionType, Subject } from "@prisma/client";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { createTestFromUploadedQuestions } from "@/lib/test-builder";
import { adminSubjectValues } from "@/lib/subject-categories";

export const runtime = "nodejs";
export const maxDuration = 60;

const optionSchema = z.object({
  key: z.enum(["A", "B", "C", "D"]),
  text: z.string().min(1),
});

const questionSchema = z.object({
  subject: z.nativeEnum(Subject),
  chapter: z.string().min(1),
  type: z.nativeEnum(QuestionType),
  prompt: z.string().nullable().optional(),
  options: z.array(optionSchema).length(4).nullable().optional(),
  imagePath: z.string().nullable().optional(),
  correctAnswers: z.array(z.enum(["A", "B", "C", "D"])).min(1),
  answerPolicy: z.nativeEnum(AnswerPolicy).optional(),
  metadata: z.any().optional(),
});

const metaSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  durationMinutes: z.coerce.number().min(1),
  correctMarks: z.coerce.number(),
  incorrectMarks: z.coerce.number(),
  unansweredMarks: z.coerce.number(),
  published: z.boolean().optional(),
  assignedSection: z.enum(adminSubjectValues),
  pdfAnswerKey: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const payload = metaSchema.parse({
      name: body.name,
      description: body.description || undefined,
      durationMinutes: body.durationMinutes,
      correctMarks: body.correctMarks,
      incorrectMarks: body.incorrectMarks,
      unansweredMarks: body.unansweredMarks,
      published: body.published,
      assignedSection: body.assignedSection,
      pdfAnswerKey: body.pdfAnswerKey || undefined,
    });

    const questionsInput = z.array(questionSchema).parse(body.questions);

    if (questionsInput.length === 0) {
      return NextResponse.json({ error: "At least one question is required." }, { status: 400 });
    }

    const questionData = questionsInput.map((row) => {
      const correctAnswers = row.correctAnswers;
      return {
        subject: row.subject,
        chapter: row.chapter,
        type: row.type,
        prompt: row.prompt ?? null,
        metadata: row.metadata ? row.metadata : Prisma.JsonNull,
        options: row.options ?? Prisma.JsonNull,
        imagePath: row.imagePath ?? null,
        correctAnswers,
        answerPolicy: row.answerPolicy ?? (correctAnswers.length > 1 ? AnswerPolicy.MULTIPLE : AnswerPolicy.SINGLE),
      };
    });

    const { createdQuestions, test } = await prisma.$transaction(async (tx) => {
      const createdRows = await tx.question.createManyAndReturn({
        data: questionData,
        select: {
          id: true,
          subject: true,
          chapter: true,
        },
      });

      const createdTest = await createTestFromUploadedQuestions(tx, payload, createdRows);

      return {
        createdQuestions: createdRows,
        test: createdTest,
      };
    }, {
      maxWait: 10_000,
      timeout: 20_000,
    });

    return NextResponse.json({
      message: `Created test ${test.name} with ${createdQuestions.length} uploaded questions.`,
      test,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create test from upload." }, { status: 400 });
  }
}
