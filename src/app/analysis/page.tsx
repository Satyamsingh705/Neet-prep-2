import Link from "next/link";
import { StudentPortalAnalysis } from "@/components/student/student-portal-analysis";
import { getStudentAnalytics, getStudentAttemptCount, getStudentHomeSummary, getTestsForListing } from "@/lib/data";
import { requireCurrentStudent } from "@/lib/student-auth";

export default async function StudentAnalysisPage() {
  const student = await requireCurrentStudent();
  const [summary, tests, totalAttempts, analytics] = await Promise.all([
    getStudentHomeSummary(),
    getTestsForListing(student.id),
    getStudentAttemptCount(student.id),
    getStudentAnalytics(student.id),
  ]);

  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-4 px-0 py-4 sm:gap-6 sm:px-6 sm:py-8">
      <section className="panel rounded-none border-x-0 p-4 sm:rounded-[1.5rem] sm:border-x sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#b26d39]">Student Analysis</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#2f241c] sm:text-4xl">Full analysis with clear weak-point mapping.</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[#6d5a49] sm:text-lg">Use this dashboard to see where marks are leaking, which subjects need immediate correction, and what to cover before the next test.</p>
          </div>
          <Link href="/" className="btn-secondary">
            Back To Home
          </Link>
        </div>
      </section>

      <StudentPortalAnalysis
        totalQuestions={summary.totalQuestions}
        liveTests={tests.length}
        totalAttempts={totalAttempts}
        analytics={analytics}
      />
    </main>
  );
}