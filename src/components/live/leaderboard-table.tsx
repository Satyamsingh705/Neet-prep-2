import React from "react";

type LeaderboardEntry = {
    rank: number;
    studentId: string;
    studentName: string | null;
    score: number;
    accuracy: number;
    timeConsumedSeconds: number;
    percentile: number;
};

export function LeaderboardTable({ entries, currentStudentId, totalMarks }: { entries: LeaderboardEntry[]; currentStudentId?: string; totalMarks?: number }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-[#e6d9cb] bg-white shadow-sm">
            <table className="min-w-full border-collapse text-left text-sm">
                <thead className="bg-[#fcfbf8] text-[#8a6a52]">
                    <tr>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider">Rank</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider">Student</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-right">Score</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-right">Time</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-right hidden sm:table-cell">Accuracy</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-right hidden sm:table-cell">Percentile</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#eee3d7]">
                    {entries.map((entry) => (
                        <tr 
                            key={entry.studentId} 
                            className={`transition-colors ${entry.studentId === currentStudentId ? "bg-orange-50/50" : "hover:bg-[#fcfbf8]"}`}
                        >
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                    <span className={`flex h-8 w-8 items-center justify-center rounded-full font-black text-xs ${getRankColor(entry.rank)}`}>
                                        {entry.rank}
                                    </span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-[#2f241c]">{entry.studentName || "Student"}</span>
                                        {entry.studentId === currentStudentId && <span className="text-[0.6rem] font-bold text-[#d7671b] uppercase">Your Entry</span>}
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                <span className="font-black text-[#d7671b] text-base">{totalMarks ? `${entry.score} / ${totalMarks}` : entry.score}</span>
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap text-[#6d5a49]">
                                {formatTime(entry.timeConsumedSeconds)}
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap text-[#6d5a49] hidden sm:table-cell">
                                {entry.accuracy}%
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap text-[#6d5a49] hidden sm:table-cell">
                                {entry.percentile}th
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function getRankColor(rank: number) {
    if (rank === 1) return "bg-amber-100 text-amber-700 ring-1 ring-amber-300";
    if (rank === 2) return "bg-slate-100 text-slate-700 ring-1 ring-slate-300";
    if (rank === 3) return "bg-orange-100 text-orange-700 ring-1 ring-orange-300";
    return "bg-[#f4f2ed] text-[#8a6a52]";
}

function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
}
