"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";

type AdminStudentManagerProps = {
  students: Array<{
    id: string;
    username: string;
    displayName: string | null;
    _count: {
      attempts: number;
    };
  }>;
};

export function AdminStudentManager({ students }: AdminStudentManagerProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; username: string } | null>(null);

  async function handleCreateStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, displayName }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create student.");
      }

      setMessage(`Created student: ${payload.student.username}`);
      setUsername("");
      setPassword("");
      setDisplayName("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create student.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteStudent() {
    if (!pendingDelete) {
      return;
    }

    setDeletingId(pendingDelete.id);
    setMessage("");

    try {
      const response = await fetch(`/api/students/${pendingDelete.id}`, { method: "DELETE" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete student.");
      }

      setMessage(`Deleted student and records: ${pendingDelete.username}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete student.");
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="panel rounded-[1.4rem] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-[#2f241c]">Student Accounts</h2>
            <p className="mt-2 text-sm leading-6 text-[#6d5a49]">Create new student IDs and permanently remove any student account together with all saved attempts and results.</p>
          </div>
          <div className="rounded-full bg-[#f6e4d3] px-3 py-1 text-sm font-semibold text-[#b85f20]">{students.length} students</div>
        </div>

        <div className="mt-5 space-y-4">
          {students.map((student) => (
            <div key={student.id} className="rounded-[1rem] border border-[#eadbcd] bg-[#fffdfa] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-[#2f241c]">{student.displayName ?? student.username}</div>
                  <div className="mt-1 text-sm text-[#6d5a49]">Student ID: {student.username}</div>
                  <div className="mt-2 text-sm text-[#8b715d]">Stored attempts: {student._count.attempts}</div>
                </div>
                <button
                  type="button"
                  className="btn-danger px-3 py-2 text-xs"
                  disabled={deletingId === student.id}
                  onClick={() => setPendingDelete({ id: student.id, username: student.username })}
                >
                  {deletingId === student.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
          {students.length === 0 ? <div className="text-sm text-[#6d5a49]">No student accounts created yet.</div> : null}
        </div>
      </section>

      <section className="panel rounded-[1.4rem] p-6">
        <h2 className="text-2xl font-semibold text-[#2f241c]">Create Student</h2>
        <p className="mt-2 text-sm leading-6 text-[#6d5a49]">New passwords are encrypted before they are saved.</p>
        <form onSubmit={handleCreateStudent} className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm text-[#6f5d4d]">
            Student Name
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="rounded-lg border border-[#dacdbf] bg-white px-3 py-3" placeholder="e.g. Satyam Kumar" />
          </label>
          <label className="grid gap-2 text-sm text-[#6f5d4d]">
            Student ID
            <input value={username} onChange={(event) => setUsername(event.target.value)} className="rounded-lg border border-[#dacdbf] bg-white px-3 py-3" placeholder="e.g. satyam02" required />
          </label>
          <label className="grid gap-2 text-sm text-[#6f5d4d]">
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-lg border border-[#dacdbf] bg-white px-3 py-3" placeholder="Enter password" required />
          </label>
          <button type="submit" className="btn-primary w-full justify-center" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Student Account"}
          </button>
        </form>
        {message ? <div className="mt-4 text-sm text-[#6d5a49]">{message}</div> : null}
      </section>
      <ConfirmationDialog
        open={pendingDelete !== null}
        title="Delete Student Account"
        description={pendingDelete ? `Delete student account "${pendingDelete.username}"? This will permanently remove the student and all saved attempts/results for that account.` : ""}
        confirmLabel="Delete Student"
        isProcessing={deletingId !== null}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void deleteStudent()}
      />
    </div>
  );
}