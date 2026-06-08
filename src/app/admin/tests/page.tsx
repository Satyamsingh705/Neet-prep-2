import { AdminTestList } from "@/components/admin/admin-test-list";
import { TestBuilderForm } from "@/components/admin/test-builder-form";
import { requireCurrentAdmin } from "@/lib/admin-auth";
import { getQuestionBankSummary, getTestsForListing } from "@/lib/data";

export default async function AdminTestsPage() {
  await requireCurrentAdmin();
  const [summary, tests] = await Promise.all([getQuestionBankSummary(), getTestsForListing(undefined, { includeUnpublished: true })]);

  return (
    <main className="mx-auto grid max-w-[1400px] gap-6 px-6 py-8 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-w-0">
        <TestBuilderForm chapters={summary.chapters} />
      </section>
      <aside className="min-w-0 space-y-6">
        <AdminTestList tests={tests} />
        <section className="panel rounded-[1.4rem] p-6">
          <h2 className="text-2xl font-semibold text-[#2f241c]">Builder Notes</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[#6d5a49]">
            <li>NEET pattern mode evaluates only the first 10 answered Section B questions in each subject.</li>
            <li>Custom mode uses exactly the counts you configure and evaluates every displayed question.</li>
            <li>Timer and marking scheme are admin-controlled for every test.</li>
            <li>Upload-and-create lets you add unit-wise JSON, ZIP, or PDF questions directly into a new test and the database in one step.</li>
          </ul>
        </section>
      </aside>
    </main>
  );
}
