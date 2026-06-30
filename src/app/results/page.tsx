import { getSubmittedAttemptResults, getSubmittedAttemptResultsCount } from "@/lib/data";
import { requireCurrentStudent } from "@/lib/student-auth";
import { ResultsList } from "@/components/results/results-list";

const INITIAL_PAGE_SIZE = 5;

export default async function StudentResultsPage() {
  const student = await requireCurrentStudent();
  const [attempts, totalCount] = await Promise.all([
    getSubmittedAttemptResults(student.id, { limit: INITIAL_PAGE_SIZE }),
    getSubmittedAttemptResultsCount(student.id),
  ]);
  const visibleAttempts = attempts.filter((attempt): attempt is NonNullable<typeof attempt> => attempt !== null);

  // Serialize dates for client component
  const serializedAttempts = visibleAttempts.map((attempt) => ({
    ...attempt,
    submittedAt: attempt.submittedAt ? new Date(attempt.submittedAt).toISOString() : null,
  }));

  return (
    <main className="flex w-full flex-col gap-4 px-0 py-4 sm:gap-6 sm:px-[1.5%] sm:py-8 xl:px-[2%]">
      <section className="panel rounded-none border-x-0 p-4 sm:rounded-[1.5rem] sm:border-x sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#b26d39]">Student Results</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#2f241c] sm:text-4xl">Submitted Test Results</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-[#6d5a49] sm:text-lg">Open any submitted result to review subject-wise performance and full question-wise analysis.</p>
      </section>

      <section className="panel rounded-none border-x-0 p-4 sm:rounded-[1.4rem] sm:border-x sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-[#2f241c] sm:text-2xl">All Submitted Results</h2>
          <div className="rounded-full bg-[#f6e4d3] px-3 py-1 text-sm font-semibold text-[#b85f20]">{totalCount} results</div>
        </div>

        <ResultsList
          initialAttempts={serializedAttempts}
          totalCount={totalCount}
          pageSize={INITIAL_PAGE_SIZE}
        />
      </section>
    </main>
  );
}