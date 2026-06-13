import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { AnswerPolicy, Prisma, QuestionType, Subject } from "@prisma/client";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { adminSubjectValues } from "@/lib/subject-categories";

export const runtime = "nodejs";
export const maxDuration = 60;

const optionSchema = z.object({
  key: z.enum(["A", "B", "C", "D"]),
  text: z.string().min(1),
});

const tableSchema = z.object({
  caption: z.string().min(1).optional(),
  headers: z.array(z.string()).min(1).optional(),
  rows: z.array(z.array(z.string()).min(1)).min(1),
});

const questionSchema = z.object({
  subject: z.enum(adminSubjectValues),
  chapter: z.string().min(1),
  prompt: z.string().min(1),
  table: tableSchema.optional(),
  options: z.array(optionSchema).length(4),
  correctAnswers: z.array(z.enum(["A", "B", "C", "D"])).min(1).optional(),
  correctAnswer: z.enum(["A", "B", "C", "D"]).optional(),
  answerPolicy: z.nativeEnum(AnswerPolicy).optional(),
});

export async function POST(request: Request) {
  try {
    try {
      const admin = await getCurrentAdmin();

      if (!admin) {
        return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
      }

      const body = await request.json();
      const questionsInput = z.array(questionSchema).parse(body.questions);

      await prisma.question.createMany({
        data: questionsInput.map((row) => {
          const correctAnswers = row.correctAnswers ?? (row.correctAnswer ? [row.correctAnswer] : []);

          return {
            subject: row.subject as Subject,
            chapter: row.chapter,
            type: QuestionType.TEXT,
            prompt: row.prompt,
            metadata: row.table ? { table: row.table } : Prisma.JsonNull,
            options: row.options,
            correctAnswers,
            answerPolicy: row.answerPolicy ?? (correctAnswers.length > 1 ? AnswerPolicy.MULTIPLE : AnswerPolicy.SINGLE),
          };
        }),
      });

      // Revalidate cached question bank summary and test listings
      revalidateTag("questions");
      revalidateTag("tests");

      return NextResponse.json({ message: `Uploaded ${questionsInput.length} text questions.` });
    } catch (innerError) {
      return NextResponse.json({ error: innerError instanceof Error ? innerError.message : "Invalid JSON upload." }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: "An unexpected error occurred during JSON upload." }, { status: 500 });
  }
}
