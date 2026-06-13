"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LeaderboardPodium } from "./leaderboard-podium";
import { LeaderboardTable } from "./leaderboard-table";

type Entry = {
    rank: number;
    studentId: string;
    studentName: string | null;
    score: number;
    accuracy: number;
    timeConsumedSeconds: number;
    percentile: number;
};

export function RealtimeLeaderboard({ liveTestId, initialEntries, currentStudentId }: { liveTestId: string; initialEntries: Entry[]; currentStudentId?: string }) {
    const [entries, setEntries] = useState<Entry[]>(initialEntries);

    useEffect(() => {
        const channel = supabase
            .channel(`live-leaderboard-${liveTestId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'LiveTestAttempt',
                    filter: `liveTestId=eq.${liveTestId}`,
                },
                async () => {
                    // Refetch leaderboard when any attempt is submitted or updated
                    // We fetch via API to keep ranking logic on server
                    const res = await fetch(`/api/live-tests/${liveTestId}/leaderboard`);
                    if (res.ok) {
                        const data = await res.json();
                        setEntries(data.entries);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [liveTestId]);

    const myEntry = entries.find(e => e.studentId === currentStudentId);
    const topEntry = entries[0];

    return (
        <div className="flex flex-col gap-10">
            {entries.length > 0 && (
                <LeaderboardPodium 
                    entries={entries.slice(0, 3).map(e => ({
                        rank: e.rank,
                        studentName: e.studentName,
                        score: e.score,
                        accuracy: e.accuracy,
                        timeConsumed: e.timeConsumedSeconds
                    }))} 
                />
            )}
            
            {myEntry && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <StatCard label="Your Rank" value={`#${myEntry.rank}`} color="text-[#d7671b]" />
                    <StatCard label="Your Score" value={myEntry.score} color="text-[#2f241c]" />
                    <StatCard label="Top Score" value={topEntry?.score ?? 0} color="text-[#49a84f]" />
                    <StatCard label="Gap" value={`-${(topEntry?.score ?? 0) - myEntry.score}`} color="text-[#d85b58]" />
                </div>
            )}

            <LeaderboardTable entries={entries} currentStudentId={currentStudentId} />
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
    return (
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-inset ring-[#e6d9cb]">
            <p className="text-[0.65rem] font-bold uppercase tracking-wider text-[#8a6a52]">{label}</p>
            <p className={`mt-2 text-2xl font-black ${color}`}>{value}</p>
        </div>
    );
}
