"use client";

import React, { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import Link from "next/link";
import { registerForBattleAction, unregisterFromBattleAction } from "@/lib/live-actions";
import { supabase } from "@/lib/supabase";

/* TYPES */

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

/* UTILS */

function getRemainingTime(target: Date, now: Date) {
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return { h: "00", m: "00", s: "00", full: "00:00:00" };
    const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    return { h, m, s, full: `${h}:${m}:${s}` };
}

/* ICONS */

const TrophyIconHero = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2z" /></svg>
);
const ZapIconHero = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
);
const StarIconHero = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
);
const ActivityIconHero = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
);

const ZapIconRow = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
);
const CalendarIconRow = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
);
const CheckIconRow = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);
const DocIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
);
const TimerIconSmall = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);
const UsersIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
);
const SwordIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" /><line x1="13" y1="19" x2="19" y2="13" /><line x1="16" y1="16" x2="20" y2="20" /><line x1="19" y1="21" x2="20" y2="20" /><line x1="14.5" y1="14.5" x2="15.5" y2="15.5" /></svg>
);
const UserIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
);
const TimerIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);
const TrophyIconSmall = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2z" /></svg>
);

/* MAIN COMPONENT */

export function LiveArenaClient({
    initialTests,
    studentName,
    stats
}: {
    initialTests: (Omit<LiveTest, 'startTime' | 'endTime'> & { startTime: Date | string, endTime: Date | string })[],
    studentName: string,
    stats: { battlesAttempted: number, bestScore: number }
}) {
    const [now, setNow] = useState(new Date());
    const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");

    const displayName = useMemo(() => {
        if (!studentName) return "Battler";
        return studentName.split(' ')[0] || studentName;
    }, [studentName]);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const [tests, setTests] = useState<LiveTest[]>(initialTests.map(t => ({
        ...t,
        startTime: new Date(t.startTime),
        endTime: new Date(t.endTime)
    })));

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

    const refreshData = useCallback(async () => {
        try {
            const res = await fetch('/api/live-tests');
            if (res.ok) {
                const data = await res.json();
                setTests(data.map((t: Omit<LiveTest, 'startTime' | 'endTime'> & { startTime: Date | string, endTime: Date | string }) => ({ ...t, startTime: new Date(t.startTime), endTime: new Date(t.endTime) })));
            }
        } catch (e) { console.error("Failed to refresh arena", e); }
    }, []);

    useEffect(() => {
        const channel = supabase.channel('live-arena-updates')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'BattleRegistration' }, payload => {
                setTests(prev => prev.map(t => t.id === payload.new.liveTestId ? { ...t, registeredCount: t.registeredCount + 1 } : t));
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'LiveTest' }, async () => {
                await refreshData();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'LiveTest' }, payload => {
                setTests(prev => prev.map(t => t.id === payload.new.id ? { ...t, registeredCount: payload.new.registeredCount } : t));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [refreshData]);

    const processedTests = useMemo(() => {
        const scored = tests.map(test => {
            let status: FilterType = "UPCOMING";
            if (now >= test.startTime && now <= test.endTime) status = "LIVE";
            else if (now > test.endTime) status = "COMPLETED";
            return { ...test, status };
        });

        const filtered = scored.filter(t => activeFilter === "ALL" || t.status === activeFilter);

        return filtered.sort((a, b) => {
            const order = { "LIVE": 0, "UPCOMING": 1, "COMPLETED": 2 };
            if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
            if (a.status === "UPCOMING") return a.startTime.getTime() - b.startTime.getTime();
            if (a.status === "COMPLETED") return b.endTime.getTime() - a.endTime.getTime();
            return 0;
        });
    }, [tests, now, activeFilter]);

    const nextBattle = useMemo(() => {
        return tests
            .filter(t => t.startTime > now)
            .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0];
    }, [tests, now]);

    const liveCount = useMemo(() => tests.filter(t => now >= t.startTime && now <= t.endTime).length, [tests, now]);
    const upcomingCount = useMemo(() => tests.filter(t => now < t.startTime).length, [tests, now]);
    const completedCount = useMemo(() => tests.filter(t => t.endTime < now).length, [tests, now]);
    const totalRegistered = useMemo(() => tests.reduce((acc, t) => acc + t.registeredCount, 0), [tests]);

    return (
        <div className="flex flex-col gap-12 pb-24">
            {/* ELITE HERO SECTION */}
            <section className="relative overflow-hidden rounded-[40px] bg-[#09090b] border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)]">
                {/* Advanced Background Effects */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[700px] h-[700px] bg-indigo-600/20 blur-[140px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[600px] h-[600px] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />

                <div className="relative z-10 px-8 py-20 lg:px-20 lg:py-28 flex flex-col items-center justify-center gap-10 text-center">
                    <div className="space-y-6 max-w-3xl mx-auto">
                        <h1 className="text-6xl lg:text-7xl font-black text-white tracking-tight leading-[0.95]">
                            Welcome, <span className="text-indigo-400">{displayName}</span>. <br />
                            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-200 to-emerald-300">Battleground</span>
                        </h1>
                        <p className="text-zinc-300 text-xl lg:text-2xl leading-relaxed max-w-2xl mx-auto font-medium">
                            Challenge yourself against India&apos;s brightest. Real-time ranking, instant analysis, and competitive glory await.
                        </p>
                    </div>
                </div>
            </section>



            {/* MAIN CONTENT AREA */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                {/* CONTEST FEED */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-2">
                        <div>
                            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Active Contests</h2>
                            <p className="text-zinc-500 text-sm font-medium mt-1">Participate and win exclusive badges</p>
                        </div>
                        <div className="flex items-center gap-1.5 p-1.5 bg-zinc-100/80 backdrop-blur-sm rounded-2xl border border-zinc-200/50 self-start">
                            <TabButton label="All" active={activeFilter === "ALL"} onClick={() => setActiveFilter("ALL")} />
                            <TabButton label="Live" active={activeFilter === "LIVE"} onClick={() => setActiveFilter("LIVE")} />
                            <TabButton label="Upcoming" active={activeFilter === "UPCOMING"} onClick={() => setActiveFilter("UPCOMING")} />
                            <TabButton label="Ended" active={activeFilter === "COMPLETED"} onClick={() => setActiveFilter("COMPLETED")} />
                        </div>
                    </div>

                    <div className="bg-white border border-zinc-200/60 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                        {processedTests.length > 0 ? (
                            <div className="divide-y divide-zinc-100/80 max-h-[650px] overflow-y-auto overflow-x-hidden">
                                {processedTests.map(test => (
                                    <ContestRow key={test.id} test={test} now={now} onStatusChange={updateTestStatus} />
                                ))}
                            </div>
                        ) : (
                            <EmptyStateFeed onRefresh={refreshData} />
                        )}
                    </div>
                </div>

                {/* SIDEBAR */}
                <div className="lg:col-span-4 space-y-10">
                    {/* NEXT BATTLE COUNTDOWN CARD */}
                    {nextBattle && (
                        <div className="relative group overflow-hidden bg-[#09090b] rounded-[40px] p-10 text-white shadow-2xl shadow-indigo-500/10 border border-white/5">
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/30 rounded-full blur-[100px] pointer-events-none group-hover:bg-indigo-600/40 transition-all duration-700" />
                            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-600/10 rounded-full blur-[80px] pointer-events-none" />

                            <div className="relative z-10 flex flex-col items-center text-center gap-8">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                                        Starting Soon
                                    </div>
                                    <h3 className="text-3xl font-black leading-tight tracking-tight mt-2 text-white">{nextBattle.title}</h3>
                                </div>

                                <div className="flex items-center gap-6 py-4">
                                    <TimeBlock value={getRemainingTime(nextBattle.startTime, now).h} label="Hours" />
                                    <div className="w-1 h-1 rounded-full bg-zinc-700 mt-[-12px]" />
                                    <TimeBlock value={getRemainingTime(nextBattle.startTime, now).m} label="Mins" />
                                    <div className="w-1 h-1 rounded-full bg-zinc-700 mt-[-12px]" />
                                    <TimeBlock value={getRemainingTime(nextBattle.startTime, now).s} label="Secs" />
                                </div>

                                <div className="flex flex-wrap justify-center gap-4 text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em]">
                                    <span className="flex items-center gap-1.5"><DocIcon /> {nextBattle.testTemplate.totalQuestions} Qs</span>
                                    <span className="flex items-center gap-1.5"><TimerIconSmall /> {nextBattle.durationMinutes} Min</span>
                                    <span className="flex items-center gap-1.5"><UsersIcon /> {nextBattle.registeredCount} Joined</span>
                                </div>
                            </div>
                        </div>
                    )}



                </div>
            </div>
        </div>
    );
}

/* UI PILLS */

function StatusPill({ status }: { status: FilterType }) {
    const styles: Record<FilterType, string> = {
        ALL: "bg-zinc-100 text-zinc-700 border-zinc-200",
        LIVE: "bg-emerald-50 text-emerald-700 border-emerald-100",
        UPCOMING: "bg-rose-500 text-white border-rose-500 shadow-sm",
        COMPLETED: "bg-emerald-900 text-white border-emerald-700"
    };
    return (
        <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.16em] border ${styles[status]}`}>
            {status}
        </span>
    );
}

function EmptyStateFeed({ onRefresh }: { onRefresh: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-32 px-12 text-center bg-zinc-50/50">
            <div className="w-20 h-20 rounded-[32px] bg-zinc-100 flex items-center justify-center mb-8 border-2 border-zinc-200/50">
                <SwordIcon />
            </div>
            <h5 className="text-2xl font-black text-zinc-900 tracking-tight">No Active Battles</h5>
            <p className="mt-2 text-zinc-500 text-base max-w-sm font-medium">The arena is currently quiet. Check back soon for upcoming challenges.</p>
            <button onClick={onRefresh} className="mt-10 h-14 px-12 rounded-[24px] bg-zinc-900 text-white text-[11px] font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-zinc-900/20">Check For Updates</button>
        </div>
    );
}

function ArenaStatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-[24px] bg-white border border-zinc-200/60 p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all">
            <span className={`text-3xl ${color}`}>{icon}</span>
            <span className="mt-3 text-2xl font-black text-zinc-900 tabular-nums">{value}</span>
            <span className="mt-1 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">{label}</span>
        </div>
    );
}

/* SUB-COMPONENTS */

function HeroMetric({ label, value, trend, icon }: { label: string, value: string, trend: string, icon: React.ReactNode }) {
    return (
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[24px] p-6 hover:bg-white/[0.08] transition-all cursor-default group border-t-white/20">
            <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors border border-white/5">
                    {icon}
                </div>
                <div className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg">
                    {trend}
                </div>
            </div>
            <div className="mt-6">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em]">{label}</div>
                <div className="text-3xl font-black text-white mt-1 tracking-tight">{value}</div>
            </div>
        </div>
    );
}

function TabButton({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-6 py-2 text-xs font-black rounded-xl transition-all tracking-wide ${active ? "bg-white text-zinc-900 shadow-md border border-zinc-200/50" : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/30"
                }`}
        >
            {label}
        </button>
    );
}

function TimeBlock({ value, label }: { value: string, label: string }) {
    return (
        <div className="flex flex-col items-center min-w-[60px]">
            <div className="text-4xl font-black tabular-nums tracking-tight text-white" suppressHydrationWarning>{value}</div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white mt-2">{label}</div>
        </div>
    );
}

function ContestRow({
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

    const isLive = test.status === "LIVE";
    const isUpcoming = test.status === "UPCOMING";
    const isCompleted = test.status === "COMPLETED";

    const handleAction = (e: React.MouseEvent) => {
        if (isCompleted || isPending) return;
        if (test.isRegistered) {
            setIsConfirming(true);
        } else {
            onStatusChange(test.id, true);
            startTransition(async () => {
                try {
                    const res = await registerForBattleAction(test.id);
                    if (res.error) { alert(res.error); onStatusChange(test.id, false); }
                } catch (e) { onStatusChange(test.id, false); }
            });
        }
    };

    const handleUnregister = () => {
        setIsConfirming(false);
        onStatusChange(test.id, false);
        startTransition(async () => {
            try {
                const res = await unregisterFromBattleAction(test.id);
                if (res.error) { alert(res.error); onStatusChange(test.id, true); }
            } catch (e) { onStatusChange(test.id, true); }
        });
    };

    const countdown = getRemainingTime(isUpcoming ? test.startTime : test.endTime, now).full;

    return (
        <div className="group relative flex flex-col lg:flex-row lg:items-center justify-between gap-8 p-8 hover:bg-zinc-50/80 transition-all duration-300">
            {/* LEFT: INFO */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2.5">
                        <StatusPill status={test.status} />
                        {isLive && (
                            <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                <span className="text-[10px] font-black text-emerald-600 tracking-[0.1em]">LIVE NOW</span>
                            </div>
                        )}
                    </div>
                    <h4 className="text-xl font-black text-zinc-950 leading-tight truncate group-hover:text-indigo-600 transition-colors tracking-tight">
                        {test.title}
                    </h4>
                    <div className="mt-3 flex flex-wrap items-center gap-6 text-zinc-950 text-[11px] font-black uppercase tracking-wider">
                        <span className="flex items-center gap-2"><DocIcon /> {test.testTemplate.totalQuestions} Questions</span>
                        <span className="flex items-center gap-2"><TimerIconSmall /> {test.durationMinutes} Mins</span>
                        <span className="flex items-center gap-2"><UsersIcon /> {isCompleted ? test._count.attempts : test.registeredCount} Battlers</span>
                    </div>
                </div>
            </div>

            {/* RIGHT: ACTION */}
            <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-5 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-zinc-100">
                <div className="flex flex-col items-center lg:items-end">
                    <div className="text-[10px] font-black text-zinc-950 uppercase tracking-[0.2em] mb-1.5">
                        {isUpcoming ? "Commencing In" : isLive ? "Time Remaining" : "Arena Closed"}
                    </div>
                    <div className={`text-base font-black tabular-nums tracking-tight ${isCompleted ? "text-emerald-600" : isLive ? "text-emerald-600" : "text-zinc-950"}`} suppressHydrationWarning>
                        {isCompleted ? "FINISHED" : countdown}
                    </div>
                </div>

                <div className="flex gap-3">
                    {isLive ? (
                        <Link href={`/live-arena/${test.id}`} className="h-12 px-8 flex items-center justify-center rounded-[18px] bg-emerald-500 text-white text-[11px] font-black uppercase tracking-[0.15em] hover:bg-emerald-600 hover:scale-[1.05] transition-all shadow-xl shadow-emerald-500/30 active:scale-95" style={{ color: 'white' }}>
                            Enter Arena
                        </Link>
                    ) : isUpcoming ? (
                        <button
                            onClick={handleAction}
                            disabled={isPending}
                            className={`h-12 px-8 flex items-center justify-center rounded-[18px] text-[11px] font-black uppercase tracking-[0.15em] transition-all active:scale-95 ${test.isRegistered
                                ? "bg-zinc-900 text-white hover:bg-rose-600 hover:shadow-rose-500/20 shadow-xl shadow-zinc-900/10"
                                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-600/30"
                                }`}
                        >
                            {isPending ? "..." : test.isRegistered ? "Withdraw" : "Join Battle"}
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <Link href={`/live-arena/${test.id}/leaderboard`} className="h-12 px-8 flex items-center justify-center rounded-[18px] bg-emerald-900 text-white text-sm font-black uppercase tracking-[0.18em] border border-emerald-700 hover:bg-emerald-800 hover:scale-[1.05] transition-all shadow-2xl shadow-emerald-900/30 active:scale-95">
                                <span className="text-white">Rankings 🏆</span>
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* CONFIRMATION OVERLAY */}
            {isConfirming && (
                <div className="absolute inset-0 z-20 flex items-center justify-between bg-white/98 backdrop-blur-md px-12 py-6 animate-in fade-in zoom-in-95 duration-200 rounded-3xl lg:rounded-none">
                    <div className="flex flex-col gap-1">
                        <h5 className="text-lg font-black text-zinc-900 leading-none tracking-tight">Withdraw from Battle?</h5>
                        <p className="text-sm font-medium text-zinc-500">You&apos;ll lose your reserved spot in this competition.</p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setIsConfirming(false)} className="px-8 py-3 rounded-2xl bg-zinc-100 text-[11px] font-black uppercase tracking-[0.15em] text-zinc-600 hover:bg-zinc-200 transition-all">Keep My Spot</button>
                        <button onClick={handleUnregister} className="px-8 py-3 rounded-2xl bg-rose-600 text-[11px] font-black uppercase tracking-[0.15em] text-white shadow-xl shadow-rose-600/30 hover:bg-rose-700 transition-all">Confirm Withdrawal</button>
                    </div>
                </div>
            )}
        </div>
    );
}
