import Link from "next/link";
import { getStudentAttemptCount, getStudentHomeSummary, getTestsForListing } from "@/lib/data";
import { getTestsBySection, studentSections } from "@/lib/student-sections";
import { StudentLoginForm } from "@/components/student/student-login-form";
import { getCurrentStudent } from "@/lib/student-auth";

export default async function HomePage() {
  const student = await getCurrentStudent();

  if (!student) {
    return (
      <main className="mx-auto flex max-w-[980px] flex-col gap-4 px-0 py-4 sm:gap-6 sm:px-6 sm:py-10">
        <section className="panel rounded-none border-x-0 p-4 sm:rounded-[1.6rem] sm:border-x sm:p-8 lg:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#b56d3d]">Student Access</p>
          <h1 className="mt-3 text-3xl leading-[1.05] font-semibold text-[#2f241c] sm:text-4xl lg:text-5xl">Student login required.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#65584a] sm:text-lg sm:leading-8">Use your student ID and password to open the portal, start tests, and view question-wise analysis in results.</p>
          <div className="mt-4 rounded-[1rem] bg-[#fff7ef] px-4 py-3 text-sm text-[#6d5a49]">
            Sign in with any active student account available in your current database.
          </div>
          <StudentLoginForm />
        </section>
      </main>
    );
  }

  const [summary, tests, totalAttempts] = await Promise.all([
    getStudentHomeSummary(),
    getTestsForListing(student.id),
    getStudentAttemptCount(student.id),
  ]);
  const sectionTestsMap = getTestsBySection(tests);

  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-4 px-0 py-4 sm:gap-6 sm:px-6 sm:py-8">
      <section className="panel overflow-hidden rounded-none border-x-0 sm:rounded-[1.6rem] sm:border-x">
        <div className="grid gap-6 px-5 py-6 sm:gap-8 sm:px-8 sm:py-8 lg:grid-cols-[1.25fr_0.95fr] lg:px-10 lg:py-10">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#b56d3d]">NTA-style practice engine</p>
            <h1 className="max-w-[11ch] text-3xl leading-[1.05] font-semibold text-[#2f241c] sm:text-4xl lg:text-5xl">
              NEET mock tests with a real exam workflow.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[#65584a] sm:text-lg sm:leading-8">
              &ldquo;Success in NEET is not built in one day. Every mock test you finish is one more step toward the rank you want. Stay focused, stay consistent, and trust your preparation.&rdquo;
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/analysis" className="btn-primary">
                Open Analysis
              </Link>
              <Link href="/results" className="btn-secondary">
                View Results
              </Link>
            </div>
          </div>
          <div className="grid gap-4 self-start sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div className="rounded-[1.2rem] border border-[#ead9c9] bg-[#fffdfa] p-5">
              <div className="text-sm uppercase tracking-[0.25em] text-[#957660]">Questions In Live Tests</div>
              <div className="mt-2 text-4xl font-semibold text-[#d7671b]">{summary.totalQuestions}</div>
              <div className="mt-2 text-sm text-[#6d5a49]">Total questions currently available across published student tests.</div>
            </div>
            <div className="rounded-[1.2rem] border border-[#ead9c9] bg-[#fffdfa] p-5">
              <div className="text-sm uppercase tracking-[0.25em] text-[#957660]">Live Tests</div>
              <div className="mt-2 text-4xl font-semibold text-[#d7671b]">{tests.length}</div>
              <div className="mt-2 text-sm text-[#6d5a49]">Admin-defined mock tests ready to launch.</div>
            </div>
            <div className="rounded-[1.2rem] border border-[#ead9c9] bg-[#fffdfa] p-5">
              <div className="text-sm uppercase tracking-[0.25em] text-[#957660]">Attempts</div>
              <div className="mt-2 text-4xl font-semibold text-[#d7671b]">{totalAttempts}</div>
              <div className="mt-2 text-sm text-[#6d5a49]">Stored attempt sessions with autosave and analytics.</div>
            </div>
            <div className="rounded-[1.2rem] border border-[#ead9c9] bg-[#fffdfa] p-5">
              <div className="text-sm uppercase tracking-[0.25em] text-[#957660]">Marking Scheme</div>
              <div className="mt-2 text-3xl font-semibold text-[#d7671b]">+4 / -1 / 0</div>
              <div className="mt-2 text-sm text-[#6d5a49]">Supports dropped or multiple-correct questions under NEET rules.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel rounded-none border-x-0 p-4 sm:rounded-[1.4rem] sm:border-x sm:p-6">
        <div>
          <h2 className="text-xl font-semibold text-[#2f241c] sm:text-2xl">Student Test Sections</h2>
          <p className="mt-2 text-sm leading-6 text-[#65584a]">Choose one card to open all tests available inside that section.</p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {studentSections.map((section) => {
            const count = sectionTestsMap[section.id].length;

            return (
              <Link
                key={section.id}
                href={`/sections/${section.id}`}
                className="rounded-[1.2rem] border border-[#ead9c9] bg-[#fffdfa] p-5 transition hover:border-[#d9b28c] hover:bg-[#fff7ef]"
              >
                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#b56d3d]">Section</div>
                <div className="mt-3 text-2xl font-semibold text-[#2f241c]">{section.title}</div>
                <div className="mt-2 text-sm leading-6 text-[#65584a]">{section.description}</div>
                <div className="mt-4 inline-flex rounded-full bg-[#f5f0e8] px-3 py-1 text-sm font-semibold text-[#8a6a52]">{count} tests</div>
              </Link>
            );
          })}

          <Link href="/test-series" className="rounded-[1.2rem] border border-dashed border-[#d9b28c] bg-[#fff7ef] p-5 transition hover:border-[#c88755] hover:bg-[#fff1df]">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#b56d3d]">Section</div>
              <div className="rounded-full bg-[#f6e4d3] px-3 py-1 text-xs font-semibold text-[#b85f20]">PDF Series</div>
            </div>
            <div className="mt-3 text-2xl font-semibold text-[#2f241c]">Test Series</div>
            <div className="mt-2 text-sm leading-6 text-[#65584a]">
              Open uploaded test series PDFs in a new tab from this dedicated section.
            </div>
            <div className="mt-4 inline-flex rounded-full bg-[#f5f0e8] px-3 py-1 text-sm font-semibold text-[#8a6a52]">View PDFs</div>
          </Link>
        </div>
      </section>
    </main>
  );
}
