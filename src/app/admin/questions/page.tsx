import { QuestionUploadPanel } from "@/components/admin/question-upload-panel";
import { requireCurrentAdmin } from "@/lib/admin-auth";
import { getQuestionBankSummary } from "@/lib/data";

export default async function AdminQuestionsPage() {
  await requireCurrentAdmin();
  const summary = await getQuestionBankSummary();

  return (
    <main className="mx-auto grid max-w-[1400px] gap-6 px-6 py-8 lg:grid-cols-[320px_1fr]">
      <aside className="panel rounded-[1.4rem] p-6">
        <h1 className="text-3xl font-semibold text-[#2f241c]">Question Bank</h1>
        <div className="mt-6 space-y-4">
          <div className="rounded-[1rem] bg-[#fff8f0] p-4">
            <div className="text-sm uppercase tracking-[0.2em] text-[#8d715c]">Total Questions</div>
            <div className="mt-2 text-4xl font-semibold text-[#d7671b]">{summary.total}</div>
          </div>
          {summary.grouped.map((group) => (
            <div key={`${group.subject}-${group.type}`} className="rounded-[1rem] border border-[#eadbcd] bg-[#fffdfa] p-4 text-sm text-[#6d5a49]">
              <div className="font-semibold text-[#2f241c]">{group.subject}</div>
              <div className="mt-2">{group.type} questions: {group._count._all}</div>
            </div>
          ))}
        </div>
      </aside>
      <section>
        <QuestionUploadPanel chapters={summary.chapters} />
      </section>
    </main>
  );
}
