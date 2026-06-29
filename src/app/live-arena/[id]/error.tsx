"use client";

import { useEffect } from "react";

export default function LiveTestDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[live-arena/[id]] Error boundary caught:", error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-[720px] flex-col items-center gap-8 px-6 py-20 min-h-screen bg-slate-50">
      <div className="text-center space-y-6">
        <div className="text-6xl">🌩️</div>
        <h1 className="text-3xl font-black text-zinc-900 tracking-tight">
          Temporary Disruption
        </h1>
        <p className="text-lg text-zinc-500 font-medium max-w-md mx-auto">
          The arena is experiencing high traffic. Your test data is safe — tap below to reload.
        </p>
        {error.digest && (
          <p className="text-xs text-zinc-400 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-4 items-center">
        <button
          onClick={reset}
          className="rounded-2xl bg-emerald-500 px-10 py-4 text-lg font-black uppercase tracking-[0.15em] text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600 hover:scale-[1.02] active:scale-[0.98]"
        >
          Reload Arena
        </button>
        <a
          href="/live-arena"
          className="text-sm font-semibold text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          ← Back to all arenas
        </a>
      </div>
    </main>
  );
}
