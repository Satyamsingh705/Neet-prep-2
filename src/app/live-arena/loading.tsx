"use client";

export default function LiveArenaLoading() {
  return (
    <main className="flex w-full flex-col gap-4 px-0 py-4 sm:gap-6 sm:px-[1.5%] sm:py-8 xl:px-[2%] bg-slate-50 min-h-screen animate-pulse">
      <div className="flex flex-col gap-12 pb-24">
        {/* Hero skeleton */}
        <section className="relative overflow-hidden rounded-[40px] bg-[#09090b] border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)]">
          <div className="relative z-10 px-8 py-20 lg:px-20 lg:py-28 flex flex-col items-center justify-center gap-10 text-center">
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="h-16 w-[500px] max-w-full mx-auto rounded-xl bg-white/10" />
              <div className="h-6 w-[400px] max-w-full mx-auto rounded bg-white/5" />
            </div>
          </div>
        </section>

        {/* Content area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Contest feed skeleton */}
          <div className="lg:col-span-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-2">
              <div>
                <div className="h-7 w-48 rounded bg-zinc-200" />
                <div className="h-4 w-64 rounded bg-zinc-100 mt-2" />
              </div>
              <div className="flex items-center gap-1.5 p-1.5 bg-zinc-100/80 rounded-2xl border border-zinc-200/50 self-start">
                {["All", "Live", "Upcoming", "Ended"].map((t) => (
                  <div key={t} className="h-9 w-20 rounded-xl bg-zinc-200/60" />
                ))}
              </div>
            </div>

            <div className="bg-white border border-zinc-200/60 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              <div className="divide-y divide-zinc-100/80">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 p-8">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-7 w-16 rounded-full bg-zinc-100" />
                      </div>
                      <div className="h-6 w-48 rounded bg-zinc-200" />
                      <div className="mt-3 flex gap-6">
                        <div className="h-4 w-28 rounded bg-zinc-100" />
                        <div className="h-4 w-20 rounded bg-zinc-100" />
                        <div className="h-4 w-24 rounded bg-zinc-100" />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <div className="h-4 w-24 rounded bg-zinc-100" />
                      <div className="h-5 w-20 rounded bg-zinc-200" />
                      <div className="h-12 w-36 rounded-[18px] bg-zinc-200" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar skeleton */}
          <div className="lg:col-span-4 space-y-10">
            <div className="relative overflow-hidden bg-[#09090b] rounded-[40px] p-10 shadow-2xl border border-white/5">
              <div className="relative z-10 flex flex-col items-center text-center gap-8">
                <div className="h-6 w-32 rounded-full bg-white/10" />
                <div className="h-8 w-48 rounded bg-white/10 mt-2" />
                <div className="flex items-center gap-6 py-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center min-w-[60px]">
                      <div className="h-10 w-14 rounded bg-white/10" />
                      <div className="h-3 w-10 rounded bg-white/5 mt-2" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats skeleton */}
            <div className="bg-white rounded-[32px] border border-zinc-200/60 p-8 space-y-6">
              <div className="h-6 w-36 rounded bg-zinc-200" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-zinc-100" />
                  <div className="flex-1">
                    <div className="h-4 w-24 rounded bg-zinc-100" />
                    <div className="h-6 w-16 rounded bg-zinc-200 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
