import Link from "next/link";
import { getTestSeriesGroupsWithDocuments, getUngroupedTestSeriesDocuments } from "@/lib/data";
import { requireCurrentStudent } from "@/lib/student-auth";
import { partitionTestSeriesDocuments } from "@/lib/test-series";

export default async function TestSeriesPage() {
  await requireCurrentStudent();
  const [groups, documents] = await Promise.all([getTestSeriesGroupsWithDocuments(), getUngroupedTestSeriesDocuments()]);
  const totalDocuments = groups.reduce((sum, group) => sum + group.documents.length, 0) + documents.length;

  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-4 px-0 py-4 sm:gap-6 sm:px-6 sm:py-8">
      <section className="panel rounded-none border-x-0 p-4 sm:rounded-[1.5rem] sm:border-x sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#b26d39]">Student Section</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#2f241c] sm:text-4xl">Test Series</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[#6d5a49] sm:text-lg">Open any uploaded test series PDF in a new tab and review it separately.</p>
          </div>
          <Link href="/" className="btn-secondary">
            Back To Sections
          </Link>
        </div>
      </section>

      <section className="panel rounded-none border-x-0 p-4 sm:rounded-[1.4rem] sm:border-x sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#2f241c] sm:text-2xl">Available Groups</h2>
            <p className="mt-1 text-sm text-[#65584a]">Open a group first, then view test series and answer keys in separate columns.</p>
          </div>
          <div className="rounded-full bg-[#f6e4d3] px-3 py-1 text-sm font-semibold text-[#b85f20]">{totalDocuments} PDFs</div>
        </div>

        <div className="mt-5 space-y-5">
          {groups.length > 0 || documents.length > 0 ? (
            <>
              {groups.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {groups.map((group) => {
                    const { series, answerKeys } = partitionTestSeriesDocuments(group.documents);

                    return (
                      <Link key={group.id} href={`/test-series/${group.id}`} className="rounded-[1rem] border border-[#eadbcd] bg-white p-5 transition hover:border-[#d8b18b] hover:bg-[#fffaf4]">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-semibold text-[#2f241c]">{group.title}</h3>
                            {group.description ? <p className="mt-2 text-sm leading-6 text-[#65584a]">{group.description}</p> : null}
                          </div>
                          <div className="rounded-full bg-[#f6e4d3] px-3 py-1 text-xs font-semibold text-[#b85f20]">Open Group</div>
                        </div>
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-[0.9rem] bg-[#fff7ef] px-4 py-3 text-sm text-[#6d5a49]">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b56d3d]">Test Series</div>
                            <div className="mt-2 text-2xl font-semibold text-[#2f241c]">{series.length}</div>
                          </div>
                          <div className="rounded-[0.9rem] bg-[#fff7ef] px-4 py-3 text-sm text-[#6d5a49]">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b56d3d]">Answer Keys</div>
                            <div className="mt-2 text-2xl font-semibold text-[#2f241c]">{answerKeys.length}</div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : null}

              {documents.length > 0 ? (
                <div className="rounded-[1rem] border border-dashed border-[#d9cfc3] bg-[#fcfbf8] p-5">
                  <h3 className="text-xl font-semibold text-[#2f241c]">More PDFs</h3>
                  <p className="mt-2 text-sm leading-6 text-[#65584a]">These PDFs are not inside any group yet, so they still open directly in a new tab.</p>
                  <div className="mt-5 grid gap-3 lg:grid-cols-2">
                    {documents.map((document) => (
                      <div key={document.id} className="rounded-[0.9rem] border border-[#eadbcd] bg-white px-4 py-3">
                        <a href={document.filePath} target="_blank" rel="noreferrer" className="text-base font-semibold text-[#d7671b] hover:underline">
                          {document.title}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-[1rem] border border-dashed border-[#d9cfc3] bg-[#fcfbf8] p-5 text-sm text-[#736455]">
              No test series PDFs uploaded yet.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}