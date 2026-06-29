"use client";

import { useEffect } from "react";

export default function LiveArenaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[live-arena] Error boundary caught:", error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-[720px] flex-col items-center gap-8 px-6 py-20 min-h-screen bg-slate-50">
      <div className="text-center space-y-6">
        <div className="text-6xl">⚡</div>
        <h1 className="text-3xl font-black text-zinc-900 tracking-tight">
          Something went wrong
        </h1>
        <p className="text-lg text-zinc-500 font-medium max-w-md mx-auto">
          The server is under heavy load. This usually resolves itself within a few seconds.
        </p>
        {error.digest && (
          <p className="text-xs text-zinc-400 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <button
        onClick={reset}
        className="rounded-2xl bg-emerald-500 px-10 py-4 text-lg font-black uppercase tracking-[0.15em] text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600 hover:scale-[1.02] active:scale-[0.98]"
      >
        Try Again
      </button>
    </main>
  );
}
