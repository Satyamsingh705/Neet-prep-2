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

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-sm font-medium text-slate-700">
      <span className="w-2 h-2 rounded-full bg-emerald-500" />
      Hi, {name} <span className="text-lg">👋</span>
    </div>
  );
}