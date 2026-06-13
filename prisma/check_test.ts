import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tests = await prisma.test.findMany({ where: { name: { contains: 'Biology Quick', mode: undefined } } });
  console.log('Found tests matching "Biology Quick":', tests.length);
  for (const t of tests) {
    console.log(t.id, t.name, 'published=', t.published, 'mode=', t.mode, 'totalQuestions=', t.totalQuestions);
  }

  const byName = await prisma.test.findFirst({ where: { name: 'Biology Quick 2-Q Test' } });
  if (byName) {
    console.log('Exact match:', byName.id, byName.name, 'published=', byName.published);
  } else {
    console.log('Exact match not found. Searching by description...');
    const byDesc = await prisma.test.findMany({ where: { description: { contains: 'Two long multiline biology' } } });
    console.log('Matches by description:', byDesc.length);
    byDesc.forEach(d => console.log(d.id, d.name, d.published));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
