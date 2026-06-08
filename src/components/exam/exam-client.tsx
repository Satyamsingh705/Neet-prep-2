"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QuestionContent, renderQuestionText } from "@/components/questions/question-content";
import { getPaletteStatus, normalizeStoredAnswer } from "@/lib/neet";
import { getDisplayPrompt } from "@/lib/question-content";
import type { OptionKey, QuestionPayload, StoredAnswersMap } from "@/lib/types";

type ExamClientProps = {
  attemptId: string;
  studentName: string;
  test: {
    id: string;
    testCode?: string | null;
    name: string;
    durationMinutes: number;
    totalQuestions: number;
    mode: string;
  };
  initialAnswers: StoredAnswersMap;
  initialCurrentQuestionIndex: number;
  questions: QuestionPayload[];
  startedAt: string;
  initialTabSwitchCount: number;
  initialTotalTimeSpentSeconds: number;
};

class AttemptRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AttemptRequestError";
    this.status = status;
  }
}

const fallbackOptions: Array<{ key: OptionKey; text: string }> = [
  { key: "A", text: "Option A" },
  { key: "B", text: "Option B" },
  { key: "C", text: "Option C" },
  { key: "D", text: "Option D" },
];

function formatTimer(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function blankAnswer() {
  return {
    selectedOptions: [],
    markedForReview: false,
    visited: false,
    timeSpentSeconds: 0,
  };
}

// Optimized Question Content component to prevent main client re-renders
const QuestionBody = React.memo(({ 
    question, 
    answer, 
    onSelectOption, 
    onToggleOption, 
    onClear,
    totalQuestions 
}: { 
    question: QuestionPayload; 
    answer: any; 
    onSelectOption: (key: OptionKey) => void; 
    onToggleOption: (key: OptionKey) => void;
    onClear: () => void;
    totalQuestions: number;
}) => {
    const isImageQuestion = question.type === "IMAGE";
    const usesMultipleAnswers = question.answerPolicy === "MULTIPLE";
    const prompt = getDisplayPrompt(question.prompt ?? "");

    return (
        <div className="w-full">
            <div className="flex items-center gap-4 mb-10">
                <span className="px-5 py-2 rounded-full bg-blue-50 text-blue-600 font-bold text-lg border border-blue-100">
                    Question {String(question.orderIndex)} of {String(totalQuestions)}
                </span>
            </div>

            <div className="text-[40px] font-medium leading-[1.6] text-[#111827] mb-12">
                {question.type === "TEXT" ? (
                    <QuestionContent
                        prompt={prompt}
                        table={question.table}
                        promptClassName="whitespace-pre-line"
                        tableClassName="mt-8"
                    />
                ) : (
                    <div className="mb-8">Image based question</div>
                )}
            </div>

            {question.type === "IMAGE" && question.imagePath ? (
                <div className="mb-12 p-6 border border-gray-100 rounded-3xl bg-gray-50/50">
                    <Image
                        src={question.imagePath}
                        alt={`Question ${question.orderIndex}`}
                        width={1200}
                        height={600}
                        className="max-w-full h-auto rounded-2xl mx-auto shadow-sm"
                        priority
                    />
                </div>
            ) : null}

            <div className="grid gap-6">
                {(question.options ?? fallbackOptions).map((option) => {
                    const isSelected = answer.selectedOptions.includes(option.key);
                    return (
                        <div 
                            key={option.key} 
                            className={`modern-option-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => usesMultipleAnswers ? onToggleOption(option.key) : onSelectOption(option.key)}
                        >
                            <div className="modern-option-badge">
                                {option.key}
                            </div>
                            <div className="modern-option-text">
                                {renderQuestionText(option.text)}
                            </div>
                        </div>
                    );
                })}
            </div>

            <button 
                type="button" 
                className="mt-12 text-blue-600 hover:text-blue-800 font-bold text-lg transition-colors flex items-center gap-2 group" 
                onClick={onClear}
            >
                <span className="group-hover:underline">Clear Response</span>
            </button>
        </div>
    );
});

QuestionBody.displayName = "QuestionBody";

// Isolated Timer Component
const ExamTimer = React.memo(({ initialSeconds, onExpire }: { initialSeconds: number; onExpire: () => void }) => {
    const [seconds, setSeconds] = useState(initialSeconds);
    const onExpireRef = useRef(onExpire);
    useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

    useEffect(() => {
        const interval = setInterval(() => {
            setSeconds(prev => {
                const next = Math.max(0, prev - 1);
                if (next === 0) {
                    clearInterval(interval);
                    onExpireRef.current();
                }
                return next;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const isLowTime = seconds > 0 && seconds <= 300;

    return (
        <span className={isLowTime ? "text-red-600" : ""}>
            {formatTimer(seconds)}
        </span>
    );
});

ExamTimer.displayName = "ExamTimer";

export function ExamClient(props: ExamClientProps) {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(props.initialCurrentQuestionIndex || 1);
  const [answers, setAnswers] = useState<StoredAnswersMap>(() =>
    Object.fromEntries(
      Object.entries(props.initialAnswers ?? {}).map(([qId, ans]) => [qId, normalizeStoredAnswer(ans as any)])
    )
  );
  
  const [tabSwitchCount, setTabSwitchCount] = useState(props.initialTabSwitchCount);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [tabWarning, setTabWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const submittedRef = useRef(false);
  const dirtySaveRef = useRef(false);
  const totalTimeSpentSecondsRef = useRef(props.initialTotalTimeSpentSeconds);
  const questionTimeSpentRef = useRef<Record<string, number>>({});
  
  const questions = props.questions;
  const currentQuestion = questions[currentQuestionIndex - 1];

  useEffect(() => {
    if (currentQuestion && !questionTimeSpentRef.current[currentQuestion.id]) {
        questionTimeSpentRef.current[currentQuestion.id] = answers[currentQuestion.id]?.timeSpentSeconds ?? 0;
    }
  }, [currentQuestion, answers]);

  // Silent background tracker
  useEffect(() => {
    const interval = setInterval(() => {
        totalTimeSpentSecondsRef.current += 1;
        if (currentQuestion) {
            questionTimeSpentRef.current[currentQuestion.id] = (questionTimeSpentRef.current[currentQuestion.id] ?? 0) + 1;
            dirtySaveRef.current = true;
        }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentQuestion]);

  const getLatestState = useCallback(() => {
    const updatedAnswers = { ...answers };
    Object.entries(questionTimeSpentRef.current).forEach(([qId, s]) => {
        if (updatedAnswers[qId]) updatedAnswers[qId] = { ...updatedAnswers[qId], timeSpentSeconds: s };
    });
    return {
      answers: updatedAnswers,
      currentQuestionIndex,
      tabSwitchCount,
      totalTimeSpentSeconds: totalTimeSpentSecondsRef.current,
    };
  }, [answers, currentQuestionIndex, tabSwitchCount]);

  const saveAttempt = useCallback(async (body: object) => {
    if (submittedRef.current) return;
    try {
        const response = await fetch(`/api/attempts/${props.attemptId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error("Save failed");
    } catch (e) { console.error("Autosave error", e); }
  }, [props.attemptId]);

  const flushSave = useCallback(async () => {
    if (submittedRef.current || !dirtySaveRef.current) return;
    await saveAttempt(getLatestState());
    dirtySaveRef.current = false;
  }, [getLatestState, saveAttempt]);

  useEffect(() => {
    const interval = setInterval(flushSave, 20000);
    return () => clearInterval(interval);
  }, [flushSave]);

  const submitAttempt = useCallback(async (auto = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setIsSubmitting(true);
    try {
      const state = getLatestState();
      await fetch(`/api/attempts/${props.attemptId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state) });
      const res = await fetch(`/api/attempts/${props.attemptId}/submit${auto ? "?auto=1" : ""}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state) });
      if (!res.ok) throw new Error("Submit failed");
      router.replace(`/attempts/${props.attemptId}/result`);
    } catch (e) {
      submittedRef.current = false;
      setIsSubmitting(false);
      window.alert("Submission failed. Try again.");
    }
  }, [props.attemptId, router, getLatestState]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        setTabSwitchCount(c => c + 1);
        setTabWarning("Tab switch detected. Recorded.");
        setTimeout(() => setTabWarning(null), 2500);
      }
    };
    const handlePopState = () => {
      if (submittedRef.current) return;
      window.history.pushState({ locked: true }, "", window.location.href);
      window.alert("Finish test first.");
    };
    const handlePageHide = () => {
      if (!submittedRef.current) {
        const body = new Blob([JSON.stringify(getLatestState())], { type: "application/json" });
        navigator.sendBeacon(`/api/attempts/${props.attemptId}/submit?auto=1`, body);
      }
    };
    window.history.pushState({ locked: true }, "", window.location.href);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [props.attemptId, getLatestState]);

  const counts = useMemo(() => {
    return questions.reduce((acc, q) => {
      const s = getPaletteStatus(answers[q.id] ?? blankAnswer());
      if (s === "ANSWERED" || s === "ANSWERED_REVIEW") acc.answered += 1;
      else if (s === "REVIEW") acc.flagged += 1;
      else acc.pending += 1;
      return acc;
    }, { answered: 0, flagged: 0, pending: 0 });
  }, [answers, questions]);

  const goToQuestion = useCallback((idx: number) => {
    const safeIdx = Math.max(1, Math.min(idx, questions.length));
    const targetQ = questions[safeIdx - 1];
    setAnswers(prev => ({ ...prev, [targetQ.id]: { ...(prev[targetQ.id] ?? blankAnswer()), visited: true } }));
    setCurrentQuestionIndex(safeIdx);
    dirtySaveRef.current = true;
  }, [questions]);

  const selectOption = useCallback((option: OptionKey) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: { ...(prev[currentQuestion.id] ?? { ...blankAnswer(), visited: true }), selectedOptions: [option], visited: true } }));
    dirtySaveRef.current = true;
  }, [currentQuestion.id]);

  const toggleOption = useCallback((option: OptionKey) => {
    setAnswers(prev => {
      const curr = normalizeStoredAnswer(prev[currentQuestion.id] ?? { ...blankAnswer(), visited: true });
      const selectedOptions = curr.selectedOptions.includes(option) ? curr.selectedOptions.filter(o => o !== option) : [...curr.selectedOptions, option].sort();
      return { ...prev, [currentQuestion.id]: { ...curr, selectedOptions, visited: true } };
    });
    dirtySaveRef.current = true;
  }, [currentQuestion.id]);

  const clearResponse = useCallback(() => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: { ...(prev[currentQuestion.id] ?? blankAnswer()), selectedOptions: [], visited: true } }));
    dirtySaveRef.current = true;
  }, [currentQuestion.id]);

  const flagAndNext = () => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: { ...(prev[currentQuestion.id] ?? blankAnswer()), markedForReview: true, visited: true } }));
    goToQuestion(currentQuestionIndex + 1);
  };

  const currentAnswer = normalizeStoredAnswer(answers[currentQuestion.id] ?? { ...blankAnswer(), visited: true });

  return (
    <div className="modern-exam-theme min-h-screen flex flex-col">
      {/* STICKY HEADER */}
      <header className="sticky top-0 z-50 h-[100px] bg-white border-b border-[#E5E7EB] px-10 flex items-center justify-between shadow-sm">
        <div className="flex flex-col">
          <h1 className="text-2xl font-black text-[#111827] uppercase tracking-tight">
            {props.test.name}
          </h1>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-sm font-bold text-blue-600 uppercase tracking-widest">
                Progress: {Math.round((counts.answered / props.test.totalQuestions) * 100)}%
            </span>
            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                ID: {props.test.testCode ?? `TST-${props.test.id.slice(-8).toUpperCase()}`}
            </span>
          </div>
        </div>
        
        <div className="modern-timer-box">
          <ExamTimer 
            initialSeconds={Math.max(0, props.test.durationMinutes * 60 - props.initialTotalTimeSpentSeconds)} 
            onExpire={() => void submitAttempt(true)} 
          />
        </div>
      </header>

      <div className="flex-1 flex w-full max-w-[1720px] mx-auto relative">
        {/* MAIN QUESTION AREA */}
        <main className="flex-1 px-12 py-16 pb-[160px] max-w-[1400px]">
          <QuestionBody 
              question={currentQuestion} 
              answer={currentAnswer} 
              onSelectOption={selectOption} 
              onToggleOption={toggleOption}
              onClear={clearResponse}
              totalQuestions={props.test.totalQuestions}
          />
        </main>

        {/* FIXED RIGHT SIDEBAR PALETTE */}
        <aside className="w-[320px] sticky top-[100px] h-[calc(100vh-100px)] border-l border-[#E5E7EB] bg-white flex flex-col flex-shrink-0">
          <div className="p-8 border-b border-[#E5E7EB]">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Question Palette</h2>
            <div className="flex justify-between text-[10px] font-bold uppercase text-gray-400">
                <span>{counts.answered} Answered</span>
                <span>{props.test.totalQuestions - counts.answered} Left</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-gray-200">
            <div className="grid grid-cols-4 gap-4">
              {questions.map((q) => {
                const status = getPaletteStatus(answers[q.id] ?? blankAnswer());
                const isCurrent = q.orderIndex === currentQuestionIndex;
                
                let statusClass = "modern-palette-unanswered";
                if (status === "ANSWERED" || status === "ANSWERED_REVIEW") statusClass = "modern-palette-answered";
                else if (status === "REVIEW") statusClass = "modern-palette-marked";
                
                if (isCurrent) statusClass = "modern-palette-current";

                return (
                  <button
                    key={q.id}
                    className={`modern-palette-btn ${statusClass}`}
                    onClick={() => goToQuestion(q.orderIndex)}
                    type="button"
                  >
                    {String(q.orderIndex).padStart(2, "0")}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="p-8 bg-gray-50 border-t border-[#E5E7EB] flex flex-col gap-4">
            <div className="flex items-center gap-3 text-xs font-bold text-gray-600">
                <div className="w-4 h-4 rounded bg-[#10B981]" /> Answered
            </div>
            <div className="flex items-center gap-3 text-xs font-bold text-gray-600">
                <div className="w-4 h-4 rounded bg-[#F59E0B]" /> Marked for Review
            </div>
            <div className="flex items-center gap-3 text-xs font-bold text-gray-600">
                <div className="w-4 h-4 rounded bg-gray-200" /> Not Answered
            </div>
          </div>
        </aside>
      </div>

      {/* STICKY BOTTOM ACTION BAR */}
      <footer className="fixed bottom-0 left-0 right-0 h-[120px] bg-white/90 backdrop-blur-md border-t border-[#E5E7EB] px-12 flex items-center justify-between z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        <div className="flex gap-4">
          <button 
            type="button" 
            className="modern-btn modern-btn-secondary" 
            onClick={() => goToQuestion(currentQuestionIndex - 1)} 
            disabled={currentQuestionIndex === 1}
          >
            Previous
          </button>
          <button 
            type="button" 
            className="modern-btn modern-btn-warning" 
            onClick={flagAndNext}
          >
            Mark For Review
          </button>
          <button 
            type="button" 
            className="modern-btn modern-btn-secondary text-blue-600 border-blue-100" 
            onClick={clearResponse}
          >
            Clear Response
          </button>
        </div>
        
        <div className="flex gap-4">
          <button 
            type="button" 
            className="modern-btn modern-btn-primary w-[240px]" 
            onClick={() => goToQuestion(currentQuestionIndex + 1)} 
            disabled={currentQuestionIndex === props.test.totalQuestions}
          >
            Save & Next
          </button>
          <button 
            type="button" 
            className="modern-btn modern-btn-danger" 
            onClick={() => setShowSubmitDialog(true)}
          >
            Submit Test
          </button>
        </div>
      </footer>

      {showSubmitDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-12">
              <h2 className="text-4xl font-black text-slate-800 mb-4 uppercase tracking-tighter">Submit Examination?</h2>
              <p className="text-slate-500 mb-10 text-xl font-medium leading-relaxed">Please review your final performance summary before submitting the test. This action is irreversible.</p>
              
              <div className="grid grid-cols-3 gap-6 mb-12">
                <div className="bg-emerald-50 rounded-[24px] p-8 text-center border border-emerald-100 shadow-sm">
                  <div className="text-5xl font-black text-emerald-600 mb-2">{counts.answered}</div>
                  <div className="text-xs font-black uppercase text-emerald-500 tracking-widest">Answered</div>
                </div>
                <div className="bg-rose-50 rounded-[24px] p-8 text-center border border-rose-100 shadow-sm">
                  <div className="text-5xl font-black text-rose-600 mb-2">{props.test.totalQuestions - counts.answered}</div>
                  <div className="text-xs font-black uppercase text-rose-500 tracking-widest">Unanswered</div>
                </div>
                <div className="bg-amber-50 rounded-[24px] p-8 text-center border border-amber-100 shadow-sm">
                  <div className="text-5xl font-black text-amber-600 mb-2">{counts.flagged}</div>
                  <div className="text-xs font-black uppercase text-amber-500 tracking-widest">Marked</div>
                </div>
              </div>
              
              <div className="flex gap-6 justify-end">
                <button 
                  type="button" 
                  className="modern-btn modern-btn-secondary px-10" 
                  onClick={() => setShowSubmitDialog(false)}
                >
                  Return to Test
                </button>
                <button 
                  disabled={isSubmitting} 
                  type="button" 
                  className="modern-btn modern-btn-danger px-12" 
                  onClick={() => void submitAttempt(false)}
                >
                  {isSubmitting ? "Finalizing..." : "Submit Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
