"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);

    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button type="button" className="btn-secondary" onClick={() => void handleLogout()} disabled={isSubmitting}>
      {isSubmitting ? "Signing out..." : "Admin Logout"}
    </button>
  );
}