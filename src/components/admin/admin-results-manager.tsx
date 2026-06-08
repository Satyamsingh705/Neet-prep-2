"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";

type AdminResultsManagerProps = {
  attempts: Array<{
    id: string;
    testId: string;
    studentName: string | null;
    status: string;
    submittedAt: string | null;
    score: number | null;
    testName: string;
    testCode: string | null;
  }>;
};

export function AdminResultsManager({ attempts }: AdminResultsManagerProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ attemptId: string; testName: string; studentName: string | null } | null>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredAttempts = normalizedQuery
    ? attempts.filter((attempt) => {
        const readableTestCode = attempt.testCode ?? `TST-${attempt.testId.slice(-8).toUpperCase()}`;
        return [readableTestCode, attempt.testName, attempt.studentName ?? ""].some((value) => value.toLowerCase().includes(normalizedQuery));
      })
    : attempts;

  async function deleteResult() {
    if (!pendingDelete) {
      return;
    }

    const label = pendingDelete.studentName ?? pendingDelete.attemptId.slice(-6);

    setDeletingId(pendingDelete.attemptId);
    setMessage("");

    try {
      const response = await fetch(`/api/results/${pendingDelete.attemptId}`, { method: "DELETE" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete result.");
      }

      setMessage(`Deleted result for ${label}.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete result.");
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  }

  return (
    <section className="panel rounded-[1.4rem] p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-[#2f241c]">All Submitted Attempts</h2>
        <div className="rounded-full bg-[#f6e4d3] px-3 py-1 text-sm font-semibold text-[#b85f20]">{filteredAttempts.length} results</div>
      </div>

      <div className="mt-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by Test ID, test name, or student"
          className="w-full rounded-lg border border-[#dacdbf] bg-white px-3 py-3 text-sm text-[#2f241c]"
        />
      </div>

      <div className="mt-5 overflow-hidden rounded-[1rem] border border-[#e6d9cb]">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-[#f7efe6] text-[#7a5f4c]">
            <tr>
              <th className="px-4 py-3 font-semibold">Student</th>
              <th className="px-4 py-3 font-semibold">Test</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Score</th>
              <th className="px-4 py-3 font-semibold">Submitted</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttempts.map((attempt) => (
              <tr key={attempt.id} className="border-t border-[#eee3d7] bg-white">
                <td className="px-4 py-3 font-medium text-[#2f241c]">{attempt.studentName ?? attempt.id.slice(-6)}</td>
                <td className="px-4 py-3 text-[#65584a]">
                  <div className="font-medium text-[#2f241c]">{attempt.testName}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[#8a6a52]">{attempt.testCode ?? `TST-${attempt.testId.slice(-8).toUpperCase()}`}</div>
                </td>
                <td className="px-4 py-3 text-[#65584a]">{attempt.status}</td>
                <td className="px-4 py-3 text-[#65584a]">{attempt.score ?? "-"}</td>
                <td className="px-4 py-3 text-[#65584a]">{attempt.submittedAt ?? "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/results/${attempt.id}`} className="btn-primary inline-flex px-3 py-2 text-xs">
                      View Analysis
                    </Link>
                    <button
                      type="button"
                      className="btn-danger px-3 py-2 text-xs"
                      disabled={deletingId === attempt.id}
                      onClick={() => setPendingDelete({ attemptId: attempt.id, testName: attempt.testName, studentName: attempt.studentName })}
                    >
                      {deletingId === attempt.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredAttempts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#736455]">
                  No submitted results match this search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {message ? <div className="mt-4 text-sm text-[#6d5a49]">{message}</div> : null}
      <ConfirmationDialog
        open={pendingDelete !== null}
        title="Delete Submitted Result"
        description={pendingDelete ? `Delete submitted result for "${pendingDelete.studentName ?? pendingDelete.attemptId.slice(-6)}" on test "${pendingDelete.testName}"?` : ""}
        confirmLabel="Delete Result"
        isProcessing={deletingId !== null}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void deleteResult()}
      />
    </section>
  );
}