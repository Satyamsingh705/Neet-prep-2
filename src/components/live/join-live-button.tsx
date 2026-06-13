"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { startLiveAttemptAction } from "@/lib/live-actions";

type JoinLiveTestButtonProps = {
  liveTestId: string;
  isLive: boolean;
};

export function JoinLiveTestButton({ liveTestId, isLive }: JoinLiveTestButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!isLive) return;
    
    setError(null);
    startTransition(async () => {
      try {
        await startLiveAttemptAction(liveTestId);
        router.push(`/live-arena/${liveTestId}/exam`);
      } catch (err: any) {
        setError(err.message || "Failed to join test.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleJoin}
        disabled={!isLive || isPending}
        className={`w-full rounded-[24px] py-6 text-lg font-black uppercase tracking-[0.2em] transition-all active:scale-[0.98] ${
          isLive 
            ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_20px_40px_-12px_rgba(16,185,129,0.3)] hover:scale-[1.02]" 
            : "bg-zinc-100 text-zinc-400 cursor-not-allowed border-2 border-dashed border-zinc-200"
        }`}
      >
        {isPending ? "Entering Arena..." : isLive ? "Enter Arena 🌩️" : "Awaiting Command"}
      </button>
      {error && <p className="text-center text-sm font-semibold text-red-500">{error}</p>}
    </div>
  );
}
