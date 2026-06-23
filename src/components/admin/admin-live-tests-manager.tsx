"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/format-date-time";
import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";

type LiveTest = {
  id: string;
  title: string;
  startTime: Date;
  durationMinutes: number;
  status: string;
  _count: { attempts: number };
  testTemplate: { name: string };
};

interface AdminLiveTestsManagerProps {
  tests: LiveTest[];
}

export function AdminLiveTestsManager({ tests }: AdminLiveTestsManagerProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  async function deleteLiveTest() {
    if (!pendingDelete) return;

    setDeletingId(pendingDelete.id);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/live-tests/${pendingDelete.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const text = await response.text();
      let payload: { error?: string; message?: string } = {};

      try {
        payload = JSON.parse(text);
      } catch {
        if (!response.ok) {
          throw new Error(`Delete failed: ${text}`);
        }
      }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete arena test.");
      }

      setMessage(
        `Deleted arena: ${pendingDelete.title}. All registrations and attempts removed.`
      );
      setPendingDelete(null);

      // Refresh page to show updated list
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete arena test.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-[#e6d9cb]">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-[#fcfbf8] text-[#8a6a52]">
            <tr>
              <th className="px-4 py-3 font-bold">Title</th>
              <th className="px-4 py-3 font-bold">Starts At</th>
              <th className="px-4 py-3 font-bold">Duration</th>
              <th className="px-4 py-3 font-bold text-center">Joined</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eee3d7]">
            {tests.map((test) => (
              <tr key={test.id} className="hover:bg-[#fcfbf8]">
                <td className="px-4 py-3">
                  <div className="font-bold text-[#2f241c]">{test.title}</div>
                  <div className="text-[0.65rem] uppercase tracking-wider text-[#8a6a52]">
                    {test.testTemplate.name}
                  </div>
                </td>
                <td className="px-4 py-3 text-[#6d5a49]">
                  {formatDateTime(test.startTime)}
                </td>
                <td className="px-4 py-3 text-[#6d5a49]">{test.durationMinutes}m</td>
                <td className="px-4 py-3 text-center text-[#6d5a49]">
                  {test._count.attempts}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${getStatusColor(
                      test.status
                    )}`}
                  >
                    {test.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() =>
                      setPendingDelete({ id: test.id, title: test.title })
                    }
                    disabled={deletingId === test.id}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    {deletingId === test.id ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {message && (
        <div className="mt-4 p-3 rounded-lg bg-blue-50 text-blue-700 text-sm">
          {message}
        </div>
      )}
      <ConfirmationDialog
        open={pendingDelete !== null}
        title="Delete Arena Test"
        description={
          pendingDelete
            ? `Delete arena "${pendingDelete.title}"? This will remove all student registrations and attempts. Students will no longer see this arena.`
            : ""
        }
        confirmLabel="Delete Arena"
        onConfirm={() => void deleteLiveTest()}
        onCancel={() => setPendingDelete(null)}
        isProcessing={deletingId !== null}
      />
    </>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case "SCHEDULED":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "LIVE":
      return "bg-red-50 text-red-700 ring-red-200";
    case "COMPLETED":
      return "bg-green-50 text-green-700 ring-green-200";
    case "CANCELLED":
      return "bg-gray-50 text-gray-700 ring-gray-200";
    default:
      return "bg-gray-50 text-gray-700 ring-gray-200";
  }
}
