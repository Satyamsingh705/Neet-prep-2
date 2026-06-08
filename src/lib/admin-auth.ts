import { createHmac } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_SESSION_COOKIE = "admin_session";

function getAdminSessionSecret() {
  if (process.env.ADMIN_SESSION_SECRET) {
    return process.env.ADMIN_SESSION_SECRET;
  }

  if (process.env.NODE_ENV !== "production") {
    return "local-admin-session-secret";
  }

  throw new Error("Missing ADMIN_SESSION_SECRET in production.");
}

type AdminSessionPayload = {
  adminId: string;
  username: string;
  displayName?: string | null;
};

function sign(value: string) {
  return createHmac("sha256", getAdminSessionSecret()).update(value).digest("hex");
}

function encodeSession(payload: AdminSessionPayload) {
  const serializedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${serializedPayload}.${sign(serializedPayload)}`;
}

function decodeSession(value: string | undefined | null): AdminSessionPayload | null {
  if (!value) {
    return null;
  }

  const [serializedPayload, signature] = value.split(".");

  if (!serializedPayload || !signature || sign(serializedPayload) !== signature) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(serializedPayload, "base64url").toString("utf8")) as AdminSessionPayload;
  } catch {
    return null;
  }
}

export function buildAdminSessionCookie(payload: AdminSessionPayload) {
  return {
    name: ADMIN_SESSION_COOKIE,
    value: encodeSession(payload),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export function clearAdminSessionCookie() {
  return {
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

export const getCurrentAdmin = cache(async () => {
  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!session) {
    return null;
  }

  return {
    id: session.adminId,
    username: session.username,
    displayName: session.displayName ?? null,
  };
});

export async function requireCurrentAdmin() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin");
  }

  return admin;
}