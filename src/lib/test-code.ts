import { randomBytes } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

function createCandidateTestCode() {
  return `TST-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function generateUniqueTestCode(prisma: DbClient) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const testCode = createCandidateTestCode();
    const existing = await prisma.test.findFirst({
      where: { testCode },
      select: { id: true },
    });

    if (!existing) {
      return testCode;
    }
  }

  throw new Error("Unable to generate a unique test ID. Please try again.");
}

export function getReadableTestCode(test: { testCode: string | null; id: string }) {
  return test.testCode ?? `TST-${test.id.slice(-8).toUpperCase()}`;
}
