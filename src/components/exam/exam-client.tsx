"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QuestionContent, renderQuestionText } from "@/components/questions/question-content";
import { getPaletteStatus, normalizeStoredAnswer } from "@/lib/neet";
import { getDisplayPrompt } from "@/lib/question-content";
import type { OptionKey, QuestionPayload, StoredAnswersMap } from "@/lib/types";
import { persistLiveAttemptAction, submitLiveAttemptAction } from "@/lib/live-actions";

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
    <div className="w-full text-[#4d3d31]">
      {/* Question number displayed in header; removed duplicate here */}

      <div className="prose prose-sm max-w-none text-[1rem] leading-8 text-[#4d3d31]">
        {question.type === "TEXT" ? (
          <QuestionContent
            prompt={prompt}
            table={question.table}
            promptClassName="whitespace-pre-line text-[1rem] leading-8"
            tableClassName="mt-6"
          />
        ) : (
          <div className="mb-6 text-[1rem]">Image based question</div>
        )}
      </div>

      {question.type === "IMAGE" && question.imagePath ? (
        <div className="my-6 rounded-[0.9rem] border border-[#ddd0c3] bg-white p-4 shadow-sm">
          <Image
            src={question.imagePath}
            alt={`Question ${question.orderIndex}`}
            width={1200}
            height={600}
            className="mx-auto h-auto max-w-full rounded-[0.75rem]"
            priority
          />
        </div>
      ) : null}

      <div className="mt-6 space-y-3.5">
                {(question.options ?? fallbackOptions).map((option) => {
                    const isSelected = answer.selectedOptions.includes(option.key);
                    return (
            <button 
                            key={option.key} 
              type="button"
              className={`flex w-full items-center gap-4 rounded-[0.45rem] border px-4 py-2.5 text-left text-[0.98rem] transition ${isSelected ? 'border-[#1f7a48] bg-[#daf4dc] text-[#17482e] shadow-sm' : 'border-[#d8cdc0] bg-white text-[#4d3d31] hover:border-[#c8b8a6]'}`}
                            onClick={() => usesMultipleAnswers ? onToggleOption(option.key) : onSelectOption(option.key)}
                        >
              <div className={`flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 ${isSelected ? 'border-[#1f7a48] bg-[#1f7a48]' : 'border-[#b8ac9e] bg-white'}`}>
                {isSelected ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                                {renderQuestionText(option.text)}
                            </div>
            </button>
                    );
                })}
            </div>

            <button 
              type="button" 
              className="mt-6 text-[0.98rem] font-normal text-sky-500 hover:text-sky-600 transition-colors"
              onClick={onClear}
            >
              Clear Response
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
  const saveInFlightRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const totalTimeSpentSecondsRef = useRef(props.initialTotalTimeSpentSeconds);
  const questionTimeSpentRef = useRef<Record<string, number>>({});
  
  const questions = props.questions;
  const currentQuestion = questions[currentQuestionIndex - 1];
  const questionPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (currentQuestion && !questionTimeSpentRef.current[currentQuestion.id]) {
        questionTimeSpentRef.current[currentQuestion.id] = answers[currentQuestion.id]?.timeSpentSeconds ?? 0;
    }
  }, [currentQuestion, answers]);

  useEffect(() => {
    questionPanelRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [currentQuestionIndex]);

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
    if (saveInFlightRef.current) {
      pendingSaveRef.current = true;
      return;
    }

    saveInFlightRef.current = true;
    try {
        if (props.test.mode === "LIVE") {
            const params = body as any;
            await persistLiveAttemptAction({
                attemptId: props.attemptId,
                answers: params.answers ?? {},
                timeConsumedSeconds: params.totalTimeSpentSeconds ?? 0,
            });
        } else {
            const response = await fetch(`/api/attempts/${props.attemptId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!response.ok) throw new Error("Save failed");
        }
    } catch (e) { console.error("Autosave error", e); }
    finally {
      saveInFlightRef.current = false;
    }
  }, [props.attemptId, props.test.mode]);

  const flushSave = useCallback(async () => {
    if (submittedRef.current || !dirtySaveRef.current) return;
    if (saveInFlightRef.current) {
      pendingSaveRef.current = true;
      return;
    }

    await saveAttempt(getLatestState());
    dirtySaveRef.current = false;

    if (pendingSaveRef.current) {
      pendingSaveRef.current = false;
      dirtySaveRef.current = true;
      await flushSave();
    }
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
      if (props.test.mode === "LIVE") {
        await persistLiveAttemptAction({ attemptId: props.attemptId, answers: state.answers, timeConsumedSeconds: state.totalTimeSpentSeconds });
        await submitLiveAttemptAction(props.attemptId);
        router.replace(`/live-arena/${props.test.id}/leaderboard`);
      } else {
        await fetch(`/api/attempts/${props.attemptId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state) });
        const res = await fetch(`/api/attempts/${props.attemptId}/submit${auto ? "?auto=1" : ""}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state) });
        if (!res.ok) throw new Error("Submit failed");
        router.replace(`/attempts/${props.attemptId}/result`);
      }
    } catch (e) {
      submittedRef.current = false;
      setIsSubmitting(false);
      window.alert("Submission failed. Try again.");
    }
  }, [props.attemptId, router, getLatestState, props.test.id, props.test.mode]);

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
        const state = getLatestState();
        const body = new Blob([JSON.stringify(state)], { type: "application/json" });
        if (props.test.mode === "LIVE") {
          // Use the live attempts submit endpoint which evaluates and marks AUTO_SUBMITTED
          navigator.sendBeacon(`/api/live-attempts/${props.attemptId}/submit?auto=1`, body);
          return;
        }
        navigator.sendBeacon(`/api/attempts/${props.attemptId}/submit?auto=1`, body);
      }
    };
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (submittedRef.current) return;
      e.preventDefault();
      // Most browsers show a generic confirmation; set returnValue to trigger it
      e.returnValue = "You have an ongoing test. Leaving will auto-submit your attempt.";
      return "You have an ongoing test. Leaving will auto-submit your attempt.";
    };
    window.history.pushState({ locked: true }, "", window.location.href);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
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
  const progressPercent = Math.round((counts.answered / props.test.totalQuestions) * 100);

  return (
    <div className="h-screen overflow-hidden bg-[#f4efe6] text-[#4d3d31]">
      <div className="flex h-screen w-full flex-col">
        <header className="grid grid-cols-[140px_1fr] overflow-hidden rounded-t-[0.5rem] border border-[#ddd0c3] bg-[#f7f2ea] shadow-[0_1px_6px_rgba(92,70,48,0.06)]">
          <div className="flex items-center border-r border-[#ddd0c3] px-3 py-2">
            <div className="text-lg font-semibold text-[#d07a31]">{props.studentName}</div>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-2">
            <div className="flex flex-wrap items-center gap-2 text-[#7a5f46]">
              <span className="text-[0.95rem] font-semibold text-[#d46f23]">Test Name</span>
              <span className="text-[1.25rem] font-bold leading-tight">{props.test.name}</span>
            </div>
            <div className="flex items-center gap-2 rounded-[0.5rem] border-2 border-[#ea8b3a] bg-[#fff8f0] px-3 py-1.5 text-[#d46f23] shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-[0.06em]">Time Remaining</div>
              <div className="min-w-[96px] rounded-[0.35rem] border border-[#ea8b3a] bg-white px-3 py-1 text-center text-xl font-bold tabular-nums text-[#d46f23]">
                <ExamTimer
                  initialSeconds={Math.max(0, props.test.durationMinutes * 60 - props.initialTotalTimeSpentSeconds)}
                  onExpire={() => void submitAttempt(true)}
                />
              </div>
            </div>
          </div>
        </header>

        <div className="grid flex-1 min-h-0 overflow-hidden rounded-b-[0.75rem] border-x border-b border-[#ddd0c3] bg-[#f8f4ec] shadow-[0_2px_8px_rgba(92,70,48,0.04)] grid-cols-[220px_minmax(0,1fr)] md:grid-cols-[280px_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-r border-[#ddd0c3] bg-[#f6f0e6]">
            <div className="border-b border-[#ddd0c3] p-3">
              <div className="rounded-[0.7rem] border border-[#e2d4c3] bg-[#fffaf4] p-3 shadow-sm">
                <h2 className="border-b border-[#efcfa8] pb-2 text-[1.05rem] font-bold text-[#d46f23]">Attempt Status</h2>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[0.72rem] font-bold text-white">
                  <div className="rounded-md bg-[#4caf50] px-2 py-2">Answered<br />{counts.answered}</div>
                  <div className="rounded-md bg-[#f0b03f] px-2 py-2">Flagged<br />{counts.flagged}</div>
                  <div className="rounded-md bg-[#d96359] px-2 py-2">Pending<br />{counts.pending}</div>
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col p-3">
              <div className="flex min-h-0 flex-1 flex-col rounded-[0.75rem] border border-[#e2d4c3] bg-[#fffaf4] shadow-sm">
                <div className="border-b border-[#efcfa8] p-3">
                  <h2 className="text-[1.05rem] font-bold text-[#d46f23]">Questions</h2>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                    <div className="grid grid-cols-5 gap-2.5 max-h-[72vh] overflow-y-auto">
                    {questions.map((q) => {
                      const status = getPaletteStatus(answers[q.id] ?? blankAnswer());
                      const isCurrent = q.orderIndex === currentQuestionIndex;

                      let statusClass = "bg-[#d8dde6] text-[#2f2f2f] border-[#b8c0cb]";
                      if (status === "ANSWERED" || status === "ANSWERED_REVIEW") statusClass = "bg-[#69b86b] text-white border-[#4a9851]";
                      else if (status === "REVIEW") statusClass = "bg-[#f0b03f] text-white border-[#da9a28]";
                      if (isCurrent) statusClass = "bg-[#d96359] text-white border-[#b54f47] shadow-[0_0_0_2px_rgba(217,99,89,0.2)]";

                      return (
                        <button
                          key={q.id}
                          className={`h-10 rounded-[0.35rem] border text-[0.95rem] font-bold transition hover:brightness-95 ${statusClass}`}
                          onClick={() => goToQuestion(q.orderIndex)}
                          type="button"
                        >
                          {String(q.orderIndex).padStart(2, "0")}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <main className="min-h-0 overflow-hidden bg-[#f8f4ec]">
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-[#ddd0c3] px-6 py-5">
                <div className="flex items-center justify-between text-[0.95rem] font-semibold text-[#c85f16]">
                  <div>Q {String(currentQuestion.orderIndex).padStart(2, "0")} of {String(props.test.totalQuestions).padStart(2, "0")}</div>
                  <div className="text-green-700 font-bold">{progressPercent}% completed</div>
                </div>
              </div>

              <div ref={questionPanelRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-6 lg:px-8 lg:py-8">
                <div className="max-w-[980px]">
                  <QuestionBody
                    question={currentQuestion}
                    answer={currentAnswer}
                    onSelectOption={selectOption}
                    onToggleOption={toggleOption}
                    onClear={clearResponse}
                    totalQuestions={props.test.totalQuestions}
                  />
                </div>
              </div>

              <footer className="shrink-0 border-t border-[#ddd0c3] bg-[#f3ede3] px-4 py-3 shadow-[0_-2px_8px_rgba(92,70,48,0.04)] lg:px-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-secondary min-w-[108px] !border-[#d9cfc3] !bg-[#fffaf3] !px-4 !py-3 !text-[#5f4a3c]"
                      onClick={() => goToQuestion(currentQuestionIndex - 1)}
                      disabled={currentQuestionIndex === 1}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="btn-primary min-w-[108px] !bg-[#e5ae3a] !px-4 !py-3 !text-white"
                      onClick={flagAndNext}
                    >
                      Flag
                    </button>
                    <button
                      type="button"
                      className="btn-primary min-w-[108px] !bg-[#1ba96a] !px-4 !py-3 !text-white"
                      onClick={() => goToQuestion(currentQuestionIndex + 1)}
                      disabled={currentQuestionIndex === props.test.totalQuestions}
                    >
                      Next
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn-primary min-w-[126px] !bg-[#e35d53] !px-6 !py-3 !text-white"
                    onClick={() => setShowSubmitDialog(true)}
                  >
                    End Test
                  </button>
                </div>
              </footer>
            </div>
          </main>
        </div>

        {tabWarning ? (
          <div className="fixed right-4 top-4 z-[70] rounded-full border border-[#d9b28c] bg-[#fff7ef] px-4 py-2 text-sm font-semibold text-[#b85f20] shadow-lg">
            {tabWarning}
          </div>
        ) : null}

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
    </div>
  );
}
