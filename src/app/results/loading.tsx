"use client";

export default function ResultsLoading() {
  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-4 px-0 py-4 sm:gap-6 sm:px-6 sm:py-8 animate-pulse">
      <section className="panel rounded-none border-x-0 p-4 sm:rounded-[1.5rem] sm:border-x sm:p-8">
        <div className="h-4 w-32 rounded bg-[#f0e0d0]" />
        <div className="mt-3 h-9 w-72 rounded bg-[#f0e0d0]" />
        <div className="mt-3 h-5 w-[480px] max-w-full rounded bg-[#f5ede4]" />
      </section>

      <section className="panel rounded-none border-x-0 p-4 sm:rounded-[1.4rem] sm:border-x sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="h-7 w-56 rounded bg-[#f0e0d0]" />
          <div className="h-7 w-20 rounded-full bg-[#f6e4d3]" />
        </div>

        <div className="mt-5 hidden overflow-hidden rounded-[1rem] border border-[#e6d9cb] md:block">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-[#f7efe6]">
              <tr>
                {["Student", "Test", "Status", "Score", "Submitted", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3">
                    <div className="h-4 w-16 rounded bg-[#e8d8c8]" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t border-[#eee3d7] bg-white">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className={`h-4 rounded bg-[#f5ede4] ${j === 5 ? "w-20" : "w-24"}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
