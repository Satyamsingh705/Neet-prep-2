import { getTestsForListing } from "@/lib/data";
import { isSubjectInCategory, normalizeSubjectCategory, type AdminSubjectCategory } from "@/lib/subject-categories";

export type ListedTest = Awaited<ReturnType<typeof getTestsForListing>>[number];

export const studentSections = [
  { id: "physics", title: "Physics", category: "PHYSICS", description: "Physics tests and chapter drills." },
  { id: "chemistry", title: "Chemistry", category: "CHEMISTRY", description: "Chemistry tests and topic practice." },
  { id: "biology", title: "Biology", category: "BIOLOGY", description: "Biology tests in one combined section." },
  { id: "major-tests", title: "Major Tests", category: "MAJOR_TEST", description: "Major mock exams and full-paper practice." },
] as const;

export type StudentSectionId = (typeof studentSections)[number]["id"];

function getStoredAssignedSection(test: ListedTest) {
  if (!test.config || typeof test.config !== "object" || Array.isArray(test.config)) {
    return null;
  }

  const assignedSection = (test.config as { assignedSection?: unknown }).assignedSection;

  return typeof assignedSection === "string" ? normalizeSubjectCategory(assignedSection) : null;
}

function getAssignedSection(test: ListedTest) {
  if (test.mode === "NEET_PATTERN") {
    return "MAJOR_TEST";
  }

  const storedAssignedSection = getStoredAssignedSection(test);

  if (storedAssignedSection) {
    return storedAssignedSection;
  }

  const inferredCategories = Array.from(new Set(test.testQuestions.map((question) => normalizeSubjectCategory(question.subject))));

  if (!test.config || typeof test.config !== "object" || Array.isArray(test.config)) {
    return inferredCategories.length === 1 ? inferredCategories[0] : null;
  }

  const config = test.config as { questionConfigs?: Array<{ subject?: unknown }> };

  if (Array.isArray(config.questionConfigs)) {
    const configCategories = Array.from(
      new Set(
        config.questionConfigs
          .map((questionConfig) => questionConfig?.subject)
          .filter((subject): subject is string => typeof subject === "string")
          .map((subject) => normalizeSubjectCategory(subject)),
      ),
    );

    if (configCategories.length === 1) {
      return configCategories[0];
    }
  }

  return inferredCategories.length === 1 ? inferredCategories[0] : null;
}

export function getSectionChapters(test: ListedTest, category: AdminSubjectCategory) {
  const storedAssignedSection = getStoredAssignedSection(test);

  if (storedAssignedSection === category) {
    return Array.from(new Set(test.testQuestions.map((question) => question.chapter)));
  }

  return Array.from(
    new Set(
      test.testQuestions
        .filter((question) => isSubjectInCategory(question.subject, category))
        .map((question) => question.chapter),
    ),
  );
}

export function getSectionTests(tests: ListedTest[], category: AdminSubjectCategory) {
  return tests
    .filter((test) => {
      const assignedSection = getAssignedSection(test);

      return assignedSection ? assignedSection === category : true;
    })
    .map((test) => ({
      ...test,
      sectionChapters: getSectionChapters(test, category),
    }))
    .filter((test) => test.sectionChapters.length > 0);
}

export function getMajorTests(tests: ListedTest[]) {
  return tests
    .filter(
      (test) =>
        test.mode === "NEET_PATTERN"
        || getAssignedSection(test) === "MAJOR_TEST"
        || test.testQuestions.some((question) => isSubjectInCategory(question.subject, "MAJOR_TEST")),
    )
    .map((test) => ({
      ...test,
      sectionChapters: Array.from(
        new Set(
          (test.mode === "NEET_PATTERN"
            ? test.testQuestions
            : test.testQuestions.filter((question) => isSubjectInCategory(question.subject, "MAJOR_TEST")))
            .map((question) => question.chapter),
        ),
      ),
    }));
}

export function getTestsBySection(tests: ListedTest[]) {
  const customTests = tests.filter((test) => test.mode !== "NEET_PATTERN");

  return {
    physics: getSectionTests(customTests, "PHYSICS"),
    chemistry: getSectionTests(customTests, "CHEMISTRY"),
    biology: getSectionTests(customTests, "BIOLOGY"),
    "major-tests": getMajorTests(tests),
  } satisfies Record<StudentSectionId, Array<ListedTest & { sectionChapters: string[] }>>;
}