"use client";

import { useEffect, useState } from "react";

const STUDENT_SESSION_CHANGED_EVENT = "student-session-changed";

type StudentPayload = {
  student: {
    id: string;
    username: string;
    displayName: string | null;
  } | null;
};

export function StudentHeaderGreeting() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadStudent = () => {
      void fetch("/api/student/me", { cache: "no-store" })
        .then((response) => response.json() as Promise<StudentPayload>)
        .then((payload) => {
          if (!active) {
            return;
          }

          setName(payload.student ? payload.student.displayName ?? payload.student.username : null);
        })
        .catch(() => {
          if (active) {
            setName(null);
          }
        });
    };

    loadStudent();
    window.addEventListener(STUDENT_SESSION_CHANGED_EVENT, loadStudent);

    return () => {
      active = false;
      window.removeEventListener(STUDENT_SESSION_CHANGED_EVENT, loadStudent);
    };
  }, []);

  if (!name) {
    return null;
  }

  return <div className="rounded-full border border-[#ffcf9f] bg-[#fff1df] px-4 py-2 text-center text-sm font-semibold text-[#d7671b] shadow-[0_10px_30px_rgba(215,103,27,0.12)]">Hi, {name} 👋</div>;
}