import React from "react";

type PodiumEntry = {
    rank: number;
    studentName: string | null;
    score: number;
    accuracy: number;
    timeConsumed: number;
};

export function LeaderboardPodium({ entries }: { entries: PodiumEntry[] }) {
    const first = entries.find(e => e.rank === 1);
    const second = entries.find(e => e.rank === 2);
    const third = entries.find(e => e.rank === 3);

    return (
        <div className="flex items-end justify-center gap-2 sm:gap-8 py-10 px-2 sm:px-6">
            {/* Second Place */}
            {second && (
                <div className="flex flex-col items-center">
                    <Avatar name={second.studentName} color="bg-slate-200" border="border-slate-300" />
                    <div className="mt-4 flex h-24 w-20 flex-col items-center justify-end rounded-t-2xl bg-gradient-to-b from-slate-100 to-slate-200 p-3 shadow-sm ring-1 ring-inset ring-slate-300 sm:h-32 sm:w-32">
                        <span className="text-2xl font-black text-slate-500 sm:text-4xl">2</span>
                        <span className="mt-1 text-[0.6rem] font-bold uppercase tracking-widest text-slate-600 sm:text-xs">SILVER</span>
                    </div>
                    <div className="mt-3 text-center">
                        <p className="text-xs font-bold text-[#2f241c] sm:text-sm truncate max-w-[80px] sm:max-w-[120px]">{second.studentName || "Student"}</p>
                        <p className="text-[0.65rem] font-black text-[#d7671b] sm:text-base">{second.score} pts</p>
                    </div>
                </div>
            )}

            {/* First Place */}
            {first && (
                <div className="flex flex-col items-center -translate-y-4">
                    <div className="relative">
                        <Avatar name={first.studentName} color="bg-amber-100" border="border-amber-300" size="h-20 w-20 sm:h-28 sm:w-28" />
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-3xl sm:text-5xl">👑</div>
                    </div>
                    <div className="mt-4 flex h-32 w-24 flex-col items-center justify-end rounded-t-2xl bg-gradient-to-b from-amber-100 to-amber-200 p-3 shadow-xl ring-1 ring-inset ring-amber-300 sm:h-44 sm:w-40">
                        <span className="text-4xl font-black text-amber-600 sm:text-6xl">1</span>
                        <span className="mt-1 text-[0.65rem] font-bold uppercase tracking-widest text-amber-700 sm:text-xs">CHAMPION</span>
                    </div>
                    <div className="mt-3 text-center">
                        <p className="text-sm font-bold text-[#2f241c] sm:text-lg truncate max-w-[100px] sm:max-w-[160px]">{first.studentName || "Student"}</p>
                        <p className="text-xs font-black text-[#d7671b] sm:text-xl">{first.score} pts</p>
                    </div>
                </div>
            )}

            {/* Third Place */}
            {third && (
                <div className="flex flex-col items-center">
                    <Avatar name={third.studentName} color="bg-orange-100" border="border-orange-200" />
                    <div className="mt-4 flex h-20 w-20 flex-col items-center justify-end rounded-t-2xl bg-gradient-to-b from-orange-50 to-orange-100 p-3 shadow-sm ring-1 ring-inset ring-orange-200 sm:h-28 sm:w-32">
                        <span className="text-2xl font-black text-orange-400 sm:text-4xl">3</span>
                        <span className="mt-1 text-[0.6rem] font-bold uppercase tracking-widest text-orange-500 sm:text-xs">BRONZE</span>
                    </div>
                    <div className="mt-3 text-center">
                        <p className="text-xs font-bold text-[#2f241c] sm:text-sm truncate max-w-[80px] sm:max-w-[120px]">{third.studentName || "Student"}</p>
                        <p className="text-[0.65rem] font-black text-[#d7671b] sm:text-base">{third.score} pts</p>
                    </div>
                </div>
            )}
        </div>
    );
}

function Avatar({ name, color, border, size = "h-16 w-16 sm:h-20 sm:w-20" }: { name: string | null; color: string; border: string; size?: string }) {
    const initials = name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
    return (
        <div className={`${size} flex items-center justify-center rounded-full ${color} ${border} border-4 font-black text-[#2f241c] shadow-lg text-xl sm:text-2xl`}>
            {initials}
        </div>
    );
}
