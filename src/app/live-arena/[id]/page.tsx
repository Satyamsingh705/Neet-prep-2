import { notFound, redirect } from "next/navigation";
import { getLiveTestData } from "@/lib/data";
import { getCurrentStudent } from "@/lib/student-auth";
import { formatDateTime } from "@/lib/format-date-time";
import { LiveCountdown } from "@/components/live/live-countdown";
import { JoinLiveTestButton } from "@/components/live/join-live-button";

export default async function LiveTestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const student = await getCurrentStudent();
  const { id } = await params;
  const data = await getLiveTestData(id, student?.id);

  if (!data) {
    notFound();
  }

  const { liveTest, attempt } = data;
  const now = new Date();
  const isLive = now >= liveTest.startTime && now <= liveTest.endTime;
  const isEnded = now > liveTest.endTime;
  const isScheduled = now < liveTest.startTime;

  if (attempt && attempt.status !== "IN_PROGRESS") {
    redirect(`/live-arena/${id}/leaderboard`);
  }

  if (attempt && isLive) {
     redirect(`/live-arena/${id}/exam`);
  }

  return (
    <main className="mx-auto flex max-w-[900px] flex-col gap-10 px-6 py-16">
      <section className="text-center">
        <div className="flex justify-center mb-8">
          {isLive && (
            <span className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-1.5 text-sm font-black uppercase tracking-widest text-red-600 ring-1 ring-inset ring-red-200">
               <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                </span>
               Live Now
            </span>
          )}
          {isScheduled && <span className="inline-flex items-center rounded-full bg-blue-500/10 px-4 py-1.5 text-sm font-black uppercase tracking-widest text-blue-600 ring-1 ring-inset ring-blue-200">Upcoming Arena</span>}
          {isEnded && <span className="inline-flex items-center rounded-full bg-slate-500/10 px-4 py-1.5 text-sm font-black uppercase tracking-widest text-slate-600 ring-1 ring-inset ring-slate-200">Challenge Concluded</span>}
        </div>
        <h1 className="text-4xl font-black tracking-tight text-[#2f241c] sm:text-6xl">{liveTest.title}</h1>
        <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-[#6d5a49]">{liveTest.description}</p>
      </section>

      <div className="grid gap-8">
        <section className="relative overflow-hidden rounded-[2.5rem] bg-white p-8 shadow-2xl ring-1 ring-[#e6d9cb] sm:p-14">
          <div className="absolute right-0 top-0 h-32 w-32 translate-x-10 -translate-y-10 rounded-full bg-orange-100/50 blur-3xl" />
          
          <div className="relative flex flex-col items-center">
            {isScheduled && (
              <div className="w-full">
                <LiveCountdown targetDate={liveTest.startTime.toISOString()} title="T-Minus To Battle" />
              </div>
            )}

            {isLive && (
              <div className="text-center">
                 <div className="text-5xl mb-6">🌩️</div>
                 <h2 className="text-3xl font-black text-[#2f241c]">The arena is wide open</h2>
                 <p className="mt-4 text-[#6d5a49]">Enter now and secure your ranking among the best.</p>
              </div>
            )}

            {isEnded && (
              <div className="text-center">
                 <div className="text-5xl mb-6">🏆</div>
                 <h2 className="text-3xl font-black text-[#2f241c]">Final rankings are out</h2>
                 <p className="mt-4 text-[#6d5a49]">The challenge has finished. See how you performed against others.</p>
              </div>
            )}

            <div className="mt-14 grid w-full gap-4 sm:grid-cols-2">
                <InfoCard icon="📅" label="Starts At" value={formatDateTime(liveTest.startTime)} />
                <InfoCard icon="🏁" label="Ends At" value={formatDateTime(liveTest.endTime)} />
                <InfoCard icon="📝" label="Format" value={`${liveTest.testTemplate.totalQuestions} Multiple Choice`} />
                <InfoCard icon="⚡" label="Time Limit" value={`${liveTest.durationMinutes} Minutes`} />
            </div>

            <div className="mt-14 w-full max-w-sm">
                {!student ? (
                    <Link href="/" className="flex w-full items-center justify-center rounded-2xl bg-orange-600 py-5 text-lg font-black uppercase tracking-widest text-white shadow-xl shadow-orange-200 transition-all hover:bg-orange-500 hover:scale-105 active:scale-95">
                        Sign In To Enter 🚀
                    </Link>
                ) : isEnded ? (
                    <Link href={`/live-arena/${id}/leaderboard`} className="flex w-full items-center justify-center rounded-2xl bg-[#2f241c] py-5 text-lg font-black uppercase tracking-widest text-white shadow-xl shadow-slate-200 transition-all hover:bg-black hover:scale-105 active:scale-95">
                        View Podium 🏆
                    </Link>
                ) : (
                    <JoinLiveTestButton liveTestId={id} isLive={isLive} />
                )}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] bg-[#fcfbf8] p-10 ring-1 ring-inset ring-[#e6d9cb]">
            <h3 className="text-xl font-black text-[#2f241c] flex items-center gap-3">
                <span>🛡️</span> Arena Protocols
            </h3>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 text-sm leading-relaxed text-[#6d5a49]">
                <div className="flex gap-4">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-700">1</span>
                    <p>Every participant starts and ends at the exact same moment. No extensions granted.</p>
                </div>
                <div className="flex gap-4">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-700">2</span>
                    <p>Late entry is permitted, but your timer will be reduced based on the remaining window.</p>
                </div>
                <div className="flex gap-4">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-700">3</span>
                    <p>Automated submission is enforced at the precise end time. Autosave happens every 15s.</p>
                </div>
                <div className="flex gap-4">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-700">4</span>
                    <p>Rankings prioritize Marks, followed by completion Speed, then submission Timestamp.</p>
                </div>
            </div>
        </section>
      </div>
    </main>
  );
}

function InfoCard({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <div className="group flex items-center gap-4 rounded-3xl bg-[#fcfbf8] p-5 ring-1 ring-inset ring-[#e6d9cb] transition-all hover:bg-white hover:shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-sm ring-1 ring-[#e6d9cb] group-hover:scale-110 transition-transform">{icon}</div>
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#8a6a52]">{label}</span>
                <span className="mt-0.5 text-sm font-bold text-[#2f241c]">{value}</span>
            </div>
        </div>
    );
}

import Link from "next/link";
