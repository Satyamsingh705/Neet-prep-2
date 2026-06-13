"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STUDENT_SESSION_CHANGED_EVENT = "student-session-changed";

export function StudentLogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);

    try {
      await fetch("/api/student/logout", { method: "POST" });
      window.dispatchEvent(new Event(STUDENT_SESSION_CHANGED_EVENT));
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button 
      type="button" 
      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors w-full md:w-auto disabled:opacity-50" 
      onClick={() => void handleLogout()} 
      disabled={isSubmitting}
    >
      {isSubmitting ? "Signing out..." : "Logout"}
    </button>
  );
}
