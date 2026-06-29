import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const databaseUrl = process.env.DATABASE_URL ?? "";
const directSupabaseHostPattern = /@db\.[^.]+\.supabase\.co:5432/i;

function warnIfRuntimeUsesDirectSupabaseHost() {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  if (!databaseUrl || !directSupabaseHostPattern.test(databaseUrl)) {
    return;
  }

  const maskedUrl = databaseUrl.replace(/:[^@:]+@/, ":****@");

  console.warn(
    `[prisma] DATABASE_URL (${maskedUrl}) is using a direct Supabase host on port 5432. If that hostname does not resolve locally, Prisma reads will fail. Prefer the Supabase pooler URL for runtime and keep the direct URL only for DIRECT_URL.`,
  );
}

function createPrismaClient() {
  warnIfRuntimeUsesDirectSupabaseHost();

  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    if (process.env.NODE_ENV === "production") {
      console.error("[prisma] DATABASE_URL is missing from process.env. Ensure your Vercel environment variables are configured.");
    } else {
      console.warn("[prisma] DATABASE_URL is missing from process.env. Using placeholder URL for build. Set DATABASE_URL in .env.local for runtime operations.");
    }
  }

  // Use placeholder URL during build if DATABASE_URL is missing; will fail at runtime only if actually used
  const client = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl || "postgresql://placeholder:placeholder@localhost:5432/placeholder",
      },
    },
    log: process.env.NODE_ENV === "development" ? [{ emit: "event", level: "query" }, "error", "warn"] : ["error"],
  });

  if (process.env.NODE_ENV === "development") {
    // @ts-ignore
    client.$on("query", (e: any) => {
      console.log(`[prisma] Query: ${e.query}`);
      console.log(`[prisma] Duration: ${e.duration}ms`);
    });
  }

  return client;
}

const cachedPrisma = globalForPrisma.prisma;

function hasRequiredDelegates(client: PrismaClient | undefined): client is PrismaClient {
  if (!client) {
    return false;
  }

  const prismaWithDelegates = client as PrismaClient & {
    student?: unknown;
    admin?: unknown;
    liveTest?: unknown;
  };

  return [
    prismaWithDelegates.student,
    prismaWithDelegates.admin,
    prismaWithDelegates.liveTest,
  ].every((delegate) => typeof delegate !== "undefined");
}

let prismaClient: PrismaClient;

if (hasRequiredDelegates(cachedPrisma)) {
  prismaClient = cachedPrisma;
} else {
  prismaClient = createPrismaClient();
}

export const prisma = prismaClient;

// Cache the singleton on globalThis in ALL environments (including production).
// On Vercel, warm serverless invocations share the module scope, so this prevents
// creating new PrismaClient instances on every request — the #1 cause of
// connection pool exhaustion under concurrent load.
globalForPrisma.prisma = prisma;

/**
 * Checks whether an error is a transient database connectivity issue
 * (connection pool timeout, connection refused, etc.) that can be retried.
 */
export function isTransientDbError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2024 = "Timed out fetching a new connection from the connection pool"
    // P1001 = "Can't reach database server"
    // P1008 = "Operations timed out"
    // P1017 = "Server has closed the connection"
    // P2028 = "Transaction API error" (e.g. transaction timeout)
    // P2034 = "Transaction failed due to a write conflict or a deadlock"
    return ["P2024", "P1001", "P1008", "P1017", "P2028", "P2034"].includes(error.code);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("timed out fetching a new connection") ||
      msg.includes("connection pool timeout") ||
      msg.includes("connection refused") ||
      msg.includes("connection reset") ||
      msg.includes("too many connections") ||
      msg.includes("server has closed the connection") ||
      msg.includes("econnreset") ||
      msg.includes("econnrefused") ||
      msg.includes("transaction timeout") ||
      msg.includes("deadlock") ||
      msg.includes("write conflict")
    );
  }

  return false;
}

/**
 * Retry wrapper for database operations that may fail due to transient
 * connection pool exhaustion. Uses exponential backoff.
 * 
 * @param fn - The async function to retry
 * @param maxRetries - Maximum number of retries (default 3)
 * @param baseDelayMs - Initial delay in ms before first retry (default 150)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 150,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries && isTransientDbError(error)) {
        const jitter = Math.random() * 50;
        const delay = baseDelayMs * Math.pow(2, attempt) + jitter;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}
