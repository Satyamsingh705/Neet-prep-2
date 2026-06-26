import { AdminModifyAnswers } from "@/components/admin/admin-modify-answers";
import { requireCurrentAdmin } from "@/lib/admin-auth";
import { getTestsForListing } from "@/lib/data";
import Link from "next/link";

export default async function AdminModifyAnswersPage() {
  await requireCurrentAdmin();
  const tests = await getTestsForListing(undefined, { includeUnpublished: true });

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e4d7c7] bg-white text-[#b46916] transition-colors hover:bg-[#fdf9f4]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#b26d39]">Admin</p>
          <h1 className="text-2xl font-semibold text-[#2f241c]">Modify Answer Keys</h1>
        </div>
      </div>
      <AdminModifyAnswers tests={tests} />
    </main>
  );
}
