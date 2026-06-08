"use client";

import React, { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/format-date-time";
import { registerForBattleAction, unregisterFromBattleAction } from "@/lib/live-actions";
import { supabase } from "@/lib/supabase";

type LiveTest = {
  id: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  registeredCount: number;
  isRegistered?: boolean;
  _count: { attempts: number };
  testTemplate: { totalQuestions: number };
};

type FilterType = "ALL" | "UPCOMING" | "LIVE" | "COMPLETED";

export function LiveArenaClient({ 
    initialTests, 
    studentName, 
    stats 
}: { 
    initialTests: any[], 
    studentName: string, 
    stats: { battlesAttempted: number, bestScore: number } 
}) {
  const [now, setNow] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");

  // Update clock every second for countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll for data updates every 30 seconds
  const [tests, setTests] = useState<LiveTest[]>(initialTests.map(t => ({ ...t, startTime: new Date(t.startTime), endTime: new Date(t.endTime) })));
  const [liveRegistrations, setLiveRegistrations] = useState<{name: string, time: number}[]>([]);

  const updateTestStatus = useCallback((testId: string, isRegistered: boolean) => {
    setTests(prev => prev.map(t => {
        if (t.id === testId) {
            const countDiff = isRegistered ? 1 : -1;
            return {
                ...t,
                isRegistered,
                registeredCount: Math.max(0, t.registeredCount + countDiff)
            };
        }
        return t;
    }));
  }, []);

  // Supabase Realtime Subscription for Live Updates
  useEffect(() => {
      const channel = supabase.channel('live-arena-updates')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'BattleRegistration' }, payload => {
            setTests(prev => prev.map(t => t.id === payload.new.liveTestId ? { ...t, registeredCount: t.registeredCount + 1 } : t));
            setLiveRegistrations(prev => [{ name: payload.new.studentName || "Student", time: Date.now() }, ...prev].slice(0, 5));
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'LiveTest' }, payload => {
            setTests(prev => prev.map(t => t.id === payload.new.id ? { ...t, registeredCount: payload.new.registeredCount } : t));
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
  }, []);

  const refreshData = useCallback(async () => {
      try {
          const res = await fetch('/api/live-tests');
          if (res.ok) {
              const data = await res.json();
              setTests(data.map((t: any) => ({ ...t, startTime: new Date(t.startTime), endTime: new Date(t.endTime) })));
          }
      } catch (e) { console.error("Failed to refresh arena", e); }
  }, []);

  useEffect(() => {
      const interval = setInterval(refreshData, 30000);
      return () => clearInterval(interval);
  }, [refreshData]);

  const processedTests = useMemo(() => {
    const scored = tests.map(test => {
        let status: FilterType = "UPCOMING";
        if (now >= test.startTime && now <= test.endTime) status = "LIVE";
        else if (now > test.endTime) status = "COMPLETED";
        
        return { ...test, status };
    });

    const filtered = scored.filter(t => activeFilter === "ALL" || t.status === activeFilter);

    // Sorting: Live > Upcoming (nearest) > Completed (recent)
    return filtered.sort((a, b) => {
        const order = { "LIVE": 0, "UPCOMING": 1, "COMPLETED": 2 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        
        if (a.status === "UPCOMING") return a.startTime.getTime() - b.startTime.getTime();
        if (a.status === "COMPLETED") return b.endTime.getTime() - a.endTime.getTime();
        return 0;
    });
  }, [tests, now, activeFilter]);

  const totalRegistered = useMemo(() => tests.reduce((acc, t) => acc + t.registeredCount, 0), [tests]);
  const liveCount = useMemo(() => tests.filter(t => now >= t.startTime && now <= t.endTime).length, [tests, now]);
  const upcomingCount = useMemo(() => tests.filter(t => now < t.startTime).length, [tests, now]);

  return (
    <div className="flex flex-col gap-10">
      {/* Premium Header */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] p-8 sm:p-12 shadow-2xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        
        <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-orange-400 to-red-500 text-3xl font-black text-white shadow-xl ring-4 ring-white/10">
              {studentName[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-black text-white sm:text-4xl">
                Welcome to Live Arena, <span className="text-orange-400">{studentName}</span>
              </h1>
              <p className="mt-2 text-blue-100/60 max-w-xl">
                Compete against NEET aspirants across the country in scheduled live battles and climb the leaderboard.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
             <StatBadge label="Battles Joined" value={stats.battlesAttempted} icon="⚔️" />
             <StatBadge label="Best Score" value={stats.bestScore} icon="🏆" />
          </div>
        </div>
      </section>

      {/* Global Arena Stats */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <GlobalStat label="Live Battles" value={liveCount} icon="🔥" color="text-red-500" />
          <GlobalStat label="Upcoming" value={upcomingCount} icon="⏰" color="text-blue-500" />
          <GlobalStat label="Participants" value={totalRegistered} icon="👨‍🎓" color="text-indigo-500" />
          <GlobalStat label="Battles Conducted" value={tests.filter(t => t.endTime < now).length} icon="🏆" color="text-yellow-500" />
      </section>

      {/* Live Registration Ticker */}
      {liveRegistrations.length > 0 && (
          <div className="flex overflow-hidden rounded-xl bg-gradient-to-r from-orange-500/10 to-transparent p-3 ring-1 ring-orange-200">
             <div className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-[#d7671b] animate-marquee">
                {liveRegistrations.map((r, i) => (
                    <span key={i} className="flex items-center gap-2">
                        <span>🔥 {r.name} joined the battle</span>
                        {i < liveRegistrations.length - 1 && <span className="mx-4 text-orange-200">•</span>}
                    </span>
                ))}
             </div>
          </div>
      )}

      {/* Battlefield Section */}
      <section>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between mb-8">
            <h2 className="text-2xl font-black tracking-widest text-[#2f241c] uppercase flex items-center gap-3">
                <span className="text-orange-500">⚡</span> LIVE BATTLEFIELD
            </h2>
            
            <div className="flex overflow-x-auto rounded-2xl bg-[#f4f2ed] p-1.5 no-scrollbar">
                <FilterTab label="All" active={activeFilter === "ALL"} onClick={() => setActiveFilter("ALL")} />
                <FilterTab label="Live" active={activeFilter === "LIVE"} onClick={() => setActiveFilter("LIVE")} />
                <FilterTab label="Upcoming" active={activeFilter === "UPCOMING"} onClick={() => setActiveFilter("UPCOMING")} />
                <FilterTab label="Completed" active={activeFilter === "COMPLETED"} onClick={() => setActiveFilter("COMPLETED")} />
            </div>
        </div>

        {processedTests.length > 0 ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {processedTests.map(test => (
                    <BattleCard key={test.id} test={test} now={now} onStatusChange={updateTestStatus} />
                ))}
            </div>
        ) : (
            <EmptyState onRefresh={refreshData} />
        )}
      </section>
    </div>
  );
}

function GlobalStat({ label, value, icon, color }: { label: string, value: number, icon: string, color: string }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#e6d9cb]">
            <span className={`text-2xl ${color}`}>{icon}</span>
            <span className="mt-2 text-xl font-black text-[#2f241c]">{value}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8a6a52]">{label}</span>
        </div>
    );
}

function StatBadge({ label, value, icon }: { label: string, value: number, icon: string }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-3xl bg-white/5 backdrop-blur-md px-6 py-4 ring-1 ring-white/10 shadow-lg">
            <span className="text-xl mb-1">{icon}</span>
            <span className="text-2xl font-black text-white">{value}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-100/40">{label}</span>
        </div>
    );
}

function FilterTab({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all rounded-xl ${
                active ? "bg-white text-[#d7671b] shadow-sm" : "text-[#8a6a52] hover:text-[#2f241c]"
            }`}
        >
            {label}
        </button>
    );
}

function BattleCard({ 
    test, 
    now, 
    onStatusChange 
}: { 
    test: LiveTest & { status: FilterType }, 
    now: Date,
    onStatusChange: (testId: string, isRegistered: boolean) => void
}) {
    const [isPending, startTransition] = useTransition();
    const [isConfirming, setIsConfirming] = useState(false);
    const router = useRouter();

    const isLive = test.status === "LIVE";
    const isUpcoming = test.status === "UPCOMING";
    const isCompleted = test.status === "COMPLETED";

    const handleRegister = async () => {
        onStatusChange(test.id, true);
        startTransition(async () => {
            try {
                const res = await registerForBattleAction(test.id);
                if (res.error) {
                    alert(res.error);
                    onStatusChange(test.id, false);
                }
            } catch (e) {
                alert("Registration failed. Try again.");
                onStatusChange(test.id, false);
            }
        });
    };

    const handleUnregister = async () => {
        setIsConfirming(false);
        onStatusChange(test.id, false);
        startTransition(async () => {
            try {
                const res = await unregisterFromBattleAction(test.id);
                if (res.error) {
                    alert(res.error);
                    onStatusChange(test.id, true);
                }
            } catch (e) {
                alert("Failed to unregister. Try again.");
                onStatusChange(test.id, true);
            }
        });
    };

    const countdown = useMemo(() => {
        const target = isUpcoming ? test.startTime : test.endTime;
        const diff = target.getTime() - now.getTime();
        if (diff <= 0) return "00:00:00";
        
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
    }, [test, now, isUpcoming]);

    return (
        <div className={`group relative flex flex-col overflow-hidden rounded-[2.5rem] border-2 transition-all hover:-translate-y-2 hover:shadow-2xl ${
            isLive ? "border-green-200 bg-gradient-to-b from-green-50/50 to-white" :
            isUpcoming ? "border-blue-100 bg-gradient-to-b from-blue-50/30 to-white" :
            "border-slate-100 bg-gray-50/20 grayscale-[0.3]"
        }`}>
            <div className={`h-2 w-full ${
                isLive ? "bg-green-500 animate-pulse" :
                isUpcoming ? "bg-blue-500" :
                "bg-slate-300"
            }`} />

            <div className="p-8 relative min-h-full">
                {/* Local Inline Confirmation Popup */}
                {isConfirming && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 backdrop-blur-md p-6 text-center animate-in fade-in zoom-in duration-200">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-3xl">⚠️</div>
                        <h4 className="text-lg font-black text-[#2f241c] uppercase tracking-tight">Cancel Registration?</h4>
                        <p className="mt-2 text-xs font-bold text-slate-500 leading-relaxed px-4">
                            You will lose your reserved spot in this battle.
                        </p>
                        <div className="mt-6 flex w-full flex-col gap-2">
                            <button 
                                onClick={handleUnregister}
                                className="w-full rounded-2xl bg-rose-500 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-rose-100 transition-all hover:bg-rose-600 active:scale-95"
                            >
                                Unregister Now
                            </button>
                            <button 
                                onClick={() => setIsConfirming(false)}
                                className="w-full rounded-2xl bg-slate-100 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-200 active:scale-95"
                            >
                                Keep Registration
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex items-start justify-between mb-6">
                    <div className={`rounded-2xl p-4 shadow-inner ${
                        isLive ? "bg-orange-100 text-orange-600" :
                        isUpcoming ? "bg-blue-100 text-blue-600" :
                        "bg-slate-100 text-slate-500"
                    }`}>
                        {isLive ? <span className="text-2xl animate-pulse">⚡</span> : isUpcoming ? <span className="text-2xl">⏳</span> : <span className="text-2xl">🏁</span>}
                    </div>
                    <div className={`rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] ring-1 ring-inset ${
                        isLive ? "bg-green-50 text-green-700 ring-green-200" :
                        isUpcoming ? "bg-blue-50 text-blue-700 ring-blue-200" :
                        "bg-slate-50 text-slate-600 ring-slate-200"
                    }`}>
                        {isLive ? "● Live Now" : isUpcoming ? "Upcoming" : "Completed"}
                    </div>
                </div>

                <h3 className="text-xl font-black text-[#2f241c] leading-tight group-hover:text-[#d7671b] transition-colors">{test.title}</h3>
                <p className="mt-3 text-sm text-[#6d5a49] line-clamp-2 leading-relaxed">{test.description}</p>

                <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="flex flex-col rounded-2xl bg-[#fcfbf8] p-4 ring-1 ring-[#eee3d7]">
                        <span className="text-[9px] font-black text-[#8a6a52] uppercase tracking-widest">Questions</span>
                        <span className="mt-1 text-sm font-bold text-[#2f241c]">{test.testTemplate.totalQuestions} MCQ</span>
                    </div>
                    <div className="flex flex-col rounded-2xl bg-[#fcfbf8] p-4 ring-1 ring-[#eee3d7]">
                        <span className="text-[9px] font-black text-[#8a6a52] uppercase tracking-widest">Duration</span>
                        <span className="mt-1 text-sm font-bold text-[#2f241c]">{test.durationMinutes} Mins</span>
                    </div>
                </div>

                <div className="mt-8 flex flex-col items-center gap-4 py-6 rounded-[2rem] bg-slate-900 text-white shadow-xl shadow-slate-200">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        {isUpcoming ? "BATTLE STARTS IN" : isLive ? "BATTLE ENDS IN" : "BATTLE CONCLUDED"}
                    </span>
                    <span className="text-2xl font-black tracking-tighter sm:text-3xl">
                        {isCompleted ? "FINISHED" : countdown}
                    </span>
                </div>

                <div className="mt-8 pt-2">
                    {isLive ? (
                        <Link href={`/live-arena/${test.id}`} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-green-500 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-green-100 transition-all hover:bg-green-600 hover:scale-[1.02] active:scale-95 animate-pulse">
                            Enter Arena ⚔️
                        </Link>
                    ) : isUpcoming ? (
                        test.isRegistered ? (
                            <button 
                                onClick={() => setIsConfirming(true)} 
                                disabled={isPending}
                                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-500 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-600 hover:scale-[1.02] active:scale-95"
                            >
                                {isPending ? "Updating..." : "Registered ✓"}
                            </button>
                        ) : (
                            <button 
                                onClick={handleRegister} 
                                disabled={isPending} 
                                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-500 hover:scale-[1.02] active:scale-95"
                            >
                                {isPending ? "Registering..." : "Register Now"}
                            </button>
                        )
                    ) : (
                        <Link href={`/live-arena/${test.id}/leaderboard`} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#2f241c] py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-black hover:scale-[1.02] active:scale-95">
                            View Rankings 🏆
                        </Link>
                    )}
                </div>
                
                <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-bold text-[#8a6a52] uppercase tracking-widest">
                    <span>👥 {test.registeredCount} Registered Warriors</span>
                </div>
            </div>
        </div>
    );
}

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 rounded-[3rem] border-4 border-dashed border-[#d8d1c6] bg-white shadow-xl shadow-slate-100">
            <div className="relative">
                <div className="text-9xl mb-8 animate-bounce">🏆</div>
                <div className="absolute -right-4 -top-4 text-4xl animate-pulse">✨</div>
            </div>
            <h3 className="text-3xl font-black text-[#2f241c]">No Live Battles Available</h3>
            <p className="mt-4 text-[#6d5a49] max-w-md text-center leading-8 text-lg">
                The arena is being prepared for the next grand challenge. New competitive tests will appear here once scheduled.
            </p>
            <button onClick={onRefresh} className="mt-12 group flex items-center gap-3 rounded-2xl bg-[#2f241c] px-12 py-5 text-sm font-black uppercase tracking-[0.2em] text-white shadow-2xl transition-all hover:bg-black hover:scale-105 active:scale-95">
                <span>Refresh Arena</span>
                <span className="group-hover:rotate-180 transition-transform duration-500 text-orange-400">🔄</span>
            </button>
        </div>
    );
}
