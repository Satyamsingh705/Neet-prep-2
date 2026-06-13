import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const id = process.argv[2];

if (!id) {
  console.error('Usage: npx tsx prisma/check_attempt.ts <attemptId>');
  process.exit(1);
}

async function main() {
  const attempt = await prisma.attempt.findUnique({ where: { id } });
  if (attempt) {
    console.log('Found Attempt:', attempt.id, 'studentId=', attempt.studentId, 'status=', attempt.status, 'testId=', attempt.testId);
  } else {
    console.log('Attempt not found in Attempt table. Checking LiveTestAttempt...');
  }

  const live = await prisma.liveTestAttempt.findUnique({ where: { id } });
  if (live) {
    console.log('Found LiveTestAttempt:', live.id, 'studentId=', live.studentId, 'status=', live.status, 'liveTestId=', live.liveTestId);
  } else {
    console.log('Not found in LiveTestAttempt either.');
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
