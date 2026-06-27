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

/* ─── Utility Functions ──────────────────────────────────────────────────────── */

function getOptionState(question: ResultDashboardProps["result"]["questionWise"][number], optionKey: string) {
  const isSelected = question.selectedOptions.includes(optionKey);
  const isCorrect = question.correctAnswers.includes(optionKey);

  if (isCorrect && isSelected) return "correct-selected";
  if (isCorrect) return "correct";
  if (isSelected && question.outcome === "incorrect") return "wrong-selected";
  if (isSelected) return "selected";
  return "neutral";
}

function getOptionClass(optionState: ReturnType<typeof getOptionState>) {
  switch (optionState) {
    case "correct-selected":
      return "border-2 border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/50";
    case "correct":
      return "border border-emerald-300 bg-emerald-50/80 text-emerald-700";
    case "wrong-selected":
      return "border-2 border-rose-500 bg-rose-50 text-rose-800 ring-1 ring-rose-200/50";
    case "selected":
      return "border border-amber-300 bg-amber-50 text-amber-800";
    default:
      return "border border-zinc-200/60 bg-white text-zinc-600";
  }
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function getScoreColor(score: number, total: number) {
  const pct = total > 0 ? (score / total) * 100 : 0;
  if (score < 0) return "text-rose-500";
  if (pct >= 80) return "text-emerald-500";
  if (pct >= 60) return "text-blue-500";
  if (pct >= 40) return "text-amber-500";
  return "text-rose-500";
}

function getAccuracyColor(accuracy: number) {
  if (accuracy >= 80) return "text-emerald-500";
  if (accuracy >= 60) return "text-blue-500";
  if (accuracy >= 40) return "text-amber-500";
  return "text-rose-500";
}

function getAccuracyBarColor(accuracy: number) {
  if (accuracy >= 80) return "from-blue-400 to-emerald-400";
  if (accuracy >= 60) return "from-blue-400 to-blue-500";
  if (accuracy >= 40) return "from-amber-400 to-amber-500";
  return "from-rose-400 to-rose-500";
}

function getPerformanceStatus(pct: number) {
  if (pct >= 80) return "Excellent";
  if (pct >= 60) return "Good";
  if (pct >= 40) return "Average";
  return "Needs Improvement";
}

/* ─── Icons ──────────────────────────────────────────────────────────────────── */

const CheckCircleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);
const XCircleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
);
const TargetIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
);
const ClockIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const MinusCircleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
);
const MonitorIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
);


/* ─── Main Component ─────────────────────────────────────────────────────────── */

export function ResultDashboard({ attempt, test, result }: ResultDashboardProps) {
  const totalMarks = test.totalEvaluatedQuestions * 4;
  const scorePct = totalMarks > 0 ? Math.max(0, (result.score / totalMarks) * 100) : 0;
  const { summary } = result;

  return (
    <div className="flex w-full flex-col gap-6 animate-in fade-in duration-700 bg-zinc-50/50 min-h-screen p-4 sm:p-6 lg:p-8">

      {/* ═══ TOP HEADER ═══ */}
      <section className="flex flex-col md:flex-row items-center justify-between gap-10 rounded-[24px] bg-white p-10 border border-zinc-200/60 shadow-sm hover:shadow-md transition-shadow duration-300">
        
        {/* Left: Test info */}
        <div className="flex flex-col gap-5 flex-1">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-[13px] font-bold text-blue-600 border border-blue-100/50 tracking-wide">
              {attempt.status}
            </span>
          </div>
          <h1 className="text-[44px] font-bold tracking-tighter text-zinc-900 leading-tight">
            {test.name || "Unit Test Upload"}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 text-[14px] text-zinc-500 font-medium">
            <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200/50">
              <span className="text-zinc-400">ID</span>
              <span className="text-zinc-700 font-semibold">{test.testCode ?? (test.id ? `TST-${test.id.slice(-8).toUpperCase()}` : "-")}</span>
            </div>
            <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200/50">
              <span className="text-zinc-400">Submitted</span>
            </div>
            <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200/50">
              <span className="text-zinc-700 font-semibold">{summary.totalQuestions}</span>
              <span className="text-zinc-400">Questions</span>
            </div>
            <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200/50">
              <ClockIcon />
              <span className="text-zinc-700 font-semibold">{formatDuration(attempt.totalTimeSpentSeconds)}</span>
            </div>
          </div>
        </div>

        {/* Right: Score ring and connected stats */}
        <div className="flex flex-col items-center gap-5 border-l border-zinc-100 pl-10 min-w-[260px]">
          <div className="relative flex flex-col items-center justify-center">
            {/* Ring SVG with minimal glow */}
            <div className="absolute inset-0 rounded-full blur-[30px] bg-blue-400/5" />
            <svg width="180" height="180" viewBox="0 0 180 180" className="relative z-10">
              <circle cx="90" cy="90" r="82" fill="none" stroke="#F4F4F5" strokeWidth="6"/>
              <circle
                cx="90" cy="90" r="82"
                fill="none"
                stroke={result.score < 0 ? "#F43F5E" : scorePct >= 80 ? "#10B981" : scorePct >= 60 ? "#3B82F6" : scorePct >= 40 ? "#F59E0B" : "#F43F5E"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${scorePct * 5.15} 515`}
                transform="rotate(-90 90 90)"
                className="transition-all duration-1000 ease-in-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-[6px]">
              <span className="text-[56px] font-[700] text-black leading-none text-center">
                {result.score}
              </span>
              <div className="w-[40px] h-[2px] rounded-full bg-black/15" />
              <span className="text-[20px] font-[600] text-black leading-none text-center">
                {totalMarks}
              </span>
            </div>
          </div>
          <div className="text-[13px] font-bold text-zinc-500 tracking-widest uppercase">
            {getPerformanceStatus(scorePct)}
          </div>
        </div>

        {/* Extended Stats List connected to Score */}
        <div className="flex flex-col gap-3.5 text-[14px] font-medium text-zinc-500 min-w-[180px] pl-8 border-l border-zinc-100">
          <div className="flex items-center justify-between gap-6">
            <span>Score</span>
            <span className="font-semibold text-zinc-900">{result.score}</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span>Accuracy</span>
            <span className="font-semibold text-zinc-900">{summary.accuracy}%</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Correct</span>
            <span className="font-semibold text-zinc-900">{summary.correct}</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" />Incorrect</span>
            <span className="font-semibold text-zinc-900">{summary.incorrect}</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />Unanswered</span>
            <span className="font-semibold text-zinc-900">{summary.unanswered}</span>
          </div>
        </div>

      </section>



      {/* ═══ SUBJECT-WISE PERFORMANCE ═══ */}
      <section className="rounded-[24px] border border-zinc-200/60 bg-white p-10 shadow-sm hover:shadow-md transition-shadow duration-300">
        <h2 className="text-[28px] font-bold tracking-tight text-zinc-900">Subject Performance</h2>
        <div className={`mt-8 grid gap-6 ${result.subjectWise.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' : 'grid-cols-1 md:grid-cols-2'}`}>
          {result.subjectWise.map((subject) => {
            const subjectTotal = (subject.correct + subject.incorrect + subject.unanswered) * 4;
            const totalQuestions = subject.correct + subject.incorrect + subject.unanswered;

            return (
              <div key={subject.subject} className="flex flex-col gap-6 rounded-[20px] border border-zinc-200 bg-white p-8 shadow-sm transition-all duration-300 hover:border-zinc-300 hover:shadow-md">
                
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <h3 className="text-[20px] font-bold tracking-tight text-zinc-900">{getSubjectLabel(subject.subject)}</h3>
                    <p className="text-[13px] text-zinc-400 font-medium mt-1">{totalQuestions} Questions</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-[12px] text-zinc-400 font-semibold tracking-wider uppercase mb-1">Score</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[28px] font-bold leading-none text-black">{subject.score}</span>
                      <span className="text-[14px] font-bold text-black">/ {subjectTotal}</span>
                    </div>
                  </div>
                </div>

                {/* Accuracy Progress Bar */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-zinc-500">Accuracy</span>
                    <span className={`text-[14px] font-bold ${getAccuracyColor(subject.accuracy)}`}>{subject.accuracy}%</span>
                  </div>
                  <div className="h-[6px] w-full rounded-full bg-zinc-100 overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-in-out ${getAccuracyBarColor(subject.accuracy)}`} style={{ width: `${Math.min(subject.accuracy, 100)}%` }} />
                  </div>
                </div>

                {/* Stats Row */}
                <div className="pt-5 border-t border-zinc-100 mt-2">
                  <div className="flex items-center justify-between text-[13px] font-medium">
                    <div className="flex items-center gap-1.5"><CheckCircleIcon /> <span className="text-zinc-400">Correct</span> <span className="font-semibold text-zinc-800 ml-0.5">{subject.correct}</span></div>
                    <div className="flex items-center gap-1.5"><XCircleIcon /> <span className="text-zinc-400">Wrong</span> <span className="font-semibold text-zinc-800 ml-0.5">{subject.incorrect}</span></div>
                    <div className="flex items-center gap-1.5"><MinusCircleIcon /> <span className="text-zinc-400">Skipped</span> <span className="font-semibold text-zinc-800 ml-0.5">{subject.unanswered}</span></div>
                    <div className="flex items-center gap-1.5"><span className="text-zinc-300">Dropped</span> <span className="font-semibold text-zinc-800 ml-0.5">{subject.ignored}</span></div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ QUESTION-WISE ANALYSIS ═══ */}
      <section className="rounded-[24px] border border-zinc-200/60 bg-white p-10 shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <h2 className="text-[28px] font-bold tracking-tight text-zinc-900">Question Analysis</h2>
          <QuestionLegend />
        </div>
        <QuestionList questions={result.questionWise} />
      </section>

    </div>
  );
}

/* ─── Stat Card ──────────────────────────────────────────────────────────────── */

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col justify-between h-[96px] rounded-[20px] border border-zinc-200/60 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
      <div className="flex items-center gap-2.5">
        <div className={`${color}`}>{icon}</div>
        <div className="text-[13px] font-semibold text-zinc-500">{label}</div>
      </div>
      <div className="flex items-end justify-end w-full">
        <div className="text-[32px] font-bold tracking-tight text-zinc-900 leading-none">{value}</div>
      </div>
    </div>
  );
}

/* ─── Question Legend ────────────────────────────────────────────────────────── */

function QuestionLegend() {
  return (
    <div className="flex flex-wrap items-center gap-5 text-[13px] font-semibold text-zinc-500">
      <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400" />Correct</span>
      <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-400" />Incorrect</span>
      <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-zinc-300" />Unanswered</span>
      <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-zinc-200" />Dropped</span>
    </div>
  );
}

/* ─── Question List ──────────────────────────────────────────────────────────── */

function QuestionList({ questions }: { questions: ResultDashboardProps["result"]["questionWise"] }) {
  const [displayCount, setDisplayCount] = useState(20);
  const [filterOutcome, setFilterOutcome] = useState<string | null>(null);

  const filtered = filterOutcome ? questions.filter(q => q.outcome === filterOutcome) : questions;
  const visibleQuestions = filtered.slice(0, displayCount);

  return (
    <div className="flex flex-col gap-8">
      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: null, label: "All", count: questions.length },
          { key: "correct", label: "Correct", count: questions.filter(q => q.outcome === "correct").length },
          { key: "incorrect", label: "Incorrect", count: questions.filter(q => q.outcome === "incorrect").length },
          { key: "unanswered", label: "Unanswered", count: questions.filter(q => q.outcome === "unanswered").length },
          { key: "ignored", label: "Dropped", count: questions.filter(q => q.outcome === "ignored").length },
        ].filter(tab => tab.count > 0).map(tab => (
          <button
            key={tab.key ?? "all"}
            onClick={() => { setFilterOutcome(tab.key); setDisplayCount(20); }}
            className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 ${filterOutcome === tab.key ? "bg-zinc-900 text-white shadow-md" : "bg-zinc-50 border border-zinc-200/50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"}`}
          >
            {tab.label} <span className="opacity-60 ml-1 font-medium">{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {visibleQuestions.map((question) => (
          <QuestionCard key={question.id} question={question} />
        ))}
      </div>

      {visibleQuestions.length === 0 && (
        <div className="flex items-center justify-center py-20 text-zinc-400 font-medium">
          No questions match the current filter.
        </div>
      )}

      {displayCount < filtered.length && (
        <button
          onClick={() => setDisplayCount((prev) => prev + 50)}
          className="mt-2 w-full rounded-[16px] border border-dashed border-zinc-300 bg-zinc-50/50 py-4 text-[13px] font-bold text-zinc-500 transition-all hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-700 active:scale-[0.99]"
        >
          Load More ({filtered.length - displayCount} remaining)
        </button>
      )}
    </div>
  );
}

/* ─── Single Question Card ───────────────────────────────────────────────────── */

function QuestionCard({ question }: { question: ResultDashboardProps["result"]["questionWise"][number] }) {
  const outcomeConfig: Record<string, { bg: string; text: string; label: string; dot: string; border: string }> = {
    correct: { bg: "bg-emerald-50", border: "border-emerald-200/50", text: "text-emerald-700", label: "Correct", dot: "bg-emerald-400" },
    incorrect: { bg: "bg-rose-50", border: "border-rose-200/50", text: "text-rose-700", label: "Incorrect", dot: "bg-rose-400" },
    unanswered: { bg: "bg-zinc-50", border: "border-zinc-200/50", text: "text-zinc-600", label: "Unanswered", dot: "bg-zinc-300" },
    ignored: { bg: "bg-zinc-50", border: "border-zinc-200/50", text: "text-zinc-500", label: "Dropped", dot: "bg-zinc-200" },
  };
  const cfg = outcomeConfig[question.outcome] ?? outcomeConfig.unanswered;

  return (
    <div className={`rounded-[20px] border ${cfg.border} bg-white p-7 shadow-sm transition-shadow duration-300 hover:shadow-md`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 pb-5 border-b border-zinc-100">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-200/60 text-[14px] font-bold text-zinc-700 shadow-sm">
            {question.orderIndex}
          </div>
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-zinc-900">{getSubjectLabel(question.subject)}</span>
            {question.chapter && <span className="text-[13px] text-zinc-400 font-medium">{question.chapter}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-[12px] text-zinc-500 font-semibold bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200/50 tracking-wide uppercase">
            <ClockIcon /> {question.timeSpentSeconds}s
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Question content */}
      <div className="rounded-[16px] border border-zinc-100 bg-zinc-50/50 p-6">
        <QuestionContent
          prompt={getDisplayPrompt(question.prompt) || (question.type === "IMAGE" ? "Image based question" : "Question")}
          table={question.table}
          promptClassName="text-[15px] leading-relaxed text-zinc-800 whitespace-pre-line font-medium"
          tableClassName="mt-4"
        />
        {question.type === "IMAGE" && question.imagePath ? (
          <div className="relative mt-5 h-[300px] w-full overflow-hidden rounded-[14px] border border-zinc-200/60 bg-white p-4 shadow-sm">
            <Image src={question.imagePath} alt={`Question ${question.orderIndex}`} fill className="object-contain p-2" />
          </div>
        ) : null}

        {question.options && question.options.length > 0 ? (
          <div className="mt-6 flex flex-col gap-3">
            {question.options.map((option) => {
              const optionState = getOptionState(question, option.key);
              return (
                <div key={`${question.id}-${option.key}`} className={`flex items-start justify-between gap-4 rounded-[14px] px-5 py-4 text-[14px] transition-all ${getOptionClass(optionState)}`}>
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-zinc-900 shrink-0 w-5">{option.key}.</span>
                    <span className="font-medium text-zinc-700 leading-relaxed">{renderQuestionText(option.text)}</span>
                  </div>
                  {(optionState === "correct" || optionState === "correct-selected") && (
                    <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-100/50">
                      <CheckCircleIcon /> Correct
                    </span>
                  )}
                  {optionState === "wrong-selected" && (
                    <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50/80 px-2.5 py-1 rounded-lg border border-rose-100/50">
                      <XCircleIcon /> Selected
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Footer stats */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 text-[13px] font-medium">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Your Answer:</span>
            <span className={`font-bold ${question.outcome === "incorrect" ? "text-rose-500" : question.outcome === "correct" ? "text-emerald-500" : "text-zinc-900"}`}>
              {question.selectedOptions.join(", ") || "—"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Correct Answer:</span>
            <span className="font-bold text-emerald-500">
              {question.correctAnswers.join(", ") || "—"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="sm:hidden text-zinc-400 text-[12px] font-semibold flex items-center gap-1 bg-zinc-50 px-2 py-1 rounded-md">
            <ClockIcon /> {question.timeSpentSeconds}s
          </span>
          <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-lg text-[13px] font-bold ${question.awardedMarks > 0 ? "bg-emerald-50 text-emerald-600 border border-emerald-100/50" : question.awardedMarks < 0 ? "bg-rose-50 text-rose-600 border border-rose-100/50" : "bg-zinc-50 text-zinc-500 border border-zinc-200/50"}`}>
            {question.awardedMarks > 0 ? "+" : ""}{question.awardedMarks} marks
          </span>
        </div>
      </div>
    </div>
  );
}
