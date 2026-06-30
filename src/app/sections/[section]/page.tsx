import Link from "next/link";
import { notFound } from "next/navigation";
import { getTestsForListing } from "@/lib/data";
import { getTestsBySection, studentSections, type StudentSectionId } from "@/lib/student-sections";
import { requireCurrentStudent } from "@/lib/student-auth";
import StudentTestList from "@/components/student/student-test-list";

// ISOLATION: This page shows ONLY regular tests (Test table)
// Arena/Competitive tests (LiveTest table) are NOT shown here
// Arena tests are shown ONLY at /live-arena

export default async function StudentSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const student = await requireCurrentStudent();
  const { section } = await params;
  
  // Fetch ONLY from Test table - NOT from LiveTest table
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

      <StudentTestList tests={activeTests} activeSectionTitle={activeSection.title} />
    </main>
  );
}