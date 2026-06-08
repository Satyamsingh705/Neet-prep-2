export type AdminSubjectCategory = "PHYSICS" | "CHEMISTRY" | "BIOLOGY" | "MAJOR_TEST";

export const adminSubjectValues = ["PHYSICS", "CHEMISTRY", "BIOLOGY", "MAJOR_TEST"] as const;

export const adminSubjectOptions: Array<{ value: AdminSubjectCategory; label: string }> = [
  { value: "PHYSICS", label: "Physics" },
  { value: "CHEMISTRY", label: "Chemistry" },
  { value: "BIOLOGY", label: "Biology" },
  { value: "MAJOR_TEST", label: "Major Test" },
];

const biologySubjects = new Set(["BIOLOGY", "BOTANY", "ZOOLOGY"]);
const majorTestSubjects = new Set(["MAJOR_TEST", "MAJOR TEST", "FULL", "FULL_TEST", "FULL TEST"]);
const chemistrySubjects = new Set(["CHEMISTRY", "CHEM", "CHEMISTRY "]);

const subjectLabels: Record<AdminSubjectCategory, string> = {
  PHYSICS: "Physics",
  CHEMISTRY: "Chemistry",
  BIOLOGY: "Biology",
  MAJOR_TEST: "Major Test",
};

export function normalizeSubjectCategory(subject: string): AdminSubjectCategory {
  const normalizedSubject = subject.trim().toUpperCase();

  if (biologySubjects.has(normalizedSubject)) {
    return "BIOLOGY";
  }

  if (majorTestSubjects.has(normalizedSubject)) {
    return "MAJOR_TEST";
  }

  if (chemistrySubjects.has(normalizedSubject)) {
    return "CHEMISTRY";
  }

  return "PHYSICS";
}

export function getSubjectLabel(subject: string) {
  return subjectLabels[normalizeSubjectCategory(subject)];
}

export function isSubjectInCategory(subject: string, category: AdminSubjectCategory) {
  return normalizeSubjectCategory(subject) === category;
}