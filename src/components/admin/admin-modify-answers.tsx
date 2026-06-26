"use client";

import { useState, useMemo } from "react";

type TestItem = {
  id: string;
  name: string;
  testCode: string | null;
  totalQuestions: number;
  mode: string;
};

type OptionItem = {
  key: string;
  text: string;
};

type QuestionItem = {
  questionId: string;
  orderIndex: number;
  section: string;
  subject: string;
  chapter: string;
  type: string;
  prompt: string | null;
  options: OptionItem[] | null;
  imagePath: string | null;
  correctAnswers: string[];
  answerPolicy: string;
};

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

export function AdminModifyAnswers({ tests }: { tests: TestItem[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTest, setSelectedTest] = useState<TestItem | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Track per-question editing state
  const [editedAnswers, setEditedAnswers] = useState<
    Record<string, string[]>
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveResults, setSaveResults] = useState<
    Record<string, { ok: boolean; message: string }>
  >({});

  const filteredTests = useMemo(() => {
    if (!searchQuery.trim()) return tests;
    const query = searchQuery.toLowerCase();
    return tests.filter(
      (test) =>
        test.name.toLowerCase().includes(query) ||
        (test.testCode ?? "").toLowerCase().includes(query)
    );
  }, [tests, searchQuery]);

  async function loadQuestions(test: TestItem) {
    setSelectedTest(test);
    setLoadingQuestions(true);
    setLoadError("");
    setQuestions([]);
    setEditedAnswers({});
    setSaveResults({});

    try {
      const response = await fetch(
        `/api/admin/tests/${test.id}/questions`
      );

      if (!response.ok) {
        const errorBody = await response.text();
        let parsed: { error?: string } = {};
        try {
          parsed = JSON.parse(errorBody);
        } catch {
          // ignore
        }
        throw new Error(parsed.error ?? "Failed to load questions.");
      }

      const data = await response.json();
      setQuestions(data.questions ?? []);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load questions."
      );
    } finally {
      setLoadingQuestions(false);
    }
  }

  function toggleAnswer(questionId: string, optionKey: string) {
    setEditedAnswers((prev) => {
      const currentQuestion = questions.find(
        (q) => q.questionId === questionId
      );
      const currentAnswers =
        prev[questionId] ??
        (currentQuestion
          ? (currentQuestion.correctAnswers as string[])
          : []);

      const isSelected = currentAnswers.includes(optionKey);

      let newAnswers: string[];
      if (isSelected) {
        // Don't allow removing the last answer
        if (currentAnswers.length === 1) return prev;
        newAnswers = currentAnswers.filter((k) => k !== optionKey);
      } else {
        newAnswers = [...currentAnswers, optionKey];
      }

      return { ...prev, [questionId]: newAnswers };
    });

    // Clear any previous save result for this question
    setSaveResults((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
  }

  function getActiveAnswers(question: QuestionItem): string[] {
    return (
      editedAnswers[question.questionId] ??
      (question.correctAnswers as string[])
    );
  }

  function hasChanged(question: QuestionItem): boolean {
    const edited = editedAnswers[question.questionId];
    if (!edited) return false;
    const original = (question.correctAnswers as string[]).slice().sort();
    const current = edited.slice().sort();
    if (original.length !== current.length) return true;
    return original.some((v, i) => v !== current[i]);
  }

  async function saveAnswer(question: QuestionItem) {
    const answers = getActiveAnswers(question);
    setSavingId(question.questionId);
    setSaveResults((prev) => {
      const copy = { ...prev };
      delete copy[question.questionId];
      return copy;
    });

    try {
      const response = await fetch(
        `/api/admin/questions/${question.questionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            correctAnswers: answers,
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        let parsed: { error?: string } = {};
        try {
          parsed = JSON.parse(errorBody);
        } catch {
          // ignore
        }
        throw new Error(parsed.error ?? "Save failed.");
      }

      // Update the local question data to reflect the saved state
      setQuestions((prev) =>
        prev.map((q) =>
          q.questionId === question.questionId
            ? { ...q, correctAnswers: answers }
            : q
        )
      );

      // Clear the edited state since it's now saved
      setEditedAnswers((prev) => {
        const copy = { ...prev };
        delete copy[question.questionId];
        return copy;
      });

      setSaveResults((prev) => ({
        ...prev,
        [question.questionId]: { ok: true, message: "Saved!" },
      }));
    } catch (error) {
      setSaveResults((prev) => ({
        ...prev,
        [question.questionId]: {
          ok: false,
          message:
            error instanceof Error ? error.message : "Save failed.",
        },
      }));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="panel rounded-[1.4rem] p-6 lg:col-span-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#b26d39]">
            Answer Key Editor
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[#2f241c]">
            Modify Answers
          </h2>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d0e8f5] to-[#baddee]">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#6d5a49]">
        Search for a test, open it, review all questions, and fix any incorrect answer keys in real time.
      </p>

      {/* Search bar */}
      <div className="relative mt-5">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a08e7d]"
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search tests by name or code…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-[#e4d7c7] bg-[#fdf9f4] py-3 pl-11 pr-4 text-sm text-[#2f241c] outline-none transition-all placeholder:text-[#b5a594] focus:border-[#d7671b] focus:ring-2 focus:ring-[#d7671b]/20"
        />
      </div>

      {/* Test list (when no test selected) */}
      {!selectedTest ? (
        <div className="mt-4 space-y-2">
          {filteredTests.length === 0 ? (
            <div className="rounded-[1rem] border border-dashed border-[#e0d2c3] bg-[#fdf9f4] px-5 py-8 text-center text-sm text-[#8a7a6a]">
              {searchQuery ? "No tests match your search." : "No tests available."}
            </div>
          ) : (
            filteredTests.map((test) => (
              <button
                key={test.id}
                type="button"
                className="flex w-full items-center justify-between gap-4 rounded-[1rem] border border-[#eadbcd] bg-[#fffdfa] p-4 text-left transition-all hover:border-[#d7c3ad] hover:shadow-[0_4px_16px_rgba(40,28,18,0.06)]"
                onClick={() => void loadQuestions(test)}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate font-semibold text-[#2f241c]">
                      {test.name}
                    </div>
                    <span className="shrink-0 rounded-full bg-[#f5f0e8] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a6a52]">
                      {test.testCode ?? `TST-${test.id.slice(-8).toUpperCase()}`}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[#8a7a6a]">
                    {test.totalQuestions} questions · {test.mode}
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#b46916"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))
          )}
        </div>
      ) : (
        /* Questions editor (when a test is selected) */
        <div className="mt-4">
          {/* Back button */}
          <button
            type="button"
            className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#d7671b] transition-colors hover:text-[#b5560f]"
            onClick={() => {
              setSelectedTest(null);
              setQuestions([]);
              setEditedAnswers({});
              setSaveResults({});
              setLoadError("");
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to test list
          </button>

          {/* Selected test header */}
          <div className="mb-5 rounded-xl border border-[#e4d7c7] bg-gradient-to-r from-[#fdf9f4] to-[#f9f1e8] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-[#2f241c]">
                {selectedTest.name}
              </h3>
              <span className="rounded-full bg-[#f5e1d0] px-3 py-1 text-xs font-semibold text-[#b76428]">
                {selectedTest.testCode ?? `TST-${selectedTest.id.slice(-8).toUpperCase()}`}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#8a7a6a]">
              {selectedTest.totalQuestions} questions · Click on answer options to toggle, then save.
            </p>
          </div>

          {loadingQuestions ? (
            <div className="flex items-center justify-center gap-3 py-12 text-sm text-[#8a7a6a]">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#d7671b" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
              </svg>
              Loading questions…
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {loadError}
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((question) => {
                const activeAnswers = getActiveAnswers(question);
                const changed = hasChanged(question);
                const result = saveResults[question.questionId];
                const isSaving = savingId === question.questionId;

                return (
                  <div
                    key={question.questionId}
                    className={`rounded-[1rem] border p-4 transition-all ${
                      changed
                        ? "border-[#d7671b] bg-[#fffbf6] shadow-[0_0_0_1px_rgba(215,103,27,0.15)]"
                        : "border-[#eadbcd] bg-[#fffdfa]"
                    }`}
                  >
                    {/* Question header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f5e1d0] text-xs font-bold text-[#b76428]">
                            {question.orderIndex}
                          </span>
                          <span className="rounded-full bg-[#f0ebe4] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#7a6a58]">
                            {question.subject}
                          </span>
                          <span className="text-[10px] text-[#a09080]">
                            {question.chapter}
                          </span>
                        </div>

                        {question.type === "TEXT" && question.prompt ? (
                          <p className="mt-2 text-sm leading-6 text-[#3d3229]">
                            {question.prompt.length > 200
                              ? `${question.prompt.slice(0, 200)}…`
                              : question.prompt}
                          </p>
                        ) : question.type === "IMAGE" && question.imagePath ? (
                          <div className="mt-2">
                            <img
                              src={question.imagePath}
                              alt={`Question ${question.orderIndex}`}
                              className="max-h-24 rounded-lg border border-[#e4d7c7] object-contain"
                            />
                          </div>
                        ) : (
                          <p className="mt-2 text-xs italic text-[#a09080]">
                            {question.type === "IMAGE" ? "Image question" : "No prompt"}
                          </p>
                        )}

                        {/* Options display for TEXT questions */}
                        {question.options && question.options.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6d5a49]">
                            {(question.options as OptionItem[]).map((opt) => (
                              <span key={opt.key}>
                                <strong>{opt.key}.</strong>{" "}
                                {opt.text.length > 40
                                  ? `${opt.text.slice(0, 40)}…`
                                  : opt.text}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Answer toggle buttons */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-[#8a7a6a]">
                        Answer:
                      </span>
                      {OPTION_KEYS.map((key) => {
                        const isActive = activeAnswers.includes(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() =>
                              toggleAnswer(question.questionId, key)
                            }
                            className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold transition-all ${
                              isActive
                                ? "bg-[#17a765] text-white shadow-[0_2px_8px_rgba(23,167,101,0.3)]"
                                : "border border-[#e4d7c7] bg-white text-[#6d5a49] hover:border-[#c9b9a6] hover:bg-[#fdf9f4]"
                            }`}
                          >
                            {key}
                          </button>
                        );
                      })}

                      {/* Save button */}
                      {changed ? (
                        <button
                          type="button"
                          className="btn-primary ml-2 px-4 py-2 text-xs"
                          disabled={isSaving}
                          onClick={() => void saveAnswer(question)}
                        >
                          {isSaving ? "Saving…" : "Save"}
                        </button>
                      ) : null}

                      {/* Result feedback */}
                      {result ? (
                        <span
                          className={`ml-2 flex items-center gap-1 text-xs font-semibold ${
                            result.ok ? "text-[#17a765]" : "text-red-600"
                          }`}
                        >
                          {result.ok ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="15" y1="9" x2="9" y2="15" />
                              <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                          )}
                          {result.message}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {questions.length === 0 ? (
                <div className="rounded-[1rem] border border-dashed border-[#e0d2c3] bg-[#fdf9f4] px-5 py-8 text-center text-sm text-[#8a7a6a]">
                  No questions found for this test.
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
