import { notFound } from "next/navigation";
import type { ResultDashboardProps } from "@/components/results/result-dashboard";
import ResultDashboardClient from "@/components/results/result-dashboard-client";
import { getStudentAttemptResult } from "@/lib/data";
import { requireCurrentStudent } from "@/lib/student-auth";

export const preferredRegion = "bom1";

export default async function ResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const student = await requireCurrentStudent();
  const { attemptId } = await params;
  const attempt = await getStudentAttemptResult(attemptId, student.id);

  if (!attempt || !attempt.result) {
    notFound();
  }

  return (
    <ResultDashboardClient
      attempt={{
        id: attempt.id,
        studentName: attempt.studentName,
        status: attempt.status,
        startedAt: attempt.startedAt.toISOString(),
        submittedAt: attempt.submittedAt?.toISOString() ?? null,
        totalTimeSpentSeconds: attempt.totalTimeSpentSeconds,
        tabSwitchCount: attempt.tabSwitchCount,
      }}
      test={{
          id: attempt.test.id,
          testCode: attempt.test.testCode,
        name: attempt.test.name,
        totalQuestions: attempt.test.totalQuestions,
        totalEvaluatedQuestions: attempt.test.totalEvaluatedQuestions,
      }}
        result={attempt.result as ResultDashboardProps["result"]}
    />
  );
}
