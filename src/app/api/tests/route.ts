import { NextResponse } from "next/server";
import { Subject, TestMode } from "@prisma/client";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { createTestWithQuestions } from "@/lib/test-builder";
import { prisma } from "@/lib/prisma";
import { adminSubjectValues } from "@/lib/subject-categories";

const payloadSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  durationMinutes: z.number().min(1),
  correctMarks: z.number(),
  incorrectMarks: z.number(),
  unansweredMarks: z.number(),
  published: z.boolean().optional(),
  assignedSection: z.enum(adminSubjectValues).optional(),
  mode: z.nativeEnum(TestMode),
  subjectConfigs: z.array(z.object({ subject: z.enum(adminSubjectValues), sectionA: z.number().min(0), sectionB: z.number().min(0) })).optional(),
  questionConfigs: z.array(z.object({ subject: z.enum(adminSubjectValues), chapter: z.string().optional(), count: z.number().min(1) })).optional(),
});

export async function POST(request: Request) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
    }

    const payload = payloadSchema.parse(await request.json());
    const test = await createTestWithQuestions(prisma, {
      ...payload,
      assignedSection: payload.assignedSection ?? (payload.mode === TestMode.NEET_PATTERN ? "MAJOR_TEST" : undefined),
      subjectConfigs: payload.subjectConfigs?.map((config) => ({ ...config, subject: config.subject as Subject })),
      questionConfigs: payload.questionConfigs?.map((config) => ({ ...config, subject: config.subject as Subject })),
    });
    return NextResponse.json({ test });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create test." }, { status: 400 });
  }
}
