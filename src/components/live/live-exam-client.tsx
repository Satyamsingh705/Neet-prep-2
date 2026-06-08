"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QuestionContent, renderQuestionText } from "@/components/questions/question-content";
import { getPaletteStatus, normalizeStoredAnswer } from "@/lib/neet";
import { getDisplayPrompt } from "@/lib/question-content";
import type { OptionKey, QuestionPayload, StoredAnswersMap } from "@/lib/types";
import { persistLiveAttemptAction, submitLiveAttemptAction } from "@/lib/live-actions";

type LiveExamClientProps = {
  attemptId: string;
  liveTestId: string;
  studentName: string;
  title: string;
  endTime: string;
  questions: QuestionPayload[];
  initialAnswers: StoredAnswersMap;
  initialTimeConsumed: number;
};

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

const QuestionDisplay = React.memo(({ 
    question, 
    answer, 
    onSelectOption, 
    onToggleOption, 
    totalQuestions 
}: { 
    question: QuestionPayload; 
    answer: any; 
    onSelectOption: (key: OptionKey) => void; 
    onToggleOption: (key: OptionKey) => void;
    totalQuestions: number;
}) => {
    if (!question) return null;
    const isImageQuestion = question.type === "IMAGE";
    const usesMultipleAnswers = question.answerPolicy === "MULTIPLE";
    const prompt = getDisplayPrompt(question.prompt ?? "");

    return (
        <div className="flex-1 overflow-y-auto px-2 py-4 sm:px-5 lg:px-6 lg:py-5">
            <div className="flex items-start gap-3">
                <div className="shrink-0 pt-1 text-[0.8rem] font-semibold leading-none text-[#dd504a]">
                    Q {String(question.orderIndex).padStart(2, "0")} of {String(totalQuestions).padStart(2, "0")}
                </div>
                <div className={`min-w-0 max-w-[900px] text-[#2d241d] ${isImageQuestion ? "text-[0.88rem] leading-6 sm:text-[0.92rem] lg:text-[0.94rem]" : "text-[0.94rem] leading-7 sm:text-[0.98rem] lg:text-[1.02rem]"}`}>
                    {question.type === "TEXT" ? (
                        <QuestionContent
                            prompt={prompt}
                            table={question.table}
                            promptClassName="whitespace-pre-line"
                            tableClassName="mt-4"
                        />
                    ) : "Image based question"}
                </div>
            </div>

            {question.type === "IMAGE" && question.imagePath ? (
                <div className="relative mt-4 h-[34vh] w-full rounded-md border border-[#ddd0c3] bg-white p-3 lg:mt-5 lg:h-[40vh]">
                    <Image
                        src={question.imagePath}
                        alt={`Question ${question.orderIndex}`}
                        fill
                        className="object-contain p-2"
                        priority
                    />
                </div>
            ) : null}

            <div className={`mt-4 max-w-[760px] ${isImageQuestion ? "lg:mt-3" : ""}`}>
                <div className={`font-semibold text-[#dd504a] ${isImageQuestion ? "text-[0.96rem] sm:text-[1rem]" : "text-[1.05rem] sm:text-[1.15rem]"}`}>Options :</div>
                <div className={`mt-2 text-[#322920] ${isImageQuestion ? "space-y-2 text-[0.88rem] leading-6 sm:text-[0.92rem]" : "space-y-3 text-[0.96rem] leading-7"}`}>
                    {(question.options ?? []).map((option: any) => (
                        <label key={option.key} className="flex cursor-pointer items-start gap-3">
                            <input
                                type={usesMultipleAnswers ? "checkbox" : "radio"}
                                name={`question-${question.id}`}
                                checked={answer.selectedOptions.includes(option.key)}
                                onChange={() => usesMultipleAnswers ? onToggleOption(option.key) : onSelectOption(option.key)}
                                className="mt-1.5 h-4 w-4 shrink-0 rounded border-[#d8d1c6] text-[#d7671b] focus:ring-[#d7671b]"
                            />
                            <div className="min-w-0 flex-1">{renderQuestionText(option.text)}</div>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
});

QuestionDisplay.displayName = "QuestionDisplay";

const LiveTimer = React.memo(({ endTime, onExpire }: { endTime: string; onExpire: () => void }) => {
    const [secondsLeft, setSecondsLeft] = useState(0);
    const onExpireRef = useRef(onExpire);
    
    useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

    useEffect(() => {
        const target = new Date(endTime).getTime();
        const update = () => {
            const now = new Date().getTime();
            const diff = Math.max(0, Math.floor((target - now) / 1000));
            setSecondsLeft(diff);
            if (diff === 0) onExpireRef.current();
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [endTime]);

    const isLowTime = secondsLeft > 0 && secondsLeft <= 300;

    return (
        <div className="flex items-center gap-3">
            <div className={`text-[1rem] font-semibold sm:text-[1.1rem] ${isLowTime ? "text-[#c63f32]" : "text-[#d7671b]"}`}>Time Left</div>
            <div className={`rounded-xl border-2 px-3 py-2 text-xl font-bold sm:text-2xl ${isLowTime ? "border-[#c63f32] bg-[#fff1ef] text-[#c63f32]" : "border-[#df7d39] bg-[#fff7f0] text-[#d7671b]"}`}>
                {formatTimer(secondsLeft)}
            </div>
        </div>
    );
});

LiveTimer.displayName = "LiveTimer";

export function LiveExamClient(props: LiveExamClientProps) {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1);
  const [answers, setAnswers] = useState<StoredAnswersMap>(() =>
    Object.fromEntries(
      Object.entries(props.initialAnswers ?? {}).map(([qId, ans]) => [qId, normalizeStoredAnswer(ans as any)])
    )
  );
  
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const submittedRef = useRef(false);
  const dirtySaveRef = useRef(false);
  const totalTimeConsumedRef = useRef(props.initialTimeConsumed);
  const questionTimeSpentRef = useRef<Record<string, number>>({});
  
  const questions = props.questions;
  const currentQuestion = questions[currentQuestionIndex - 1];

  useEffect(() => {
    if (currentQuestion && !questionTimeSpentRef.current[currentQuestion.id]) {
        questionTimeSpentRef.current[currentQuestion.id] = answers[currentQuestion.id]?.timeSpentSeconds ?? 0;
    }
  }, [currentQuestion, answers]);

  // Background second tracker
  useEffect(() => {
    const interval = setInterval(() => {
        totalTimeConsumedRef.current += 1;
        if (currentQuestion) {
            questionTimeSpentRef.current[currentQuestion.id] = (questionTimeSpentRef.current[currentQuestion.id] ?? 0) + 1;
            dirtySaveRef.current = true;
        }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentQuestion]);

  const getLatestState = useCallback(() => {
    const updatedAnswers = { ...answers };
    Object.entries(questionTimeSpentRef.current).forEach(([qId, seconds]) => {
        if (updatedAnswers[qId]) updatedAnswers[qId] = { ...updatedAnswers[qId], timeSpentSeconds: seconds };
    });
    return {
      answers: updatedAnswers,
      timeConsumedSeconds: totalTimeConsumedRef.current,
    };
  }, [answers]);

  const flushSave = useCallback(async () => {
    if (submittedRef.current || !dirtySaveRef.current) return;
    try {
      const state = getLatestState();
      await persistLiveAttemptAction({
        attemptId: props.attemptId,
        ...state,
      });
      dirtySaveRef.current = false;
    } catch (e) { console.error("Autosave error", e); }
  }, [props.attemptId, getLatestState]);

  useEffect(() => {
    const interval = setInterval(flushSave, 15000);
    return () => clearInterval(interval);
  }, [flushSave]);

  const handleSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setIsSubmitting(true);
    try {
      const state = getLatestState();
      await persistLiveAttemptAction({ attemptId: props.attemptId, ...state });
      await submitLiveAttemptAction(props.attemptId);
      router.replace(`/live-arena/${props.liveTestId}/leaderboard`);
    } catch (e) {
      submittedRef.current = false;
      setIsSubmitting(false);
      window.alert("Submission failed. Please try again.");
    }
  }, [props.attemptId, props.liveTestId, router, getLatestState]);

  const goToQuestion = useCallback((idx: number) => {
    const safeIdx = Math.max(1, Math.min(idx, questions.length));
    const targetQ = questions[safeIdx - 1];
    setAnswers(prev => ({
        ...prev,
        [targetQ.id]: { ...(prev[targetQ.id] ?? blankAnswer()), visited: true }
    }));
    setCurrentQuestionIndex(safeIdx);
    dirtySaveRef.current = true;
  }, [questions]);

  const selectOption = useCallback((option: OptionKey) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: { ...(prev[currentQuestion.id] ?? { ...blankAnswer(), visited: true }), selectedOptions: [option], visited: true },
    }));
    dirtySaveRef.current = true;
  }, [currentQuestion.id]);

  const toggleOption = useCallback((option: OptionKey) => {
    setAnswers(prev => {
      const curr = normalizeStoredAnswer(prev[currentQuestion.id] ?? { ...blankAnswer(), visited: true });
      const selectedOptions = curr.selectedOptions.includes(option)
        ? curr.selectedOptions.filter(o => o !== option)
        : [...curr.selectedOptions, option].sort();
      return { ...prev, [currentQuestion.id]: { ...curr, selectedOptions, visited: true } };
    });
    dirtySaveRef.current = true;
  }, [currentQuestion.id]);

  const flagAndNext = () => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: { ...(prev[currentQuestion.id] ?? blankAnswer()), markedForReview: true, visited: true },
    }));
    goToQuestion(currentQuestionIndex + 1);
  };

  const counts = useMemo(() => {
    return questions.reduce((acc, q) => {
      const status = getPaletteStatus(answers[q.id] ?? blankAnswer());
      if (status === "ANSWERED" || status === "ANSWERED_REVIEW") acc.answered += 1;
      else if (status === "REVIEW") acc.flagged += 1;
      else acc.pending += 1;
      return acc;
    }, { answered: 0, flagged: 0, pending: 0 });
  }, [answers, questions]);

  const currentAnswer = normalizeStoredAnswer(answers[currentQuestion.id] ?? { ...blankAnswer(), visited: true });

  return (
    <div className="page-grid bg-[#f4f2ed] text-[#2d241d]">
      <aside className="order-2 border-t border-[#d8d1c6] bg-[#f3f0ea] px-2 py-3 lg:order-1 lg:border-r lg:border-t-0 lg:px-4 lg:py-4">
        <div className="rounded-md border border-[#d8d1c6] bg-[#f8f6f1] px-3 py-3 text-[1rem] font-semibold text-[#d7671b] shadow-sm">
          <div className="truncate" title={props.studentName}>{props.studentName}</div>
        </div>

        <div className="mt-6 rounded-md border border-[#d8d1c6] bg-[#f8f6f1] p-3 shadow-sm">
          <div className="border-b border-[#ef785e] pb-2 text-[1rem] font-semibold text-[#d75d52]">Arena Status</div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <StatusBox label="Done" count={counts.answered} color="#49a84f" />
            <StatusBox label="Flag" count={counts.flagged} color="#e4aa45" />
            <StatusBox label="Left" count={counts.pending} color="#d85b58" />
          </div>
        </div>

        <div className="mt-6 rounded-md border border-[#d8d1c6] bg-[#f8f6f1] p-3 shadow-sm">
          <div className="border-b border-[#d08b37] pb-2 text-[1rem] font-semibold text-[#b46916]">Questions</div>
          <div className="mt-3 max-h-[38vh] overflow-y-auto pr-1 lg:max-h-[50vh]">
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
              {questions.map((q) => (
                <button
                  key={q.id}
                  className={`palette-button ${q.orderIndex === currentQuestionIndex ? "active" : ""} ${getPaletteStatus(answers[q.id] ?? blankAnswer()).toLowerCase().replaceAll("_", "-")}`}
                  onClick={() => goToQuestion(q.orderIndex)}
                  type="button"
                >
                  {String(q.orderIndex).padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <main className="order-1 flex min-h-screen flex-col bg-[#f8f6f1] lg:order-2 lg:h-screen lg:overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[#d8d1c6] bg-[#f8f6f1] px-2 py-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between lg:py-2.5">
          <div className="text-[0.8rem] leading-6 text-[#342a22] sm:text-[0.9rem]">
            <span className="font-semibold text-[#d7671b]">COMPETING IN:</span> {props.title}
          </div>
          <LiveTimer endTime={props.endTime} onExpire={handleSubmit} />
        </div>

        <QuestionDisplay 
            question={currentQuestion} 
            answer={currentAnswer} 
            onSelectOption={selectOption} 
            onToggleOption={toggleOption}
            totalQuestions={questions.length}
        />

        <div className="border-t border-[#d8d1c6] bg-[#f3f0ea] px-2 py-3 sm:px-4 lg:py-4">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <NavButton label="Clear" onClick={() => setAnswers(p => ({ ...p, [currentQuestion.id]: { ...blankAnswer(), visited: true } }))} color="text-[#d7671b]" />
              <NavButton label="Flag & Next" onClick={flagAndNext} color="text-[#b56d3d]" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <NavButton label="Prev" onClick={() => goToQuestion(currentQuestionIndex - 1)} disabled={currentQuestionIndex === 1} color="text-[#8a6a52]" />
              <button className="rounded-md bg-[#d7671b] px-4 py-2 text-[0.8rem] font-bold text-white sm:px-8" onClick={() => goToQuestion(currentQuestionIndex + 1)} disabled={currentQuestionIndex === questions.length}>Next</button>
              <button className="rounded-md bg-[#d85b58] px-4 py-2 text-[0.8rem] font-bold text-white sm:px-8" onClick={() => setShowSubmitDialog(true)}>Finish</button>
            </div>
          </div>
        </div>

        {showSubmitDialog && (
          <SubmitDialog 
            answeredCount={counts.answered} 
            totalQuestions={questions.length} 
            onCancel={() => setShowSubmitDialog(false)} 
            onConfirm={() => { setShowSubmitDialog(false); void handleSubmit(); }} 
            isSubmitting={isSubmitting} 
          />
        )}
      </main>
    </div>
  );
}

function StatusBox({ label, count, color }: { label: string; count: number; color: string }) {
    return (
        <div className="relative flex min-w-0 items-center justify-center rounded-md px-2 py-3 text-center text-white" style={{ backgroundColor: color }}>
            <span className="text-[0.72rem] font-semibold leading-4">{label}</span>
            <span className="absolute -right-2 -top-2 inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-[0.72rem] font-bold text-[#d7671b] shadow-sm">{count}</span>
        </div>
    );
}

function NavButton({ label, onClick, disabled, color }: { label: string; onClick: () => void; disabled?: boolean; color: string }) {
    return (
        <button className={`rounded-md border border-[#d8d1c6] bg-white px-3 py-2 text-[0.8rem] font-bold ${color} transition hover:bg-[#fff7f0] disabled:opacity-50 sm:px-6`} onClick={onClick} disabled={disabled} type="button">{label}</button>
    );
}

function SubmitDialog({ answeredCount, totalQuestions, onCancel, onConfirm, isSubmitting }: { answeredCount: number; totalQuestions: number; onCancel: () => void; onConfirm: () => void; isSubmitting: boolean }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#2f241c]/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-[400px] rounded-2xl bg-white p-6 shadow-2xl">
                <h3 className="text-xl font-bold text-[#2f241c]">Submit Live Test?</h3>
                <p className="mt-3 text-sm text-[#65584a]">You have answered {answeredCount} / {totalQuestions}. Final submission will record your current rank.</p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button className="rounded-xl border border-[#ead9c9] px-6 py-2.5 text-sm font-semibold text-[#65584a]" onClick={onCancel} disabled={isSubmitting}>Back</button>
                    <button className="rounded-xl bg-[#d85b58] px-6 py-2.5 text-sm font-bold text-white" onClick={onConfirm} disabled={isSubmitting}>{isSubmitting ? "Submitting..." : "Yes, Submit"}</button>
                </div>
            </div>
        </div>
    );
}
