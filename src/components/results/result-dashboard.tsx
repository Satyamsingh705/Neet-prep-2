import Image from "next/image";
import { useState } from "react";
import { QuestionContent, renderQuestionText } from "@/components/questions/question-content";
import { getDisplayPrompt } from "@/lib/question-content";
import { getSubjectLabel } from "@/lib/subject-categories";
import type { QuestionTable } from "@/lib/types";

export type ResultDashboardProps = {
  attempt: {
    id: string;
    studentName: string | null;
    status: string;
    startedAt: string;
    submittedAt: string | null;
    totalTimeSpentSeconds: number;
    tabSwitchCount: number;
  };
  test: {
    id?: string;
    testCode?: string | null;
    name: string;
    totalQuestions: number;
    totalEvaluatedQuestions: number;
  };
  result: {
    score: number;
    summary: {
      totalQuestions: number;
      totalEvaluatedQuestions: number;
      evaluatedQuestions: number;
      correct: number;
      incorrect: number;
      unanswered: number;
      ignored: number;
      dropped: number;
      attempted: number;
      accuracy: number;
    };
    subjectWise: Array<{
      subject: string;
      correct: number;
      incorrect: number;
      unanswered: number;
      score: number;
      attempted: number;
      ignored: number;
      accuracy: number;
    }>;
    questionWise: Array<{
      id: string;
      orderIndex: number;
      subject: string;
      chapter: string;
      section: string;
      prompt: string | null;
      table?: QuestionTable | null;
      options: Array<{ key: string; text: string }> | null;
      imagePath: string | null;
      type: string;
      selectedOptions: string[];
      correctAnswers: string[];
      markedForReview: boolean;
      timeSpentSeconds: number;
      outcome: string;
      awardedMarks: number;
    }>;
  };
};

function getOutcomeContainerClass(outcome: string) {
  if (outcome === "correct") {
    return "border-[#bfe5c8] bg-[#f3fcf5]";
  }

  if (outcome === "incorrect") {
    return "border-[#efc1bc] bg-[#fff4f2]";
  }

  if (outcome === "ignored") {
    return "border-[#d7c8ee] bg-[#faf7ff]";
  }

  return "border-[#eadbcd] bg-[#fffdfa]";
}

function getOptionState(question: ResultDashboardProps["result"]["questionWise"][number], optionKey: string) {
  const isSelected = question.selectedOptions.includes(optionKey);
  const isCorrect = question.correctAnswers.includes(optionKey);

  if (isCorrect && isSelected) {
    return "correct-selected";
  }

  if (isCorrect) {
    return "correct";
  }

  if (isSelected && question.outcome === "incorrect") {
    return "wrong-selected";
  }

  if (isSelected) {
    return "selected";
  }

  return "neutral";
}

function getOptionClass(optionState: ReturnType<typeof getOptionState>) {
  switch (optionState) {
    case "correct-selected":
      return "border border-[#9ad2a8] bg-[#eaf9ee] text-[#1f6b34]";
    case "correct":
      return "border border-[#b8e0c2] bg-[#f3fcf5] text-[#2d7a42]";
    case "wrong-selected":
      return "border border-[#e0a8a0] bg-[#fff0ee] text-[#a33f35]";
    case "selected":
      return "border border-[#d7c5b3] bg-[#fff7ef] text-[#6b5642]";
    default:
      return "bg-[#faf5ef] text-[#5d4d40]";
  }
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

export function ResultDashboard({ attempt, test, result }: ResultDashboardProps) {
  return (
    <div className="flex w-full flex-col gap-6">
      <section className="panel rounded-[1.3rem] p-5 sm:rounded-[1.5rem] sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#b26d39]">Result</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#2f241c] sm:text-4xl">{test.name}</h1>
            <p className="mt-3 text-base leading-7 text-[#6d5a49] sm:text-lg">Test ID {test.testCode ?? (test.id ? `TST-${test.id.slice(-8).toUpperCase()}` : "-")} · Attempt {attempt.id.slice(-8)} · {attempt.status} · Time taken {formatDuration(attempt.totalTimeSpentSeconds)}</p>
          </div>
          <div className="rounded-[1.2rem] bg-[#fff6ee] px-5 py-4 text-center sm:px-6 sm:py-5">
            <div className="text-sm uppercase tracking-[0.25em] text-[#9a7557]">Total Marks</div>
            <div className="mt-2 text-4xl font-semibold text-[#d7671b] sm:text-5xl">{result.score}</div>
            <div className="mt-2 text-sm text-[#6d5a49]">Out of {test.totalEvaluatedQuestions * 4}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel rounded-[1.2rem] p-5"><div className="text-sm uppercase tracking-[0.2em] text-[#886d58]">Correct</div><div className="mt-2 text-4xl font-semibold text-[#30a451]">{result.summary.correct}</div></div>
        <div className="panel rounded-[1.2rem] p-5"><div className="text-sm uppercase tracking-[0.2em] text-[#886d58]">Incorrect</div><div className="mt-2 text-4xl font-semibold text-[#d85b58]">{result.summary.incorrect}</div></div>
        <div className="panel rounded-[1.2rem] p-5"><div className="text-sm uppercase tracking-[0.2em] text-[#886d58]">Accuracy</div><div className="mt-2 text-4xl font-semibold text-[#d7671b]">{result.summary.accuracy}%</div></div>
        <div className="panel rounded-[1.2rem] p-5"><div className="text-sm uppercase tracking-[0.2em] text-[#886d58]">Tab Switches</div><div className="mt-2 text-4xl font-semibold text-[#7d57a7]">{attempt.tabSwitchCount}</div></div>
      </section>

      <section className="panel rounded-[1.25rem] p-5 sm:rounded-[1.4rem] sm:p-6">
        <h2 className="text-xl font-semibold text-[#2f241c] sm:text-2xl">Subject-wise Performance</h2>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {result.subjectWise.map((subject) => (
            <div key={subject.subject} className="rounded-[1rem] border border-[#eadbcd] bg-[#fffdfa] p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="text-xl font-semibold text-[#2f241c]">{getSubjectLabel(subject.subject)}</div>
                <div className="text-lg font-semibold text-[#d7671b]">{subject.score} marks</div>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-[#6d5a49] md:grid-cols-4">
                <div>Correct: {subject.correct}</div>
                <div>Incorrect: {subject.incorrect}</div>
                <div>Ignored: {subject.ignored}</div>
                <div>Accuracy: {subject.accuracy}%</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel rounded-[1.25rem] p-5 sm:rounded-[1.4rem] sm:p-6">
        <h2 className="text-xl font-semibold text-[#2f241c] sm:text-2xl">Question-wise Analysis</h2>
        <QuestionList questions={result.questionWise} />
      </section>
    </div>
  );
}

function QuestionList({ questions }: { questions: ResultDashboardProps["result"]["questionWise"] }) {
  const [displayCount, setDisplayCount] = useState(20);
  const visibleQuestions = questions.slice(0, displayCount);

  return (
    <div className="mt-5">
      <div className="space-y-3">
        {visibleQuestions.map((question) => (
          <div key={question.id} className={`rounded-[1rem] border p-4 text-sm text-[#5d4d40] ${getOutcomeContainerClass(question.outcome)}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="font-semibold text-[#2f241c]">Q{question.orderIndex}</div>
              <div className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: question.outcome === "correct" ? "#30a451" : question.outcome === "incorrect" ? "#d85b58" : question.outcome === "ignored" ? "#7d57a7" : "#8b8b8b" }}>
                {question.outcome}
              </div>
            </div>
            <div className="mt-3 rounded-[0.9rem] border border-[#efe3d6] bg-white p-3 sm:p-4">
              <div className="text-sm font-semibold text-[#2f241c]">Question</div>
              <QuestionContent
                 prompt={getDisplayPrompt(question.prompt) || (question.type === "IMAGE" ? "Image based question" : "Question")}
                table={question.table}
                promptClassName="mt-2 text-sm leading-6 text-[#4f4338] whitespace-pre-line"
                tableClassName="mt-4"
              />
              {question.type === "IMAGE" && question.imagePath ? (
                <div className="relative mt-4 h-[250px] w-full overflow-hidden rounded-md border border-[#eadbcd] bg-[#fcfbf8] p-3">
                  <Image
                    src={question.imagePath}
                    alt={`Question ${question.orderIndex}`}
                    fill
                    className="object-contain p-2"
                  />
                </div>
              ) : null}
              {question.options && question.options.length > 0 ? (
                <div className="mt-4 space-y-2 text-sm text-[#5d4d40]">
                  {question.options.map((option) => {
                    const optionState = getOptionState(question, option.key);

                    return (
                    <div key={`${question.id}-${option.key}`} className={`rounded-[0.75rem] px-3 py-2 ${getOptionClass(optionState)}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <span className="font-semibold text-[#2f241c]">{option.key}.</span> {renderQuestionText(option.text)}
                        </div>
                        {optionState === "correct" || optionState === "correct-selected" ? <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2d7a42]">Correct</span> : null}
                        {optionState === "wrong-selected" ? <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a33f35]">Your Choice</span> : null}
                      </div>
                    </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-[13px] sm:text-sm">
              <span className={question.outcome === "incorrect" ? "font-semibold text-[#b54a40]" : question.outcome === "correct" ? "font-semibold text-[#2d7a42]" : undefined}>Selected: {question.selectedOptions.join(", ") || "-"}</span>
              <span className="font-semibold text-[#2d7a42]">Correct: {question.correctAnswers.join(", ") || "-"}</span>
              <span>Marks: {question.awardedMarks}</span>
              <span>Time: {question.timeSpentSeconds}s</span>
            </div>
          </div>
        ))}
      </div>
      {displayCount < questions.length && (
        <button
          onClick={() => setDisplayCount((prev) => prev + 50)}
          className="mt-6 w-full rounded-xl border border-[#ead9c9] bg-white py-4 text-[0.95rem] font-semibold text-[#d7671b] transition hover:bg-[#fff7ef]"
        >
          Load More Questions ({questions.length - displayCount} remaining)
        </button>
      )}
    </div>
  );
}
