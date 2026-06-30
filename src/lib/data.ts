import { AttemptStatus, Prisma, QuestionType, TestMode } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma, withRetry } from "@/lib/prisma";
import { getQuestionTable } from "@/lib/question-content";
import { evaluateAttempt, getInitialAnswerState, getPaletteStatus, normalizeStoredAnswer } from "@/lib/neet";
import { getSubjectLabel } from "@/lib/subject-categories";
import type { QuestionOption, QuestionPayload, StoredAnswersMap } from "@/lib/types";

function isDatabaseUnavailableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P1001" || error.code === "P2024";
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    return message.includes("timed out fetching a new connection") || message.includes("connection pool timeout");
  }

  return (
    false
  );
}

function normalizeQuestion(question: {
  question: {
    id: string;
    subject: Prisma.JsonValue | string;
    chapter: string;
    type: QuestionType;
    prompt: string | null;
    metadata: Prisma.JsonValue;
    imagePath: string | null;
    options: Prisma.JsonValue;
    correctAnswers?: Prisma.JsonValue;
    answerPolicy: Prisma.JsonValue | string;
  };
  orderIndex: number;
  section: string;
}) {
  return {
    id: question.question.id,
    subject: question.question.subject,
    chapter: question.question.chapter,
    section: question.section,
    orderIndex: question.orderIndex,
    type: question.question.type,
    prompt: question.question.prompt,
    table: getQuestionTable(question.question.metadata),
    imagePath: question.question.imagePath,
    options: (question.question.options as QuestionOption[] | null) ?? null,
    correctAnswers: Array.isArray(question.question.correctAnswers)
      ? (question.question.correctAnswers as string[]).filter(Boolean)
      : [],
    answerPolicy: question.question.answerPolicy,
  } as QuestionPayload;
}

async function withTiming<T>(name: string, fn: () => Promise<T>): Promise<T> {
  if (process.env.NODE_ENV !== "development") {
    return await fn();
  }
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const end = performance.now();
    console.log(`[data] ${name} took ${Math.round(end - start)}ms`);
  }
}

export async function getDashboardData() {
  try {
    return await unstable_cache(
      async () => {
        return withTiming("getDashboardData", async () => {
          const [tests, questions, attempts, totalQuestions] = await Promise.all([
            prisma.test.findMany({
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                name: true,
                totalQuestions: true,
                durationMinutes: true,
                mode: true,
                published: true,
                testCode: true,
                createdAt: true,
                _count: { select: { attempts: true } },
              },
              take: 10,
            }),
            prisma.question.groupBy({ by: ["subject"], _count: { _all: true } }),
            prisma.attempt.findMany({
              orderBy: { startedAt: "desc" },
              take: 5,
              select: {
                id: true,
                studentName: true,
                status: true,
                startedAt: true,
                test: {
                  select: {
                    id: true,
                    name: true,
                    testCode: true,
                  },
                },
              },
            }),
            prisma.question.count(),
          ]);

          const normalizedQuestions = Array.from(
            questions.reduce((groups, group) => {
              const subject = getSubjectLabel(group.subject);
              const current = groups.get(subject) ?? { subject, _count: { _all: 0 } };
              current._count._all += group._count._all;
              groups.set(subject, current);
              return groups;
            }, new Map<string, { subject: string; _count: { _all: number } }>()).values(),
          );

          return { tests, questions: normalizedQuestions, attempts, totalQuestions };
        });
      },
      ["admin-dashboard"],
      { revalidate: 30, tags: ["tests", "attempts", "questions"] }
    )();
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return { tests: [], questions: [], attempts: [], totalQuestions: 0 };
    }

    throw error;
  }
}

export async function getStudentHomeSummary() {
  try {
    return await unstable_cache(
      async () => {
        return withTiming("getStudentHomeSummary", async () => {
          const summary = await prisma.test.aggregate({
            where: {
              published: true,
            },
            _sum: {
              totalQuestions: true,
            },
          });

          return { totalQuestions: summary._sum.totalQuestions ?? 0 };
        });
      },
      ["student-home-summary"],
      { revalidate: 60, tags: ["tests"] }
    )();
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return { totalQuestions: 0 };
    }
    throw error;
  }
}

export async function getQuestionBankSummary() {
  try {
    return await unstable_cache(
      async () => {
        return withTiming("getQuestionBankSummary", async () => {
          const [total, grouped, chapters] = await Promise.all([
            prisma.question.count(),
            prisma.question.groupBy({ by: ["subject", "type"], _count: { _all: true } }),
            prisma.question.findMany({ select: { subject: true, chapter: true }, distinct: ["subject", "chapter"], orderBy: [{ subject: "asc" }, { chapter: "asc" }] }),
          ]);

          const normalizedGrouped = grouped.map((group) => ({
            subject: getSubjectLabel(group.subject),
            type: group.type,
            _count: group._count,
          }));

          const normalizedChapters = chapters.map((chapter) => ({
            subject: getSubjectLabel(chapter.subject),
            chapter: chapter.chapter,
          }));

          return { total, grouped: normalizedGrouped, chapters: normalizedChapters };
        });
      },
      ["question-bank-summary"],
      { revalidate: 60, tags: ["questions"] }
    )();
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return { total: 0, grouped: [], chapters: [] };
    }
    throw error;
  }
}

export async function getStudentsForAdmin() {
  try {
    return await prisma.student.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        createdAt: true,
        _count: {
          select: {
            attempts: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return [];
    }

    throw error;
  }
}


export async function getStudentAttemptCount(studentId: string) {
  try {
    return await unstable_cache(
      async () => {
        return withTiming("getStudentAttemptCount", async () => {
          return await prisma.attempt.count({
            where: {
              studentId,
            },
          });
        });
      },
      [`attempt-count-${studentId}`],
      { revalidate: 30, tags: ["attempts"] }
    )();
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return 0;
    }
    throw error;
  }
}

export async function getTestsForListing(studentId?: string, options?: { includeUnpublished?: boolean }) {
  // IMPORTANT: This fetches ONLY regular tests from the Test table
  // These are for major tests and subject sections at /sections/*
  // Arena/Competitive tests are in LiveTest table and shown at /live-arena only
  // There should be NO overlap between these two - they are completely isolated
  try {
    return await unstable_cache(
      async () => {
        return withTiming("getTestsForListing", async () => {
          const [tests, studentAttemptCounts] = await Promise.all([
            prisma.test.findMany({
              where: options?.includeUnpublished ? undefined : { published: true },
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                name: true,
                description: true,
                durationMinutes: true,
                totalQuestions: true,
                mode: true,
                testCode: true,
                published: true,
                config: true,
                _count: { select: { attempts: true, liveTests: true } },
                testQuestions: {
                  select: {
                    subject: true,
                    chapter: true,
                  },
                },
              },
            }),
            studentId
              ? prisma.attempt.groupBy({
                  by: ["testId"],
                  where: { studentId },
                  _count: { _all: true },
                })
              : Promise.resolve([]),
          ]);

          const studentAttemptCountMap = new Map(studentAttemptCounts.map((item) => [item.testId, item._count._all]));

          return tests.map((test) => ({
            ...test,
            studentAttemptCount: studentId ? (studentAttemptCountMap.get(test.id) ?? 0) : test._count.attempts,
          }));
        });
      },
      [`tests-listing-${studentId ?? "anon"}-${options?.includeUnpublished ?? "false"}`],
      { revalidate: 30, tags: ["tests", "attempts"] }
    )();
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return [];
    }
    throw error;
  }
}

export async function getStudentAnalytics(studentId: string) {
  return withTiming("getStudentAnalytics", async () => {
    try {
      const attempts = await prisma.attempt.findMany({
        where: {
          studentId,
          status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED] },
          result: { not: Prisma.JsonNull },
        },
        select: {
          id: true,
          submittedAt: true,
          result: true,
          test: {
            select: {
              id: true,
              name: true,
              testCode: true,
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      });

      const parsedAttempts = attempts.map((attempt) => {
        const result = attempt.result as {
          score: number;
          summary: { accuracy: number; correct: number; incorrect: number; attempted: number };
          subjectWise: Array<{ subject: string; score: number; accuracy: number }>;
        };

        return {
          id: attempt.id,
          testId: attempt.test.id,
          testName: attempt.test.name,
          testCode: attempt.test.testCode,
          submittedAt: attempt.submittedAt?.toISOString() ?? null,
          score: result.score,
          accuracy: result.summary.accuracy,
          correct: result.summary.correct,
          incorrect: result.summary.incorrect,
          attempted: result.summary.attempted,
          subjectWise: result.subjectWise.map((subject) => ({
            ...subject,
            subject: getSubjectLabel(subject.subject),
          })),
        };
      });

      const totalSubmitted = parsedAttempts.length;
      const bestScore = parsedAttempts.reduce((best, attempt) => Math.max(best, attempt.score), 0);
      const averageScore = totalSubmitted > 0 ? Math.round(parsedAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / totalSubmitted) : 0;
      const averageAccuracy = totalSubmitted > 0 ? Math.round(parsedAttempts.reduce((sum, attempt) => sum + attempt.accuracy, 0) / totalSubmitted) : 0;

      const subjectTotals = new Map<string, { score: number; accuracy: number; count: number }>();

      for (const attempt of parsedAttempts) {
        for (const subject of attempt.subjectWise) {
          const current = subjectTotals.get(subject.subject) ?? { score: 0, accuracy: 0, count: 0 };
          subjectTotals.set(subject.subject, {
            score: current.score + subject.score,
            accuracy: current.accuracy + subject.accuracy,
            count: current.count + 1,
          });
        }
      }

      const subjectAverages = Array.from(subjectTotals.entries()).map(([subject, totals]) => ({
        subject,
        averageScore: Math.round(totals.score / totals.count),
        averageAccuracy: Math.round(totals.accuracy / totals.count),
      })).sort((left, right) => right.averageScore - left.averageScore);

      const strongestSubject = [...subjectAverages].sort((left, right) => right.averageScore - left.averageScore)[0] ?? null;
      const weakestSubject = [...subjectAverages].sort((left, right) => left.averageScore - right.averageScore)[0] ?? null;

      return {
        totalSubmitted,
        bestScore,
        averageScore,
        averageAccuracy,
        subjectAverages,
        strongestSubject,
        weakestSubject,
        recentAttempts: parsedAttempts.slice(0, 5),
      };
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        return {
          totalSubmitted: 0,
          bestScore: 0,
          averageScore: 0,
          averageAccuracy: 0,
          subjectAverages: [],
          strongestSubject: null,
          weakestSubject: null,
          recentAttempts: [],
        };
      }

      throw error;
    }
  });
}

export async function getInstructionData(testId: string) {
  try {
    return await unstable_cache(
      async () => {
        return withTiming("getInstructionData", async () => {
          return await prisma.test.findUnique({
            where: { id: testId },
            select: {
              id: true,
              testCode: true,
              name: true,
              totalQuestions: true,
              durationMinutes: true,
              incorrectMarks: true,
            },
          });
        });
      },
      [`test-instructions-${testId}`],
      { revalidate: 60, tags: ["tests"] }
    )();
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return null;
    }
    throw error;
  }
}

export async function startAttempt(testId: string, student?: { id: string; username: string; displayName: string | null }) {
  return withTiming("startAttempt", async () => {
    const test = await withRetry(() =>
      prisma.test.findUnique({
        where: { id: testId },
        select: {
          id: true,
          testQuestions: {
            orderBy: { orderIndex: "asc" },
            select: {
              questionId: true,
            },
          },
        },
      })
    );

    if (!test) {
      throw new Error("Test not found.");
    }

    const answers = Object.fromEntries(
      test.testQuestions.map((row) => [row.questionId, getInitialAnswerState()]),
    );

    const attempt = await withRetry(() =>
      prisma.attempt.create({
        data: {
          testId,
          studentId: student?.id,
          studentName: student?.displayName ?? student?.username,
          answers,
        },
        select: { id: true },
      })
    );

    return attempt;
  });
}

export async function getAttemptData(attemptId: string, studentId?: string, includeCorrectAnswers = false) {
  return withTiming("getAttemptData", async () => {
    // Step 1: Lightweight query for attempt state + test metadata (no question content)
    let attemptMeta;

    attemptMeta = await withRetry(() =>
      prisma.attempt.findFirst({
        where: {
          id: attemptId,
          ...(studentId ? { studentId } : {}),
        },
        select: {
          id: true,
          status: true,
          answers: true,
          currentQuestionIndex: true,
          tabSwitchCount: true,
          totalTimeSpentSeconds: true,
          startedAt: true,
          result: true,
          test: {
            select: {
              id: true,
              testCode: true,
              name: true,
              durationMinutes: true,
              totalQuestions: true,
              mode: true,
              correctMarks: true,
              incorrectMarks: true,
              unansweredMarks: true,
              totalEvaluatedQuestions: true,
            },
          },
        },
      })
    );

    if (!attemptMeta) {
      return null;
    }

    // Step 2: Fetch test questions — cached because question content is static for a given test
    const testId = attemptMeta.test.id;
    const testQuestions = await unstable_cache(
      async () => {
        return prisma.testQuestion.findMany({
          where: { testId },
          orderBy: { orderIndex: "asc" },
          select: {
            section: true,
            orderIndex: true,
            question: {
              select: {
                id: true,
                subject: true,
                chapter: true,
                type: true,
                prompt: true,
                options: true,
                imagePath: true,
                correctAnswers: includeCorrectAnswers,
                answerPolicy: true,
                metadata: true,
              },
            },
          },
        });
      },
      [`test-questions-${testId}-${includeCorrectAnswers}`],
      { revalidate: 300, tags: ["tests", "questions"] }
    )();

    const questions = testQuestions.map(normalizeQuestion);
    const answers = Object.fromEntries(
      Object.entries((attemptMeta.answers as StoredAnswersMap) ?? {}).map(([questionId, answer]) => [questionId, normalizeStoredAnswer(answer)]),
    ) as StoredAnswersMap;
    const palette = questions.map((question) => ({
      id: question.id,
      orderIndex: question.orderIndex,
      status: getPaletteStatus(answers[question.id] ?? getInitialAnswerState()),
    }));

    return {
      attempt: {
        id: attemptMeta.id,
        status: attemptMeta.status,
        answers: attemptMeta.answers,
        currentQuestionIndex: attemptMeta.currentQuestionIndex,
        tabSwitchCount: attemptMeta.tabSwitchCount,
        totalTimeSpentSeconds: attemptMeta.totalTimeSpentSeconds,
        startedAt: attemptMeta.startedAt,
        result: attemptMeta.result,
      },
      test: {
        ...attemptMeta.test,
        testQuestions,
      },
      questions,
      answers,
      palette,
    };
  });
}

export async function getQuestionDetails(questionId: string, includeCorrectAnswers = false) {
  return withTiming("getQuestionDetails", async () => {
    return prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        subject: true,
        chapter: true,
        type: true,
        prompt: true,
        options: true,
        imagePath: true,
        correctAnswers: includeCorrectAnswers,
        answerPolicy: true,
        metadata: true,
      },
    });
  });
}

export async function getAttemptMetadata(attemptId: string, studentId?: string) {
  return withTiming("getAttemptMetadata", async () => {
    const attempt = await prisma.attempt.findFirst({
      where: {
        id: attemptId,
        ...(studentId ? { studentId } : {}),
      },
      select: {
        id: true,
        status: true,
        answers: true,
        currentQuestionIndex: true,
        tabSwitchCount: true,
        totalTimeSpentSeconds: true,
        startedAt: true,
        test: {
          select: {
            id: true,
            testCode: true,
            name: true,
            durationMinutes: true,
            totalQuestions: true,
            mode: true,
            testQuestions: {
              orderBy: { orderIndex: "asc" },
              select: {
                section: true,
                orderIndex: true,
                subject: true,
                chapter: true,
                questionId: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      return null;
    }

    const answers = Object.fromEntries(
      Object.entries((attempt.answers as StoredAnswersMap) ?? {}).map(([questionId, answer]) => [questionId, normalizeStoredAnswer(answer)]),
    ) as StoredAnswersMap;

    const palette = attempt.test.testQuestions.map((tq) => ({
      id: tq.questionId,
      orderIndex: tq.orderIndex,
      status: getPaletteStatus(answers[tq.questionId] ?? getInitialAnswerState()),
    }));

    return {
      attempt: {
        id: attempt.id,
        status: attempt.status,
        answers: attempt.answers,
        currentQuestionIndex: attempt.currentQuestionIndex,
        tabSwitchCount: attempt.tabSwitchCount,
        totalTimeSpentSeconds: attempt.totalTimeSpentSeconds,
        startedAt: attempt.startedAt,
      },
      test: {
        id: attempt.test.id,
        testCode: attempt.test.testCode,
        name: attempt.test.name,
        durationMinutes: attempt.test.durationMinutes,
        totalQuestions: attempt.test.totalQuestions,
        mode: attempt.test.mode,
        questionsMetadata: attempt.test.testQuestions.map((tq) => ({
          id: tq.questionId,
          orderIndex: tq.orderIndex,
          subject: tq.subject,
          section: tq.section,
          chapter: tq.chapter,
        })),
      },
      palette,
    };
  });
}

export async function persistAttempt(params: {
  attemptId: string;
  studentId?: string;
  answers: StoredAnswersMap;
  currentQuestionIndex: number;
  tabSwitchCount: number;
  totalTimeSpentSeconds: number;
}) {
  // Use updateMany with compound where to avoid a separate findFirst query.
  // This cuts DB round-trips from 2 to 1, critical under concurrent load.
  const result = await withRetry(() =>
    prisma.attempt.updateMany({
      where: {
        id: params.attemptId,
        ...(params.studentId ? { studentId: params.studentId } : {}),
      },
      data: {
        answers: params.answers,
        currentQuestionIndex: params.currentQuestionIndex,
        tabSwitchCount: params.tabSwitchCount,
        totalTimeSpentSeconds: params.totalTimeSpentSeconds,
      },
    })
  );

  if (result.count === 0) {
    throw new Error("Attempt not found.");
  }

  return result;
}

export async function submitAttempt(attemptId: string, autoSubmitted = false, studentId?: string) {
  const attemptData = await getAttemptData(attemptId, studentId, true);

  if (!attemptData) {
    throw new Error("Attempt not found.");
  }

  if (attemptData.attempt.status !== AttemptStatus.IN_PROGRESS && attemptData.attempt.result) {
    return attemptData.attempt;
  }

  const result = evaluateAttempt(
    {
      id: attemptData.test.id,
      mode: attemptData.test.mode as TestMode,
      correctMarks: attemptData.test.correctMarks,
      incorrectMarks: attemptData.test.incorrectMarks,
      unansweredMarks: attemptData.test.unansweredMarks,
      totalQuestions: attemptData.test.totalQuestions,
      totalEvaluatedQuestions: attemptData.test.totalEvaluatedQuestions,
    },
    attemptData.questions,
    attemptData.answers,
  );

  return withRetry(() =>
    prisma.attempt.update({
      where: { id: attemptId },
      data: {
        status: autoSubmitted ? AttemptStatus.AUTO_SUBMITTED : AttemptStatus.SUBMITTED,
        submittedAt: new Date(),
        result,
      },
    })
  );
}

export async function getLiveArenaData(studentId?: string) {
  // IMPORTANT: Arena/Live Tests are ONLY fetched from LiveTest table
  // Regular tests (from Test table) should NEVER appear in the arena section
  // Arena section (/live-arena) is completely isolated from major/subject test sections
  try {
    return await unstable_cache(
      async () => {
        return withTiming("getLiveArenaData", async () => {
          const [liveTests, studentStats, registeredBattleIds, attemptedBattleIds] = await Promise.all([
            prisma.liveTest.findMany({
              where: {
                visibility: "PUBLIC",
                status: { not: "CANCELLED" },
              },
              orderBy: { startTime: "asc" },
              include: {
                _count: { select: { attempts: true } },
                testTemplate: {
                  select: {
                    totalQuestions: true,
                    durationMinutes: true,
                  },
                },
              },
            }),
            studentId ? prisma.liveTestAttempt.aggregate({
              where: { studentId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } },
              _count: { _all: true },
              _max: { score: true }
            }) : null,
            studentId ? prisma.battleRegistration.findMany({
                where: { studentId },
                select: { liveTestId: true },
            }) : [],
            studentId ? prisma.liveTestAttempt.findMany({
                where: { studentId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } },
                select: { liveTestId: true },
            }) : [],
          ]);

          const registeredSet = new Set(registeredBattleIds.map(r => r.liveTestId));
          const attemptedSet = new Set(attemptedBattleIds.map(r => r.liveTestId));

          return {
            liveTests: liveTests.map(t => ({
                ...t,
                isRegistered: registeredSet.has(t.id),
                hasAttempted: attemptedSet.has(t.id),
            })),
            stats: {
              battlesAttempted: studentStats?._count._all ?? 0,
              bestScore: studentStats?._max.score ?? 0,
            }
          };
        });
      },
      [`live-arena-${studentId ?? "anon"}`],
      { revalidate: 30, tags: ["live-arena", "live-tests"] }
    )();
  } catch (error) {
    if (isDatabaseUnavailableError(error)) return { liveTests: [], stats: { battlesAttempted: 0, bestScore: 0 } };
    throw error;
  }
}

export async function getCachedLiveTestDetails(liveTestId: string) {
  const cachedData = await unstable_cache(
    async () => {
      const liveTest = await withRetry(() =>
        prisma.liveTest.findUnique({
          where: { id: liveTestId },
          include: {
            testTemplate: {
              select: {
                id: true,
                name: true,
                testCode: true,
                totalQuestions: true,
                totalEvaluatedQuestions: true,
                durationMinutes: true,
                correctMarks: true,
                incorrectMarks: true,
                unansweredMarks: true,
                mode: true,
                testQuestions: {
                  orderBy: { orderIndex: "asc" },
                  select: {
                    section: true,
                    orderIndex: true,
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
                        metadata: true,
                      },
                    },
                  },
                },
              },
            },
          },
        })
      );
      return liveTest;
    },
    [`live-test-data-${liveTestId}`],
    { revalidate: 60, tags: ["live-tests", "questions"] }
  )();

  if (!cachedData) return null;

  // unstable_cache serializes Date objects to ISO strings.
  // Reconstitute them so downstream comparisons (e.g. now >= startTime) work correctly.
  return {
    ...cachedData,
    startTime: new Date(cachedData.startTime),
    endTime: new Date(cachedData.endTime),
    createdAt: new Date(cachedData.createdAt),
    updatedAt: new Date(cachedData.updatedAt),
  };
}

export async function getLiveTestData(liveTestId: string, studentId?: string) {
  return withTiming("getLiveTestData", async () => {
    // Step 1: Cached query for live test + template + questions (static content)
    const liveTestWithDates = await getCachedLiveTestDetails(liveTestId);

    if (!liveTestWithDates) return null;

    const questions = liveTestWithDates.testTemplate.testQuestions.map(normalizeQuestion);

    // Step 2: Uncached per-student attempt lookup (must be fresh)
    let attempt = null;
    if (studentId) {
      try {
        const studentAttempts = await withRetry(() =>
          prisma.liveTestAttempt.findMany({
            where: { liveTestId, studentId },
            take: 1,
          })
        );
        attempt = studentAttempts[0] ?? null;
      } catch (error) {
        console.error("[getLiveTestData] Failed to fetch student attempt:", error);
        // Don't fail the whole page if we can't look up the attempt
        attempt = null;
      }
    }

    return {
      liveTest: {
        ...liveTestWithDates,
        attempts: attempt ? [attempt] : [],
      },
      questions,
      attempt,
    };
  });
}

export async function startLiveAttempt(liveTestId: string, student: { id: string; username: string; displayName: string | null }) {
  return withTiming("startLiveAttempt", async () => {
    const liveTest = await getCachedLiveTestDetails(liveTestId);

    if (!liveTest) throw new Error("Live test not found.");

    const now = new Date();
    if (now < liveTest.startTime) throw new Error("Test has not started yet.");
    if (now > liveTest.endTime) throw new Error("Test has already ended.");

    // Check if attempt already exists
    const existing = await withRetry(() =>
      prisma.liveTestAttempt.findUnique({
        where: { liveTestId_studentId: { liveTestId, studentId: student.id } },
      })
    );

    if (existing) return existing;

    const answers = Object.fromEntries(
      liveTest.testTemplate.testQuestions.map((row) => [row.question.id, getInitialAnswerState()]),
    );

    try {
      return await withRetry(() =>
        prisma.liveTestAttempt.create({
          data: {
            liveTestId,
            studentId: student.id,
            studentName: student.displayName ?? student.username,
            answers,
            startedAt: now,
          },
        })
      );
    } catch (error) {
      // Handle race condition: if another request created the attempt between
      // our findUnique and create, we get a unique constraint violation (P2002).
      // Return the existing record instead of failing.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const raceWinner = await prisma.liveTestAttempt.findUnique({
          where: { liveTestId_studentId: { liveTestId, studentId: student.id } },
        });
        if (raceWinner) return raceWinner;
      }
      throw error;
    }
  });
}

export async function persistLiveAttempt(params: {
  attemptId: string;
  studentId: string;
  answers: StoredAnswersMap;
  timeConsumedSeconds: number;
}) {
  return withRetry(() =>
    prisma.liveTestAttempt.update({
      where: { 
        id: params.attemptId,
        studentId: params.studentId,
      },
      data: {
        answers: params.answers,
        timeConsumedSeconds: params.timeConsumedSeconds,
        lastSavedAt: new Date(),
      },
    })
  );
}

export async function submitLiveAttempt(attemptId: string, studentId: string, autoSubmitted = false) {
  const attempt = await withRetry(() =>
    prisma.liveTestAttempt.findUnique({
      where: { id: attemptId, studentId },
    })
  );

  if (!attempt) throw new Error("Attempt not found.");
  if (attempt.status !== "IN_PROGRESS") return attempt;

  const liveTestWithDates = await getCachedLiveTestDetails(attempt.liveTestId);
  if (!liveTestWithDates) throw new Error("Live test details not found.");

  const testTemplate = liveTestWithDates.testTemplate;
  const questions = testTemplate.testQuestions.map(normalizeQuestion);
  
  const result = evaluateAttempt(
    {
      id: testTemplate.id,
      mode: testTemplate.mode as any,
      correctMarks: testTemplate.correctMarks,
      incorrectMarks: testTemplate.incorrectMarks,
      unansweredMarks: testTemplate.unansweredMarks,
      totalQuestions: testTemplate.totalQuestions,
      totalEvaluatedQuestions: testTemplate.totalEvaluatedQuestions,
    },
    questions,
    attempt.answers as any,
  );

  return withRetry(() =>
    prisma.liveTestAttempt.update({
      where: { id: attemptId },
      data: {
        status: autoSubmitted ? "AUTO_SUBMITTED" : "SUBMITTED",
        submittedAt: new Date(),
        score: result.score,
        correctAnswers: result.summary.correct,
        wrongAnswers: result.summary.incorrect,
        unanswered: result.summary.unanswered,
        accuracy: result.summary.accuracy,
        result: result as any,
      },
    })
  );
}

// In-memory lock to prevent concurrent auto-finalization of the same live test.
// Without this, 100 students visiting the leaderboard simultaneously would each
// trigger auto-submission of all in-progress attempts, overwhelming the DB.
const autoFinalizeInProgress = new Set<string>();

export async function getLiveLeaderboard(liveTestId: string) {
  return withTiming("getLiveLeaderboard", async () => {
    // Auto-submit any in-progress attempts when the test window has ended.
    // Guarded by an in-memory lock to prevent parallel execution.
    if (!autoFinalizeInProgress.has(liveTestId)) {
      try {
        const liveTest = await withRetry(() =>
          prisma.liveTest.findUnique({ where: { id: liveTestId }, select: { endTime: true } })
        );
        if (liveTest && new Date() > liveTest.endTime) {
          const inProgress = await withRetry(() =>
            prisma.liveTestAttempt.findMany({
              where: { liveTestId, status: "IN_PROGRESS" },
              select: { id: true, studentId: true },
            })
          );

          if (inProgress.length > 0) {
            autoFinalizeInProgress.add(liveTestId);
            try {
              // Process in batches of 5 to avoid overwhelming the connection pool
              const BATCH_SIZE = 5;
              for (let i = 0; i < inProgress.length; i += BATCH_SIZE) {
                const batch = inProgress.slice(i, i + BATCH_SIZE);
                await Promise.allSettled(
                  batch.map((att) =>
                    submitLiveAttempt(att.id, att.studentId, true).catch((err) => {
                      console.error("Failed to auto-submit live attempt:", att.id, err);
                    })
                  )
                );
              }
            } finally {
              autoFinalizeInProgress.delete(liveTestId);
            }
          }
        }
      } catch (err) {
        console.error("Error during live leaderboard auto-finalize:", err);
        autoFinalizeInProgress.delete(liveTestId);
      }
    }

    const attempts = await withRetry(() =>
      prisma.liveTestAttempt.findMany({
        where: {
          liveTestId,
          status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
        },
        select: {
          id: true,
          studentId: true,
          studentName: true,
          score: true,
          timeConsumedSeconds: true,
          submittedAt: true,
          accuracy: true,
        },
        orderBy: [
          { score: "desc" },
          { timeConsumedSeconds: "asc" },
          { submittedAt: "asc" },
        ],
      })
    );

    return attempts.map((attempt, index) => ({
      ...attempt,
      rank: index + 1,
      percentile: attempts.length > 1 
        ? Math.round(((attempts.length - (index + 1)) / (attempts.length - 1)) * 100) 
        : 100,
    }));
  });
}

export async function getAttemptResult(attemptId: string) {
  return withTiming("getAttemptResult", async () => {
    const attempt = await prisma.attempt.findFirst({
      where: { id: attemptId },
      select: {
        id: true,
        studentName: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        totalTimeSpentSeconds: true,
        tabSwitchCount: true,
        result: true,
        test: {
          select: {
            id: true,
            testCode: true,
            name: true,
            totalQuestions: true,
            totalEvaluatedQuestions: true,
          },
        },
      },
    });

    if (attempt) {
      return attempt;
    }

    const liveAttempt = await prisma.liveTestAttempt.findFirst({
      where: { id: attemptId },
      select: {
        id: true,
        studentName: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        timeConsumedSeconds: true,
        result: true,
        liveTest: {
          select: {
            id: true,
            title: true,
            testTemplate: {
              select: {
                id: true,
                testCode: true,
                totalQuestions: true,
                totalEvaluatedQuestions: true,
              },
            },
          },
        },
      },
    });

    if (!liveAttempt) {
      return null;
    }

    return {
      id: liveAttempt.id,
      studentName: liveAttempt.studentName,
      status: liveAttempt.status,
      startedAt: liveAttempt.startedAt,
      submittedAt: liveAttempt.submittedAt,
      totalTimeSpentSeconds: liveAttempt.timeConsumedSeconds,
      tabSwitchCount: 0,
      result: liveAttempt.result,
      test: {
        id: liveAttempt.liveTest.testTemplate.id,
        testCode: liveAttempt.liveTest.testTemplate.testCode,
        name: liveAttempt.liveTest.title,
        totalQuestions: liveAttempt.liveTest.testTemplate.totalQuestions,
        totalEvaluatedQuestions: liveAttempt.liveTest.testTemplate.totalEvaluatedQuestions,
      },
    };
  });
}

export async function getStudentAttemptResult(attemptId: string, studentId: string) {
  return withTiming("getStudentAttemptResult", async () => {
    // Try regular attempts first
    const attempt = await prisma.attempt.findFirst({
      where: {
        id: attemptId,
        studentId,
      },
      select: {
        id: true,
        studentName: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        totalTimeSpentSeconds: true,
        tabSwitchCount: true,
        result: true,
        test: {
          select: {
            id: true,
            testCode: true,
            name: true,
            totalQuestions: true,
            totalEvaluatedQuestions: true,
          },
        },
      },
    });

    if (attempt) return attempt;

    // Try live test attempts
    const liveAttempt = await prisma.liveTestAttempt.findFirst({
      where: {
        id: attemptId,
        studentId,
      },
      select: {
        id: true,
        studentName: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        timeConsumedSeconds: true,
        result: true,
        liveTest: {
          select: {
            id: true,
            title: true,
            testTemplate: {
              select: {
                id: true,
                testCode: true,
                totalQuestions: true,
                totalEvaluatedQuestions: true,
              },
            },
          },
        },
      },
    });

    if (liveAttempt) {
      return {
        id: liveAttempt.id,
        studentName: liveAttempt.studentName,
        status: liveAttempt.status,
        startedAt: liveAttempt.startedAt,
        submittedAt: liveAttempt.submittedAt,
        totalTimeSpentSeconds: liveAttempt.timeConsumedSeconds,
        tabSwitchCount: 0, // Not tracked for live tests
        result: liveAttempt.result,
        test: {
          id: liveAttempt.liveTest.testTemplate.id,
          testCode: liveAttempt.liveTest.testTemplate.testCode,
          name: liveAttempt.liveTest.title,
          totalQuestions: liveAttempt.liveTest.testTemplate.totalQuestions,
          totalEvaluatedQuestions: liveAttempt.liveTest.testTemplate.totalEvaluatedQuestions,
        },
      };
    }

    return null;
  });
}

export async function getSubmittedAttemptResults(studentId?: string, options?: { limit?: number; offset?: number }) {
  // When limit is provided, we fetch (offset + limit) from each table to guarantee
  // correct merged ordering, then slice. This is far cheaper than fetching everything.
  const takeFromEach = options?.limit ? (options.offset ?? 0) + options.limit : undefined;

  try {
    return await unstable_cache(
      async () => {
        return withTiming("getSubmittedAttemptResults", async () => {
          const [attempts, liveAttempts] = await Promise.all([
            prisma.attempt.findMany({
              where: {
                status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED] },
                result: { not: Prisma.JsonNull },
                ...(studentId ? { studentId } : {}),
              },
              select: {
                id: true,
                studentName: true,
                status: true,
                submittedAt: true,
                result: true,
                test: {
                  select: {
                    id: true,
                    name: true,
                    testCode: true,
                  },
                },
              },
              orderBy: { submittedAt: "desc" },
              ...(takeFromEach ? { take: takeFromEach } : {}),
            }),
            prisma.liveTestAttempt.findMany({
              where: {
                status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED] },
                result: { not: Prisma.JsonNull },
                ...(studentId ? { studentId } : {}),
              },
              select: {
                id: true,
                studentName: true,
                status: true,
                submittedAt: true,
                result: true,
                liveTest: {
                  select: {
                    id: true,
                    title: true,
                    testTemplate: {
                      select: {
                        testCode: true,
                      },
                    },
                  },
                },
              },
              orderBy: { submittedAt: "desc" },
              ...(takeFromEach ? { take: takeFromEach } : {}),
            }),
          ]);

          const normalizedLiveAttempts = liveAttempts.map((la) => ({
            id: la.id,
            studentName: la.studentName,
            status: la.status,
            submittedAt: la.submittedAt,
            result: la.result,
            test: {
              id: la.liveTest.id,
              name: la.liveTest.title,
              testCode: la.liveTest.testTemplate.testCode,
            },
          }));

          const all = [...attempts, ...normalizedLiveAttempts].sort((a, b) => {
            const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
            const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
            return dateB - dateA;
          });

          if (options?.limit) {
            const start = options.offset ?? 0;
            return all.slice(start, start + options.limit);
          }

          return all;
        });
      },
      [`results-${studentId ?? "all"}-${options?.limit ?? "all"}-${options?.offset ?? 0}`],
      { revalidate: 30, tags: ["attempts"] }
    )();
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return [];
    }
    throw error;
  }
}

export async function getSubmittedAttemptResultsCount(studentId?: string) {
  try {
    return await unstable_cache(
      async () => {
        return withTiming("getSubmittedAttemptResultsCount", async () => {
          const [regularCount, liveCount] = await Promise.all([
            prisma.attempt.count({
              where: {
                status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED] },
                result: { not: Prisma.JsonNull },
                ...(studentId ? { studentId } : {}),
              },
            }),
            prisma.liveTestAttempt.count({
              where: {
                status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED] },
                result: { not: Prisma.JsonNull },
                ...(studentId ? { studentId } : {}),
              },
            }),
          ]);
          return regularCount + liveCount;
        });
      },
      [`results-count-${studentId ?? "all"}`],
      { revalidate: 30, tags: ["attempts"] }
    )();
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return 0;
    }
    throw error;
  }
}

// Dummy implementations for test series (pre-existing broken code)
export async function getTestSeriesGroupsWithDocuments() {
  return [] as {
    id: string;
    title: string;
    description: string | null;
    documents: { id: string; title: string; filePath: string }[];
  }[];
}

export async function getUngroupedTestSeriesDocuments() {
  return [] as { id: string; title: string; filePath: string }[];
}

export async function getTestSeriesGroupById(id: string) {
  return {
    id,
    title: "",
    description: "",
    documents: [] as { id: string; title: string; filePath: string }[],
  };
}