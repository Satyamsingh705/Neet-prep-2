"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";
import { broadcastTestsChanged } from "@/lib/live-updates";

type AdminTestListProps = {
  tests: Array<{
    id: string;
    testCode: string | null;
    name: string;
    totalQuestions: number;
    durationMinutes: number;
    mode: string;
    published: boolean;
    _count: {
      attempts: number;
    };
  }>;
};

export function AdminTestList({ tests }: AdminTestListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  async function togglePublish(testId: string, testName: string, published: boolean) {
    setTogglingId(testId);
    setMessage("");

    try {
      const response = await fetch(`/api/tests/${testId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !published }),
      });
      const text = await response.text();
      let payload: { error?: string; test?: { published: boolean } } = {};
      try {
        payload = JSON.parse(text);
      } catch {
        if (!response.ok) {
          throw new Error(`Update failed: ${text}`);
        }
      }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update test.");
      }

      setMessage(`${published ? "Unpublished" : "Published"} test: ${testName}`);
      // Broadcast change to other connected clients and trigger a full page refresh
      broadcastTestsChanged();
      // Use a small delay to ensure server cache is revalidated before refresh
      setTimeout(() => {
        router.refresh();
      }, 100);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update test.");
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteTest() {
    if (!pendingDelete) {
      return;
    }

    setDeletingId(pendingDelete.id);
    setMessage("");

    try {
      // First attempt without forcing
      let response = await fetch(`/api/tests/${pendingDelete.id}`, { method: "DELETE" });
      let text = await response.text();
      let payload: { error?: string } = {};
      try {
        payload = JSON.parse(text);
      } catch {
        if (!response.ok) {
          throw new Error(`Delete failed: ${text}`);
        }
      }

      if (!response.ok) {
        // If the server complains because live tests exist, offer force-delete
        if (payload.error && payload.error.includes("used by one or more live tests")) {
          const confirmForce = window.confirm(
            "This test is used by one or more scheduled live events. Do you want to force delete the test and remove associated live events?"
          );

          if (confirmForce) {
            // Retry with force flag
            response = await fetch(`/api/tests/${pendingDelete.id}?force=1`, { method: "DELETE" });
            text = await response.text();
            try {
              payload = JSON.parse(text);
            } catch {
              if (!response.ok) throw new Error(`Delete failed: ${text}`);
            }

            if (!response.ok) {
              throw new Error(payload.error ?? "Failed to delete test.");
            }

            setMessage(`Deleted test (forced): ${pendingDelete.name}`);
            broadcastTestsChanged();
            router.refresh();
          } else {
            throw new Error(payload.error ?? "Failed to delete test.");
          }
        } else {
          throw new Error(payload.error ?? "Failed to delete test.");
        }
      } else {
        setMessage(`Deleted test: ${pendingDelete.name}`);
        broadcastTestsChanged();
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete test.");
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  }

  return (
    <section className="panel rounded-[1.4rem] p-6">
      <h2 className="text-2xl font-semibold text-[#2f241c]">Available Tests</h2>
      <div className="mt-5 max-h-[600px] space-y-4 overflow-y-auto">
        {tests.map((test) => (
          <div key={test.id} className="rounded-[1rem] border border-[#eadbcd] bg-[#fffdfa] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-semibold text-[#2f241c]">{test.name}</div>
                  <span className="rounded-full bg-[#f5f0e8] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a6a52]">
                    {test.testCode ?? `TST-${test.id.slice(-8).toUpperCase()}`}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${test.published ? "bg-[#e7f5e8] text-[#2b7a36]" : "bg-[#f5eadb] text-[#9a6a35]"}`}>
                    {test.published ? "Published" : "Draft"}
                  </span>
                </div>
                <div className="mt-2 text-sm text-[#6d5a49]">{test.totalQuestions} questions · {test.durationMinutes} min · {test.mode} · {test._count.attempts} attempts</div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary px-3 py-2 text-xs"
                  disabled={togglingId === test.id}
                  onClick={() => void togglePublish(test.id, test.name, test.published)}
                >
                  {togglingId === test.id ? "Saving..." : test.published ? "Move To Draft" : "Publish"}
                </button>
                <button
                  type="button"
                  className="btn-danger px-3 py-2 text-xs"
                  disabled={deletingId === test.id}
                  onClick={() => setPendingDelete({ id: test.id, name: test.name })}
                >
                  {deletingId === test.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {message ? <div className="mt-4 text-sm text-[#6d5a49]">{message}</div> : null}
      <ConfirmationDialog
        open={pendingDelete !== null}
        title="Delete Test"
        description={pendingDelete ? `Delete test "${pendingDelete.name}"? This will also remove its attempts.` : ""}
        confirmLabel="Delete Test"
        isProcessing={deletingId !== null}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void deleteTest()}
      />
    </section>
  );
}
