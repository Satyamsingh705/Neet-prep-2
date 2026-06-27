"use client";

export default function HomeLoading() {
  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-4 px-0 py-4 sm:gap-6 sm:px-6 sm:py-8 animate-pulse">
      {/* Hero panel skeleton */}
      <section className="panel overflow-hidden rounded-none border-x-0 sm:rounded-[1.6rem] sm:border-x">
        <div className="grid gap-6 px-5 py-6 sm:gap-8 sm:px-8 sm:py-8 lg:grid-cols-[1.25fr_0.95fr] lg:px-10 lg:py-10">
          <div className="space-y-6">
            <div className="h-4 w-44 rounded bg-[#f0e0d0]" />
            <div className="space-y-3">
              <div className="h-10 w-80 max-w-full rounded bg-[#f0e0d0]" />
              <div className="h-10 w-64 max-w-full rounded bg-[#f0e0d0]" />
            </div>
            <div className="h-5 w-[450px] max-w-full rounded bg-[#f5ede4]" />
            <div className="flex gap-4">
              <div className="h-11 w-36 rounded-lg bg-[#e8d8c8]" />
              <div className="h-11 w-32 rounded-lg bg-[#f0e0d0]" />
            </div>
          </div>
          <div className="grid gap-4 self-start sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-[1.2rem] border border-[#ead9c9] bg-[#fffdfa] p-5">
                <div className="h-3 w-32 rounded bg-[#f0e0d0]" />
                <div className="mt-3 h-10 w-16 rounded bg-[#f5ede4]" />
                <div className="mt-3 h-4 w-full rounded bg-[#f9f3ec]" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sections skeleton */}
      <section className="panel rounded-none border-x-0 p-4 sm:rounded-[1.4rem] sm:border-x sm:p-6">
        <div>
          <div className="h-7 w-52 rounded bg-[#f0e0d0]" />
          <div className="mt-3 h-4 w-80 rounded bg-[#f5ede4]" />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-[1.2rem] border border-[#ead9c9] bg-[#fffdfa] p-5">
              <div className="h-3 w-16 rounded bg-[#f0e0d0]" />
              <div className="mt-4 h-7 w-36 rounded bg-[#f0e0d0]" />
              <div className="mt-3 h-4 w-full rounded bg-[#f5ede4]" />
              <div className="mt-4 h-6 w-16 rounded-full bg-[#f5f0e8]" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
