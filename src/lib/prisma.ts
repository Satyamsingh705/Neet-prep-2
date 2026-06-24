import "dotenv/config";
import { PrismaClient } from "@prisma/client";

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

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
