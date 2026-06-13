"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ChapterSummary = {
  subject: string;
  chapter: string;
};

export function QuestionUploadPanel({ chapters }: { chapters: ChapterSummary[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleJsonSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("Parsing JSON file...");

    try {
      const formData = new FormData(event.currentTarget);
      const file = formData.get("file");

      if (!(file instanceof File)) {
        throw new Error("JSON file is required.");
      }

      const jsonText = await file.text();

      if (/^\s*</.test(jsonText)) {
        throw new Error("Selected file contains HTML instead of JSON. Upload the raw JSON file.");
      }

      const jsonContent = JSON.parse(jsonText);
      const normalized = Array.isArray(jsonContent) ? jsonContent : [jsonContent];

      const parsedQuestions = normalized.map((row) => {
        const correctAnswers = row.correctAnswers ?? (row.correctAnswer ? [row.correctAnswer] : []);
        return {
          subject: row.subject,
          chapter: row.chapter,
          type: "TEXT",
          prompt: row.prompt,
          metadata: row.table ? { table: row.table } : null,
          options: row.options,
          correctAnswers,
          answerPolicy: row.answerPolicy ?? (correctAnswers.length > 1 ? "MULTIPLE" : "SINGLE"),
        };
      });

      setMessage("Uploading questions to database...");
      const response = await fetch("/api/questions/upload-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: parsedQuestions }),
      });

      const text = await response.text();
      let payload: { error?: string; message?: string } = {};
      try {
        payload = JSON.parse(text);
      } catch {
        if (!response.ok) {
          throw new Error(`Upload failed: ${text}`);
        }
      }

      if (!response.ok) {
        throw new Error(payload.error ?? "JSON upload failed.");
      }

      setMessage(payload.message ?? "JSON upload complete.");
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "JSON upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[1rem] border border-[#eadbcd] bg-[#fffaf5] px-4 py-3 text-sm text-[#705e50]">
        <strong className="text-[#c56727]">JSON metadata:</strong> every upload stores subject, chapter, question type, and correct answer. Use <span className="font-semibold">correctAnswers</span> like <span className="font-semibold">[&quot;A&quot;, &quot;C&quot;]</span> for multi-correct questions. Optional <span className="font-semibold">table</span> supports <span className="font-semibold">caption</span>, <span className="font-semibold">headers</span>, and <span className="font-semibold">rows</span> for match-the-following layouts.
      </div>

      <section className="panel rounded-[1.2rem] p-5">
        <h3 className="text-xl font-semibold text-[#2f241c]">JSON Upload for Text Questions</h3>
        <p className="mt-2 text-sm leading-6 text-[#6d5a49]">Upload an array of questions with options and answers.</p>
        <form className="mt-4 flex flex-col gap-4" onSubmit={handleJsonSubmit}>
          <input required type="file" name="file" accept="application/json" className="rounded-lg border border-[#dacdbf] bg-white px-3 py-3" />
          <button disabled={isSubmitting} className="btn-primary w-fit" type="submit">Upload JSON</button>
        </form>
      </section>

      <section className="panel rounded-[1.2rem] p-5">
        <h3 className="text-xl font-semibold text-[#2f241c]">Existing Chapters</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {chapters.map((chapter) => (
            <span key={`${chapter.subject}-${chapter.chapter}`} className="rounded-full bg-[#f3ece3] px-3 py-1 text-sm text-[#6f5d4d]">
              {chapter.subject} · {chapter.chapter}
            </span>
          ))}
        </div>
      </section>

      {message ? <div className="rounded-[1rem] border border-[#e0d2c4] bg-white px-4 py-3 text-sm text-[#6d5a49]">{message}</div> : null}
    </div>
  );
}
