import { AdminResultsManager } from "@/components/admin/admin-results-manager";
import { requireCurrentAdmin } from "@/lib/admin-auth";
import { getSubmittedAttemptResults } from "@/lib/data";
import { formatDateTime } from "@/lib/format-date-time";

export default async function AdminResultsPage() {
  await requireCurrentAdmin();
  const attempts = await getSubmittedAttemptResults();

  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-6 px-6 py-8">
      <section className="panel rounded-[1.5rem] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#b26d39]">Admin Results</p>
        <h1 className="mt-2 text-4xl font-semibold text-[#2f241c]">Submitted Student Results</h1>
        <p className="mt-3 max-w-3xl text-lg leading-7 text-[#6d5a49]">Review every submitted attempt and open the full question-wise analysis for each student.</p>
      </section>
      <AdminResultsManager
        attempts={attempts.flatMap((attempt) => {
          if (!attempt) {
            return [];
          }

          const result = attempt.result as { score?: number } | null;

          return [{
            id: attempt.id,
            testId: attempt.test.id,
            studentName: attempt.studentName,
            status: attempt.status,
            score: result?.score ?? null,
            submittedAt: attempt.submittedAt ? formatDateTime(attempt.submittedAt) : null,
            testName: attempt.test.name,
            testCode: attempt.test.testCode,
          }];
        })}
      />
    </main>
  );
}
