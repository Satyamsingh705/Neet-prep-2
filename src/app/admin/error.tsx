"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] Error boundary caught:", error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-[720px] flex-col items-center gap-8 px-6 py-20">
      <div className="text-center space-y-6">
        <div className="text-6xl">⚙️</div>
        <h1 className="text-3xl font-semibold text-[#2f241c]">
          Admin Panel Error
        </h1>
        <p className="text-lg text-[#65584a] max-w-md mx-auto">
          The server is under heavy load or experiencing a temporary issue. Your data is safe.
        </p>
        {error.digest && (
          <p className="text-xs text-[#8a6a52] font-mono">
            Digest: {error.digest}
          </p>
        )}
      </div>
      <button
        onClick={reset}
        className="btn-primary rounded-xl px-8 py-3 text-base font-semibold"
      >
        Retry
      </button>
    </main>
  );
}
