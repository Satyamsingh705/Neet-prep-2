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
    <main className="mx-auto flex max-w-[1000px] flex-col gap-16 px-6 py-20 bg-slate-50 min-h-screen">
      <section className="text-center space-y-8">
        <div className="flex justify-center">
          {isLive && (
            <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                </span>
                <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Live Now</span>
            </div>
          )}
          {isScheduled && (
            <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 shadow-sm">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Upcoming Arena</span>
            </div>
          )}
          {isEnded && (
            <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-zinc-500/10 border border-zinc-500/20 shadow-sm">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">Arena Closed</span>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
            <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-zinc-900 leading-[0.95] max-w-4xl mx-auto">
                {liveTest.title}
            </h1>
            <p className="mx-auto max-w-2xl text-lg sm:text-xl font-medium text-zinc-500 leading-relaxed">
                {liveTest.description}
            </p>
        </div>
      </section>

      <div className="grid gap-12">
        <section className="relative overflow-hidden rounded-[48px] bg-[#09090b] p-10 sm:p-20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-white/5">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[500px] h-[500px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[400px] h-[400px] bg-emerald-600/10 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center">
            {isScheduled && (
              <div className="w-full mb-12">
                <LiveCountdown targetDate={liveTest.startTime.toISOString()} title="Countdown to Battle" />
              </div>
            )}

            {isLive && (
              <div className="text-center mb-12 space-y-4">
                 <div className="text-6xl mb-6">🌩️</div>
                 <h2 className="text-4xl font-black text-white tracking-tight">The Arena is Live</h2>
                 <p className="text-zinc-400 text-lg font-medium">Join thousands of battlers and prove your mettle.</p>
              </div>
            )}

            {isEnded && (
              <div className="text-center mb-12 space-y-4">
                 <div className="text-6xl mb-6">🏆</div>
                 <h2 className="text-4xl font-black text-white tracking-tight">Challenge Concluded</h2>
                 <p className="text-zinc-400 text-lg font-medium">The results are finalized. Witness the winners on the podium.</p>
              </div>
            )}

            <div className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <InfoCard icon={<CalendarIconDetail />} label="Start Time" value={formatDateTime(liveTest.startTime)} />
                <InfoCard icon={<CheckCircleIconDetail />} label="End Time" value={formatDateTime(liveTest.endTime)} />
                <InfoCard icon={<BookOpenIconDetail />} label="Format" value={`${liveTest.testTemplate.totalQuestions} Questions`} />
                <InfoCard icon={<TimerIconDetail />} label="Duration" value={`${liveTest.durationMinutes} Minutes`} />
            </div>

            <div className="mt-16 w-full max-w-sm">
                {!student ? (
                    <Link href="/" className="flex w-full items-center justify-center rounded-[24px] bg-white py-6 text-lg font-black uppercase tracking-[0.2em] text-zinc-900 shadow-xl shadow-white/10 transition-all hover:bg-zinc-100 hover:scale-[1.02] active:scale-[0.98]">
                        Sign In To Enter 🚀
                    </Link>
                ) : isEnded ? (
                    <Link href={`/live-arena/${id}/leaderboard`} className="flex w-full items-center justify-center rounded-[24px] bg-indigo-600 py-6 text-lg font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-indigo-500/20 transition-all hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98]">
                        View Podium 🏆
                    </Link>
                ) : (
                    <JoinLiveTestButton liveTestId={id} isLive={isLive} />
                )}
            </div>
          </div>
        </section>

        <section className="rounded-[40px] bg-white p-10 sm:p-14 shadow-sm border border-zinc-200/60">
            <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <ShieldIconDetail />
                </div>
                <h3 className="text-2xl font-black text-zinc-900 tracking-tight">
                    Arena Protocols
                </h3>
            </div>
            <div className="grid gap-10 sm:grid-cols-2">
                <ProtocolItem number={1} title="Uniform Timing" description="Every participant starts and ends at the exact same moment. No extensions granted." />
                <ProtocolItem number={2} title="Late Entry Policy" description="Late entry is permitted, but your timer will be reduced based on the remaining window." />
                <ProtocolItem number={3} title="Force Submission" description="Automated submission is enforced at the precise end time. Autosave happens every 15s." />
                <ProtocolItem number={4} title="Ranking Logic" description="Rankings prioritize Marks, followed by completion Speed, then submission Timestamp." />
            </div>
        </section>
      </div>
    </main>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="group flex flex-col gap-4 rounded-[28px] bg-white/5 p-6 border border-white/10 hover:bg-white/[0.08] transition-all backdrop-blur-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-zinc-400 shadow-sm border border-white/5 group-hover:text-white transition-colors">{icon}</div>
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">{label}</span>
                <span className="mt-1 text-sm font-black text-white tracking-tight">{value}</span>
            </div>
        </div>
    );
}

function ProtocolItem({ number, title, description }: { number: number, title: string, description: string }) {
    return (
        <div className="flex gap-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-sm font-black text-white shadow-lg shadow-zinc-900/10">{number}</span>
            <div className="space-y-1.5">
                <h4 className="text-base font-black text-zinc-900 tracking-tight">{title}</h4>
                <p className="text-zinc-500 text-sm font-medium leading-relaxed">{description}</p>
            </div>
        </div>
    );
}

/* ICONS */

const CalendarIconDetail = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
);
const CheckCircleIconDetail = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);
const BookOpenIconDetail = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
);
const TimerIconDetail = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const ShieldIconDetail = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);


import Link from "next/link";
