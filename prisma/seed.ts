import { PrismaClient, Subject, QuestionType, AnswerPolicy, TestMode } from "@prisma/client";
import { createTestWithQuestions } from "../src/lib/test-builder";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const chapterMap: Partial<Record<Subject, string[]>> = {
  PHYSICS: ["Kinematics", "Laws of Motion", "Work and Energy", "Current Electricity", "Optics", "Modern Physics"],
  CHEMISTRY: ["Atomic Structure", "Chemical Bonding", "Thermodynamics", "Equilibrium", "Organic Basics", "Biomolecules"],
  BIOLOGY: ["Cell Biology", "Plant Physiology", "Genetics", "Ecology", "Human Physiology", "Evolution"],
  MAJOR_TEST: ["Full Syllabus Mock", "Grand Revision", "Previous Year Paper", "Mixed Practice Set"],
};

function buildOptions(seed: number) {
  return [
    { key: "A", text: `${seed + 1}` },
    { key: "B", text: `${seed + 2}` },
    { key: "C", text: `${seed + 3}` },
    { key: "D", text: `${seed + 4}` },
  ];
}

async function main() {
  await prisma.attempt.deleteMany();
  await prisma.testQuestion.deleteMany();
  await prisma.test.deleteMany();
  await prisma.question.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.student.deleteMany();

  const questionRows = Object.entries(chapterMap).flatMap(([subject, chapters]) =>
    chapters.flatMap((chapter, chapterIndex) =>
      Array.from({ length: 18 }, (_, index) => {
        const seed = chapterIndex * 20 + index;
        const correctIndex = seed % 4;

        return {
          subject: subject as Subject,
          chapter,
          type: QuestionType.TEXT,
          prompt: `${subject} | ${chapter} | Q${index + 1}: Identify the correct option for concept value ${seed + 10}.`,
          options: buildOptions(seed),
          correctAnswers: [["A", "B", "C", "D"][correctIndex]],
          answerPolicy: seed % 17 === 0 ? AnswerPolicy.MULTIPLE : AnswerPolicy.SINGLE,
          metadata: seed % 17 === 0 ? { explanation: "This is configured as a multiple-correct demonstration item." } : undefined,
        };
      }),
    ),
  );

  await prisma.question.createMany({
    data: questionRows,
  });

  const questions = await prisma.question.findMany({ orderBy: { createdAt: "asc" } });

  await createTestWithQuestions(prisma, {
    name: "Full NEET Mock 01",
    description: "200-question NEET-style mock with 180 evaluated responses.",
    durationMinutes: 200,
    correctMarks: 4,
    incorrectMarks: -1,
    unansweredMarks: 0,
    mode: TestMode.NEET_PATTERN,
    subjectConfigs: [
      { subject: Subject.PHYSICS, sectionA: 35, sectionB: 15 },
      { subject: Subject.CHEMISTRY, sectionA: 35, sectionB: 15 },
      { subject: Subject.BIOLOGY, sectionA: 35, sectionB: 15 },
      { subject: Subject.MAJOR_TEST, sectionA: 35, sectionB: 15 },
    ],
  });

  await createTestWithQuestions(prisma, {
    name: "Biology Rapid Drill",
    description: "60-question custom practice test with admin-configured timing.",
    durationMinutes: 45,
    correctMarks: 4,
    incorrectMarks: -1,
    unansweredMarks: 0,
    mode: TestMode.CUSTOM,
    questionConfigs: [
      { subject: Subject.BIOLOGY, chapter: "Genetics", count: 15 },
      { subject: Subject.BIOLOGY, chapter: "Ecology", count: 15 },
      { subject: Subject.BIOLOGY, chapter: "Human Physiology", count: 15 },
      { subject: Subject.BIOLOGY, chapter: "Evolution", count: 15 },
    ],
  });

  await prisma.student.create({
    data: {
      username: "satyam",
      displayName: "satyam",
      passwordHash: hashPassword("123"),
    },
  });

  await prisma.admin.create({
    data: {
      username: "admin",
      displayName: "Admin",
      passwordHash: hashPassword("admin123"),
    },
  });

  console.log(`Seeded ${questions.length} questions and demo tests.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
