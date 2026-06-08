"use client";

import { useEffect, useState } from "react";

type AdminPayload = {
  admin: {
    id: string;
    username: string;
    displayName: string | null;
  } | null;
};

export function AdminHeaderGreeting() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void fetch("/api/admin/me", { cache: "no-store" })
      .then((response) => response.json() as Promise<AdminPayload>)
      .then((payload) => {
        if (!active || !payload.admin) {
          return;
        }

        setName(payload.admin.displayName ?? payload.admin.username);
      })
      .catch(() => {
        if (active) {
          setName(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (!name) {
    return null;
  }

  return <div className="rounded-full border border-[#ffcf9f] bg-[#fff1df] px-4 py-2 text-sm font-semibold text-[#d7671b] shadow-[0_10px_30px_rgba(215,103,27,0.12)]">Admin, {name}</div>;
}