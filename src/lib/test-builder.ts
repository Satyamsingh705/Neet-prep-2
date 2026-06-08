import { Prisma, Subject, TestMode } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { generateUniqueTestCode } from "@/lib/test-code";
import type { AdminSubjectCategory } from "@/lib/subject-categories";
import type { TestConfigPayload } from "@/lib/types";

type DbClient = PrismaClient | Prisma.TransactionClient;

type UploadedQuestionRow = {
  id: string;
  subject: Subject;
  chapter: string;
};

type UploadedTestPayload = {
  name: string;
  description?: string;
  durationMinutes: number;
  correctMarks: number;
  incorrectMarks: number;
  unansweredMarks: number;
  published?: boolean;
  assignedSection?: AdminSubjectCategory;
};

function shuffle<T>(items: T[]) {
  return [...items]
    .map((item) => ({ item, sortKey: Math.random() }))
    .sort((left, right) => left.sortKey - right.sortKey)
    .map(({ item }) => item);
}

async function pickQuestions(prisma: DbClient, params: { subject: Subject; chapter?: string; count: number }) {
  const pool = await prisma.question.findMany({
    where: {
      subject: params.subject,
      ...(params.chapter ? { chapter: params.chapter } : {}),
    },
  });

  if (pool.length < params.count) {
    throw new Error(`Not enough questions for ${params.subject}${params.chapter ? ` / ${params.chapter}` : ""}. Requested ${params.count}, found ${pool.length}.`);
  }

  return shuffle(pool).slice(0, params.count);
}

export async function createTestWithQuestions(prisma: DbClient, payload: TestConfigPayload) {
  const rows: Array<Prisma.TestQuestionUncheckedCreateWithoutTestInput> = [];
  let orderIndex = 1;

  if (payload.mode === TestMode.NEET_PATTERN) {
    for (const config of payload.subjectConfigs ?? []) {
      const sectionAQuestions = await pickQuestions(prisma, { subject: config.subject, count: config.sectionA });
      const excludedIds = new Set(sectionAQuestions.map((question) => question.id));
      const sectionBPool = await prisma.question.findMany({
        where: {
          subject: config.subject,
          id: { notIn: Array.from(excludedIds) },
        },
      });

      if (sectionBPool.length < config.sectionB) {
        throw new Error(`Not enough Section B questions for ${config.subject}.`);
      }

      const sectionBQuestions = shuffle(sectionBPool).slice(0, config.sectionB);

      for (const question of [...sectionAQuestions, ...sectionBQuestions]) {
        rows.push({
          questionId: question.id,
          orderIndex,
          subject: question.subject,
          section: orderIndex % 50 <= 35 && orderIndex % 50 !== 0 ? "Section A" : "Section B",
          chapter: question.chapter,
        });
        orderIndex += 1;
      }
    }
  } else {
    for (const config of payload.questionConfigs ?? []) {
      const selectedQuestions = await pickQuestions(prisma, config);

      for (const question of selectedQuestions) {
        rows.push({
          questionId: question.id,
          orderIndex,
          subject: question.subject,
          section: "Practice",
          chapter: question.chapter,
        });
        orderIndex += 1;
      }
    }
  }

  const totalQuestions = rows.length;
  const totalEvaluatedQuestions = payload.mode === TestMode.NEET_PATTERN ? Math.floor(totalQuestions * 0.9) : totalQuestions;
  const testCode = await generateUniqueTestCode(prisma);

  return prisma.test.create({
    data: {
      testCode,
      name: payload.name,
      description: payload.description,
      published: payload.published ?? true,
      durationMinutes: payload.durationMinutes,
      correctMarks: payload.correctMarks,
      incorrectMarks: payload.incorrectMarks,
      unansweredMarks: payload.unansweredMarks,
      totalQuestions,
      totalEvaluatedQuestions,
      mode: payload.mode,
      config: payload,
      testQuestions: {
        create: rows,
      },
    },
    include: {
      testQuestions: true,
    },
  });
}

export async function createTestFromUploadedQuestions(prisma: DbClient, payload: UploadedTestPayload, questions: UploadedQuestionRow[]) {
  if (questions.length === 0) {
    throw new Error("Upload at least one question before creating the test.");
  }

  const testCode = await generateUniqueTestCode(prisma);

  return prisma.test.create({
    data: {
      testCode,
      name: payload.name,
      description: payload.description,
      published: payload.published ?? true,
      durationMinutes: payload.durationMinutes,
      correctMarks: payload.correctMarks,
      incorrectMarks: payload.incorrectMarks,
      unansweredMarks: payload.unansweredMarks,
      totalQuestions: questions.length,
      totalEvaluatedQuestions: questions.length,
      mode: TestMode.CUSTOM,
      config: {
        source: "UPLOAD",
        assignedSection: payload.assignedSection,
        questionIds: questions.map((question) => question.id),
      },
      testQuestions: {
        create: questions.map((question, index) => ({
          questionId: question.id,
          orderIndex: index + 1,
          subject: question.subject,
          section: "Uploaded",
          chapter: question.chapter,
        })),
      },
    },
    include: {
      testQuestions: true,
    },
  });
}
