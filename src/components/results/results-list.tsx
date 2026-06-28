"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/format-date-time";

type AttemptResult = {
  id: string;
  studentName: string | null;
  status: string;
  submittedAt: string | null;
  result: unknown;
  test: {
    id: string;
    name: string;
    testCode: string | null;
  };
};

export function ResultsList({
  initialAttempts,
  totalCount,
  pageSize,
}: {
  initialAttempts: AttemptResult[];
  totalCount: number;
  pageSize: number;
}) {
  const [attempts, setAttempts] = useState<AttemptResult[]>(initialAttempts);
  const [loading, setLoading] = useState(false);
  const [allLoaded, setAllLoaded] = useState(initialAttempts.length >= totalCount);

  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/results?offset=${attempts.length}&limit=${pageSize}`);
      const data = await response.json();

      if (data.attempts && data.attempts.length > 0) {
        setAttempts((prev) => [...prev, ...data.attempts]);
        if (attempts.length + data.attempts.length >= totalCount) {
          setAllLoaded(true);
        }
      } else {
        setAllLoaded(true);
      }
    } catch {
      // Silently handle errors — user can retry
    } finally {
      setLoading(false);
    }
  }, [attempts.length, pageSize, totalCount]);

  return (
    <>
      {/* Mobile card layout */}
      <div className="mt-5 grid gap-3 md:hidden">
        {attempts.length > 0 ? (
          attempts.map((attempt) => {
            const result = attempt.result as { score?: number } | null;

            return (
              <div key={attempt.id} className="rounded-[1rem] border border-[#e6d9cb] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[#2f241c]">{attempt.test.name}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[#8a6a52]">{attempt.test.testCode ?? `TST-${attempt.test.id.slice(-8).toUpperCase()}`}</div>
                  </div>
                  <div className="rounded-full bg-[#f6e4d3] px-3 py-1 text-xs font-semibold text-[#b85f20]">{result?.score ?? "-"}</div>
                </div>
                <div className="mt-3 space-y-1 text-sm text-[#65584a]">
                  <div>Student: {attempt.studentName ?? attempt.id.slice(-6)}</div>
                  <div>Status: {attempt.status}</div>
                  <div>Submitted: {attempt.submittedAt ? formatDateTime(attempt.submittedAt) : "-"}</div>
                </div>
                <Link href={`/results/${attempt.id}`} className="btn-primary mt-4 w-full text-sm">
                  View Analysis
                </Link>
              </div>
            );
          })
        ) : (
          <div className="rounded-[1rem] border border-dashed border-[#d9cfc3] bg-[#fcfbf8] p-5 text-center text-sm text-[#736455]">
            No submitted results yet.
          </div>
        )}
      </div>

      {/* Desktop table layout */}
      <div className="mt-5 hidden max-h-[600px] overflow-y-auto rounded-[1rem] border border-[#e6d9cb] md:block">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#f7efe6] text-[#7a5f4c]">
            <tr>
              <th className="px-4 py-3 font-semibold">Student</th>
              <th className="px-4 py-3 font-semibold">Test</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Score</th>
              <th className="px-4 py-3 font-semibold">Submitted</th>
              <th className="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((attempt) => {
              const result = attempt.result as { score?: number } | null;

              return (
                <tr key={attempt.id} className="border-t border-[#eee3d7] bg-white">
                  <td className="px-4 py-3 font-medium text-[#2f241c]">{attempt.studentName ?? attempt.id.slice(-6)}</td>
                  <td className="px-4 py-3 text-[#65584a]">
                    <div className="font-medium text-[#2f241c]">{attempt.test.name}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[#8a6a52]">{attempt.test.testCode ?? `TST-${attempt.test.id.slice(-8).toUpperCase()}`}</div>
                  </td>
                  <td className="px-4 py-3 text-[#65584a]">{attempt.status}</td>
                  <td className="px-4 py-3 text-[#65584a]">{result?.score ?? "-"}</td>
                  <td className="px-4 py-3 text-[#65584a]">{attempt.submittedAt ? formatDateTime(attempt.submittedAt) : "-"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/results/${attempt.id}`} className="btn-primary inline-flex px-3 py-2 text-xs">
                      View Analysis
                    </Link>
                  </td>
                </tr>
              );
            })}
            {attempts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#736455]">
                  No submitted results yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Load More button */}
      {!allLoaded && attempts.length > 0 && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-[#d9b28c] bg-[#fff7ef] px-6 py-2.5 text-sm font-semibold text-[#b85f20] transition hover:border-[#c88755] hover:bg-[#fff1df] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading...
              </>
            ) : (
              <>Load More Results ({totalCount - attempts.length} remaining)</>
            )}
          </button>
        </div>
      )}

      {allLoaded && attempts.length > 0 && totalCount > pageSize && (
        <div className="mt-4 text-center text-sm text-[#8a6a52]">
          All {totalCount} results loaded
        </div>
      )}
    </>
  );
}
