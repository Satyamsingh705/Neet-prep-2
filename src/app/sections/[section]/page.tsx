import Link from "next/link";
import { notFound } from "next/navigation";
import { getTestsForListing } from "@/lib/data";
import { getTestsBySection, studentSections, type StudentSectionId } from "@/lib/student-sections";
import { requireCurrentStudent } from "@/lib/student-auth";

export default async function StudentSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const student = await requireCurrentStudent();
  const { section } = await params;
  const tests = await getTestsForListing(student.id);
  const sectionId = section as StudentSectionId;
  const activeSection = studentSections.find((item) => item.id === sectionId);

  if (!activeSection) {
    notFound();
  }

  const testsBySection = getTestsBySection(tests);
  const activeTests = testsBySection[sectionId];

  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-4 px-0 py-4 sm:gap-6 sm:px-6 sm:py-8">
      <section className="panel rounded-none border-x-0 p-4 sm:rounded-[1.5rem] sm:border-x sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#b26d39]">Student Section</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#2f241c] sm:text-4xl">{activeSection.title}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[#6d5a49] sm:text-lg">{activeSection.description}</p>
          </div>
          <Link href="/" className="btn-secondary">
            Back To Sections
          </Link>
        </div>
      </section>

      <section className="panel rounded-none border-x-0 p-4 sm:rounded-[1.4rem] sm:border-x sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#2f241c] sm:text-2xl">Available Tests</h2>
            <p className="mt-1 text-sm text-[#65584a]">All tests inside the {activeSection.title} section.</p>
          </div>
          <div className="rounded-full bg-[#f6e4d3] px-3 py-1 text-sm font-semibold text-[#b85f20]">{activeTests.length} tests</div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {activeTests.length > 0 ? (
            activeTests.map((test) => (
              <div key={test.id} className="rounded-[1rem] border border-[#eadbcd] bg-white p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[#2f241c]">{test.name}</h3>
                    <div className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a52]">{test.testCode ?? `TST-${test.id.slice(-8).toUpperCase()}`}</div>
                    <p className="mt-2 text-sm leading-6 text-[#65584a]">{test.description ?? "No description provided."}</p>
                  </div>
                  <div className="self-start rounded-full bg-[#f6e4d3] px-3 py-1 text-xs font-semibold text-[#b85f20]">{test.mode === "NEET_PATTERN" ? "NEET Pattern" : "Custom"}</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#6d5a49]">
                  {test.sectionChapters.map((chapter) => (
                    <span key={`${test.id}-${chapter}`} className="rounded-full bg-[#f5f0e8] px-3 py-1">{chapter}</span>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-[#6d5a49]">
                  <span className="rounded-full bg-[#f5f0e8] px-3 py-1">{test.totalQuestions} questions</span>
                  <span className="rounded-full bg-[#f5f0e8] px-3 py-1">{test.durationMinutes} minutes</span>
                  <span className="rounded-full bg-[#f5f0e8] px-3 py-1">{test.studentAttemptCount} attempts</span>
                </div>
                <div className="mt-5 flex gap-3">
                  <Link href={`/tests/${test.id}/instructions`} className="btn-primary w-full sm:w-auto">
                    Start Test
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1rem] border border-dashed border-[#d9cfc3] bg-[#fcfbf8] p-5 text-sm text-[#736455]">
              No tests available in {activeSection.title} yet.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}