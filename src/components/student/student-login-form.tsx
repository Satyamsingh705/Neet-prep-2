"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STUDENT_SESSION_CHANGED_EVENT = "student-session-changed";

export function StudentLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("Signing in...");

    try {
      const response = await fetch("/api/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to sign in.");
      }

      setMessage("Signed in successfully.");
      window.dispatchEvent(new Event(STUDENT_SESSION_CHANGED_EVENT));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
      <label className="flex flex-col gap-2 text-sm text-[#6f5d4d]">
        Student ID
        <input value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-lg border border-[#dacdbf] bg-white px-3 py-3" />
      </label>
      <label className="flex flex-col gap-2 text-sm text-[#6f5d4d]">
        Password
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-[#dacdbf] bg-white px-3 py-3" />
      </label>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <button disabled={isSubmitting} type="submit" className="btn-primary w-full sm:w-auto">Student Login</button>
        {message ? <span className="text-sm text-[#6d5a49] sm:flex-1">{message}</span> : null}
      </div>
    </form>
  );
}
