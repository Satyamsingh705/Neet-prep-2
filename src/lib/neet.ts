import { AnswerPolicy, TestMode } from "@prisma/client";
import { getSubjectLabel } from "@/lib/subject-categories";
import type { OptionKey, PaletteStatus, QuestionPayload, StoredAnswer, StoredAnswersMap } from "@/lib/types";

type TestMeta = {
  id: string;
  mode: TestMode;
  correctMarks: number;
  incorrectMarks: number;
  unansweredMarks: number;
  totalQuestions: number;
  totalEvaluatedQuestions: number;
};

export function getInitialAnswerState(): StoredAnswer {
  return {
    selectedOptions: [],
    markedForReview: false,
    visited: false,
    timeSpentSeconds: 0,
  };
}

export function normalizeStoredAnswer(answer?: Partial<StoredAnswer> & { selectedOption?: OptionKey | null } | null): StoredAnswer {
  const normalizedOptions = Array.isArray(answer?.selectedOptions)
    ? answer.selectedOptions.filter(Boolean)
    : answer?.selectedOption
      ? [answer.selectedOption]
      : [];

  return {
    selectedOptions: Array.from(new Set(normalizedOptions)),
    markedForReview: Boolean(answer?.markedForReview),
    visited: Boolean(answer?.visited),
    timeSpentSeconds: Math.max(0, answer?.timeSpentSeconds ?? 0),
  };
}

export function hasSelectedOptions(answer: StoredAnswer) {
  return answer.selectedOptions.length > 0;
}

export function getPaletteStatus(answer: StoredAnswer): PaletteStatus {
  if (!answer.visited) {
    return "NOT_VISITED";
  }

  if (answer.markedForReview && hasSelectedOptions(answer)) {
    return "ANSWERED_REVIEW";
  }

  if (answer.markedForReview) {
    return "REVIEW";
  }

  if (hasSelectedOptions(answer)) {
    return "ANSWERED";
  }

  return "NOT_ANSWERED";
}

function isCorrectAnswer(selectedOptions: OptionKey[], question: QuestionPayload) {
  if (selectedOptions.length === 0) {
    return false;
  }

  if (question.answerPolicy === AnswerPolicy.MULTIPLE) {
    if (selectedOptions.length !== question.correctAnswers.length) {
      return false;
    }

    return selectedOptions.every((selectedOption) => question.correctAnswers.includes(selectedOption));
  }

  return selectedOptions.length === 1 && question.correctAnswers.includes(selectedOptions[0]);
}

function buildSectionBEvaluationMap(questions: QuestionPayload[], answers: StoredAnswersMap, mode: TestMode) {
  if (mode !== TestMode.NEET_PATTERN) {
    return new Set<string>();
  }

  const ignoredQuestionIds = new Set<string>();
  const grouped = new Map<string, QuestionPayload[]>();

  for (const question of questions) {
    if (question.section !== "Section B") {
      continue;
    }

    const groupKey = `${question.subject}-${question.section}`;
    const list = grouped.get(groupKey) ?? [];
    list.push(question);
    grouped.set(groupKey, list);
  }

  for (const sectionQuestions of grouped.values()) {
    const attempted = sectionQuestions
      .filter((question) => hasSelectedOptions(normalizeStoredAnswer(answers[question.id])))
      .sort((left, right) => left.orderIndex - right.orderIndex);

    attempted.slice(10).forEach((question) => {
      ignoredQuestionIds.add(question.id);
    });
  }

  return ignoredQuestionIds;
}

export function evaluateAttempt(test: TestMeta, questions: QuestionPayload[], answers: StoredAnswersMap) {
  const ignoredSectionBQuestionIds = buildSectionBEvaluationMap(questions, answers, test.mode);
  let score = 0;
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;
  let ignored = 0;
  let dropped = 0;

  const subjectWise = new Map<string, { correct: number; incorrect: number; unanswered: number; score: number; attempted: number; ignored: number }>();

  const questionWise = questions.map((question) => {
    const answer = normalizeStoredAnswer(answers[question.id] ?? getInitialAnswerState());
    const bucket = subjectWise.get(question.subject) ?? { correct: 0, incorrect: 0, unanswered: 0, score: 0, attempted: 0, ignored: 0 };
    let outcome: "correct" | "incorrect" | "unanswered" | "ignored" | "dropped" = "unanswered";
    let awardedMarks = 0;

    if (ignoredSectionBQuestionIds.has(question.id)) {
      outcome = "ignored";
      ignored += 1;
      bucket.ignored += 1;
    } else if (question.answerPolicy === AnswerPolicy.DROPPED) {
      awardedMarks = test.correctMarks;
      outcome = "dropped";
      dropped += 1;
      score += awardedMarks;
      bucket.score += awardedMarks;
    } else if (!hasSelectedOptions(answer)) {
      awardedMarks = test.unansweredMarks;
      unanswered += 1;
      bucket.unanswered += 1;
    } else if (isCorrectAnswer(answer.selectedOptions, question)) {
      awardedMarks = test.correctMarks;
      outcome = "correct";
      correct += 1;
      score += awardedMarks;
      bucket.correct += 1;
      bucket.attempted += 1;
      bucket.score += awardedMarks;
    } else {
      awardedMarks = test.incorrectMarks;
      outcome = "incorrect";
      incorrect += 1;
      score += awardedMarks;
      bucket.incorrect += 1;
      bucket.attempted += 1;
      bucket.score += awardedMarks;
    }

    subjectWise.set(question.subject, bucket);

    return {
      id: question.id,
      orderIndex: question.orderIndex,
      subject: question.subject,
      chapter: question.chapter,
      section: question.section,
      prompt: question.prompt,
      table: question.table,
      options: question.options,
      imagePath: question.imagePath,
      type: question.type,
      selectedOptions: answer.selectedOptions,
      correctAnswers: question.correctAnswers,
      markedForReview: answer.markedForReview,
      timeSpentSeconds: answer.timeSpentSeconds,
      outcome,
      awardedMarks,
    };
  });

  const evaluatedQuestions = questions.length - ignored;
  const attemptedCount = correct + incorrect;
  const accuracy = attemptedCount === 0 ? 0 : Number(((correct / attemptedCount) * 100).toFixed(2));

  const normalizedSubjectWise = Array.from(subjectWise.entries()).reduce((groups, [subject, metrics]) => {
    const label = getSubjectLabel(subject);
    const current = groups.get(label) ?? { correct: 0, incorrect: 0, unanswered: 0, score: 0, attempted: 0, ignored: 0 };

    current.correct += metrics.correct;
    current.incorrect += metrics.incorrect;
    current.unanswered += metrics.unanswered;
    current.score += metrics.score;
    current.attempted += metrics.attempted;
    current.ignored += metrics.ignored;
    groups.set(label, current);

    return groups;
  }, new Map<string, { correct: number; incorrect: number; unanswered: number; score: number; attempted: number; ignored: number }>());

  return {
    score,
    summary: {
      totalQuestions: test.totalQuestions,
      totalEvaluatedQuestions: test.totalEvaluatedQuestions,
      evaluatedQuestions,
      correct,
      incorrect,
      unanswered,
      ignored,
      dropped,
      attempted: attemptedCount,
      accuracy,
    },
    subjectWise: Array.from(normalizedSubjectWise.entries()).map(([subject, metrics]) => ({
      subject,
      ...metrics,
      accuracy: metrics.attempted === 0 ? 0 : Number(((metrics.correct / metrics.attempted) * 100).toFixed(2)),
    })),
    questionWise: questionWise.map((question) => ({
      ...question,
      subject: getSubjectLabel(question.subject),
    })),
  };
}
