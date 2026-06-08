import { getSubmittedAttemptResults } from "@/lib/data";
import { formatDateTime } from "@/lib/format-date-time";
import { requireCurrentStudent } from "@/lib/student-auth";

export default async function StudentResultsPage() {
  const student = await requireCurrentStudent();
  const attempts = await getSubmittedAttemptResults(student.id);
  const visibleAttempts = attempts.filter((attempt): attempt is NonNullable<typeof attempt> => attempt !== null);

  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-4 px-0 py-4 sm:gap-6 sm:px-6 sm:py-8">
      <section className="panel rounded-none border-x-0 p-4 sm:rounded-[1.5rem] sm:border-x sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#b26d39]">Student Results</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#2f241c] sm:text-4xl">Submitted Test Results</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-[#6d5a49] sm:text-lg">Open any submitted result to review subject-wise performance and full question-wise analysis.</p>
      </section>

      <section className="panel rounded-none border-x-0 p-4 sm:rounded-[1.4rem] sm:border-x sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-[#2f241c] sm:text-2xl">All Submitted Results</h2>
          <div className="rounded-full bg-[#f6e4d3] px-3 py-1 text-sm font-semibold text-[#b85f20]">{visibleAttempts.length} results</div>
        </div>

        <div className="mt-5 grid gap-3 md:hidden">
          {visibleAttempts.length > 0 ? (
            visibleAttempts.map((attempt) => {
              const result = attempt.result as { score?: number } | null;

              return (
                <div key={attempt.id} className="rounded-[1rem] border border-[#e6d9cb] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[#2f241c]">{attempt.test.name}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[#8a6a52]">{attempt.test.testCode ?? `TST-${attempt.test.id.slice(-8).toUpperCase()}`}</div>
                    </div>
                    <div className="rounded-full bg-[#f6e4d3] px-3 py-1 text-xs font-semibold text-[#b85f20]">{result?.score ?? "-"}</div>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-[#65584a]">
                    <div>Student: {attempt.studentName ?? attempt.id.slice(-6)}</div>
                    <div>Status: {attempt.status}</div>
                    <div>Submitted: {attempt.submittedAt ? formatDateTime(attempt.submittedAt) : "-"}</div>
                  </div>
                  <a href={`/results/${attempt.id}`} className="btn-primary mt-4 w-full text-sm">
                    View Analysis
                  </a>
                </div>
              );
            })
          ) : (
            <div className="rounded-[1rem] border border-dashed border-[#d9cfc3] bg-[#fcfbf8] p-5 text-center text-sm text-[#736455]">
              No submitted results yet.
            </div>
          )}
        </div>

        <div className="mt-5 hidden overflow-hidden rounded-[1rem] border border-[#e6d9cb] md:block">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-[#f7efe6] text-[#7a5f4c]">
              <tr>
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Test</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Score</th>
                <th className="px-4 py-3 font-semibold">Submitted</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleAttempts.map((attempt) => {
                const result = attempt.result as { score?: number } | null;

                return (
                  <tr key={attempt.id} className="border-t border-[#eee3d7] bg-white">
                    <td className="px-4 py-3 font-medium text-[#2f241c]">{attempt.studentName ?? attempt.id.slice(-6)}</td>
                    <td className="px-4 py-3 text-[#65584a]">
                      <div className="font-medium text-[#2f241c]">{attempt.test.name}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[#8a6a52]">{attempt.test.testCode ?? `TST-${attempt.test.id.slice(-8).toUpperCase()}`}</div>
                    </td>
                    <td className="px-4 py-3 text-[#65584a]">{attempt.status}</td>
                    <td className="px-4 py-3 text-[#65584a]">{result?.score ?? "-"}</td>
                    <td className="px-4 py-3 text-[#65584a]">{attempt.submittedAt ? formatDateTime(attempt.submittedAt) : "-"}</td>
                    <td className="px-4 py-3">
                      <a href={`/results/${attempt.id}`} className="btn-primary inline-flex px-3 py-2 text-xs">
                        View Analysis
                      </a>
                    </td>
                  </tr>
                );
              })}
              {visibleAttempts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#736455]">
                    No submitted results yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}