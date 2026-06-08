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
    <button type="button" className="btn-secondary w-full md:w-auto" onClick={() => void handleLogout()} disabled={isSubmitting}>
      {isSubmitting ? "Signing out..." : "Logout"}
    </button>
  );
}
