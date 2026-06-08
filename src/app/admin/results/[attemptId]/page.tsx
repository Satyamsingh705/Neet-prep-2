import Link from "next/link";
import { notFound } from "next/navigation";
import type { ResultDashboardProps } from "@/components/results/result-dashboard";
import ResultDashboardClient from "@/components/results/result-dashboard-client";
import { requireCurrentAdmin } from "@/lib/admin-auth";
import { getAttemptResult } from "@/lib/data";

export default async function AdminAttemptResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  await requireCurrentAdmin();
  const { attemptId } = await params;
  const attempt = await getAttemptResult(attemptId);

  if (!attempt || !attempt.result) {
    notFound();
  }

  return (
    <main className="mx-auto flex max-w-[1480px] flex-col gap-6 px-6 py-8">
      <div className="flex justify-end">
        <Link href="/admin/results" className="btn-secondary">
          Back To Results
        </Link>
      </div>
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
    </main>
  );
}
