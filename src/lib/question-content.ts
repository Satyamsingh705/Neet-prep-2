import type { QuestionTable } from "@/lib/types";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isQuestionTable(value: unknown): value is QuestionTable {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { caption?: unknown; headers?: unknown; rows?: unknown };

  if (candidate.caption !== undefined && typeof candidate.caption !== "string") {
    return false;
  }

  if (candidate.headers !== undefined && !isStringArray(candidate.headers)) {
    return false;
  }

  return Array.isArray(candidate.rows)
    && candidate.rows.length > 0
    && candidate.rows.every((row) => isStringArray(row) && row.length > 0);
}

export function getDisplayPrompt(prompt: string | null) {
  const normalizedPrompt = (prompt ?? "").trim();

  if (!normalizedPrompt) {
    return "";
  }

  const prefixedQuestionMatch = normalizedPrompt.match(/^(?:[^|\n]+\|\s*)+(?:Q\d+\s*[:.-]?\s*)(.+)$/i);

  if (prefixedQuestionMatch?.[1]) {
    return prefixedQuestionMatch[1].trim();
  }

  const directQuestionMatch = normalizedPrompt.match(/^Q\d+\s*[:.-]?\s*(.+)$/i);

  if (directQuestionMatch?.[1]) {
    return directQuestionMatch[1].trim();
  }

  return normalizedPrompt;
}

export function getQuestionTable(metadata: unknown): QuestionTable | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const candidate = metadata as { table?: unknown };

  return isQuestionTable(candidate.table) ? candidate.table : null;
}