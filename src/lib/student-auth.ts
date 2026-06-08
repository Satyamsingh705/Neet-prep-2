import { createHmac } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const STUDENT_SESSION_COOKIE = "student_session";

function getStudentSessionSecret() {
  if (process.env.STUDENT_SESSION_SECRET) {
    return process.env.STUDENT_SESSION_SECRET;
  }

  if (process.env.NODE_ENV !== "production") {
    return "local-student-session-secret";
  }

  throw new Error("Missing STUDENT_SESSION_SECRET in production.");
}

type StudentSessionPayload = {
  studentId: string;
  username: string;
  displayName?: string | null;
};

function sign(value: string) {
  return createHmac("sha256", getStudentSessionSecret()).update(value).digest("hex");
}

function encodeSession(payload: StudentSessionPayload) {
  const serializedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(serializedPayload);
  return `${serializedPayload}.${signature}`;
}

function decodeSession(value: string | undefined | null): StudentSessionPayload | null {
  if (!value) {
    return null;
  }

  const [serializedPayload, signature] = value.split(".");

  if (!serializedPayload || !signature || sign(serializedPayload) !== signature) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(serializedPayload, "base64url").toString("utf8")) as StudentSessionPayload;
  } catch {
    return null;
  }
}

export function buildStudentSessionCookie(payload: StudentSessionPayload) {
  return {
    name: STUDENT_SESSION_COOKIE,
    value: encodeSession(payload),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export function clearStudentSessionCookie() {
  return {
    name: STUDENT_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

export const getCurrentStudent = cache(async () => {
  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(STUDENT_SESSION_COOKIE)?.value);

  if (!session) {
    return null;
  }

  return {
    id: session.studentId,
    username: session.username,
    displayName: session.displayName ?? null,
  };
});

export const getCurrentStudentRecord = cache(async () => {
  const sessionStudent = await getCurrentStudent();

  if (!sessionStudent) {
    return null;
  }

  const student = await prisma.student.findUnique({
    where: { username: sessionStudent.username },
    select: {
      id: true,
      username: true,
      displayName: true,
      isActive: true,
    },
  });

  if (!student?.isActive) {
    return null;
  }

  return {
    id: student.id,
    username: student.username,
    displayName: student.displayName,
  };
});

export async function requireCurrentStudent() {
  const student = await getCurrentStudent();

  if (!student) {
    redirect("/");
  }

  return student;
}

export async function requireCurrentStudentRecord() {
  const student = await getCurrentStudentRecord();

  if (!student) {
    redirect("/");
  }

  return student;
}
