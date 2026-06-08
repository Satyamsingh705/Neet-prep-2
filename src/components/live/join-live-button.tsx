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
        className={`w-full rounded-2xl py-4 text-lg font-bold transition-all ${
          isLive 
            ? "bg-[#d7671b] text-white hover:bg-[#b85616] shadow-lg shadow-orange-200" 
            : "bg-[#f4f2ed] text-[#8a6a52] cursor-not-allowed border-2 border-dashed border-[#d8d1c6]"
        }`}
      >
        {isPending ? "Entering Arena..." : isLive ? "Enter Competition" : "Waiting for start..."}
      </button>
      {error && <p className="text-center text-sm font-semibold text-red-500">{error}</p>}
    </div>
  );
}
