"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LiveTestForm({ testTemplates }: { testTemplates: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData.entries());

    // Calculate endTime
    const startTime = new Date(data.startTime as string);
    const duration = parseInt(data.durationMinutes as string);
    const endTime = new Date(startTime.getTime() + duration * 60000);

    try {
      const form = event.currentTarget;
      // If a JSON file was uploaded, create a Test first via /api/tests/upload
      let testTemplateId = data.testTemplateId as string | undefined;
      const jsonFile = (formData.get("testJson") as File) || null;

      if (jsonFile && jsonFile.size > 0) {
        try {
          const text = await jsonFile.text();
          const json = JSON.parse(text);

          const normalized = Array.isArray(json) ? json : [json];

          // Validate & normalize each question item
          const errors: string[] = [];
          const questions = normalized.map((row: any, idx: number) => {
            const out: any = {};

            // Type: accept TEXT or IMAGE, default to TEXT
            const t = (row.type || "TEXT").toString().toUpperCase();
            if (t !== "TEXT" && t !== "IMAGE") {
              // coerce unknown values to TEXT but note warning
              errors.push(`Item ${idx}: invalid type '${row.type}', expected TEXT or IMAGE`);
              out.type = "TEXT";
            } else {
              out.type = t;
            }

            // Subject & chapter
            out.subject = row.subject ?? "MAJOR_TEST";
            out.chapter = row.chapter ?? data.title ?? `uploaded-${Date.now()}`;

            // Prompt / options / metadata
            out.prompt = row.prompt ?? null;
            out.options = row.options ?? null;
            out.imagePath = row.imagePath ?? null;
            out.metadata = row.table ? { table: row.table } : row.metadata ?? null;

            // correctAnswers: prefer array, accept single correctAnswer
            const correctAnswers = Array.isArray(row.correctAnswers) ? row.correctAnswers : row.correctAnswer ? [row.correctAnswer] : undefined;
            if (!correctAnswers || correctAnswers.length === 0) {
              errors.push(`Item ${idx}: missing required 'correctAnswers'`);
            }
            out.correctAnswers = correctAnswers ?? [];

            out.answerPolicy = row.answerPolicy ?? (out.correctAnswers.length > 1 ? "MULTIPLE" : "SINGLE");

            return out;
          });

          if (errors.length > 0) {
            setError(`JSON validation errors:\n${errors.slice(0, 10).join("; ")}${errors.length > 10 ? `; and ${errors.length - 10} more` : ""}`);
            setIsSubmitting(false);
            return;
          }

          const uploadBody = {
            name: data.title || `Uploaded Test ${new Date().toISOString()}`,
            description: data.description || undefined,
            durationMinutes: parseInt(data.durationMinutes as string) || 60,
            correctMarks: 4,
            incorrectMarks: -1,
            unansweredMarks: 0,
            published: false,
            assignedSection: "MAJOR_TEST",
            isArenaTemplate: true,
            questions,
          };

          const uploadRes = await fetch('/api/tests/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(uploadBody),
          });

          if (!uploadRes.ok) {
            const txt = await uploadRes.text();
            throw new Error(`Test upload failed: ${txt}`);
          }

          const uploaded = await uploadRes.json();
          testTemplateId = uploaded.test?.id ?? uploaded.testId ?? testTemplateId;
        } catch (err: any) {
          setError(err.message || "Failed to upload JSON test file.");
          setIsSubmitting(false);
          return;
        }
      }
      const res = await fetch("/api/admin/live-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          durationMinutes: duration,
          visibility: data.visibility || "PUBLIC",
          testTemplateId: testTemplateId,
        }),
      });

      if (!res.ok) throw new Error("Failed to schedule test");
      router.refresh();
      if (form) form.reset();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-bold text-[#2f241c]">Test Title</span>
        <input name="title" required placeholder="e.g. NEET Grand Challenge #1" className="rounded-xl border border-[#dacdbf] p-3 text-sm focus:ring-2 focus:ring-[#d7671b] outline-none" />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-bold text-[#2f241c]">Description</span>
        <textarea name="description" rows={3} placeholder="Brief details about the test..." className="rounded-xl border border-[#dacdbf] p-3 text-sm focus:ring-2 focus:ring-[#d7671b] outline-none" />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold text-[#2f241c]">Start DateTime</span>
          <input name="startTime" type="datetime-local" required className="rounded-xl border border-[#dacdbf] p-3 text-sm focus:ring-2 focus:ring-[#d7671b] outline-none" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold text-[#2f241c]">Duration (Min)</span>
          <input name="durationMinutes" type="number" defaultValue={180} required className="rounded-xl border border-[#dacdbf] p-3 text-sm focus:ring-2 focus:ring-[#d7671b] outline-none" />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-bold text-[#2f241c]">Upload Test JSON</span>
        <input name="testJson" type="file" accept="application/json,.json" required className="rounded-xl border border-[#dacdbf] p-3 text-sm focus:ring-2 focus:ring-[#d7671b] outline-none" />
        <div className="text-xs text-[#6f5d4d]">Upload a JSON file containing an array of questions (or a single question object). The JSON will be used to create a Test template automatically.</div>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-bold text-[#2f241c]">Visibility</span>
        <select name="visibility" className="rounded-xl border border-[#dacdbf] p-3 text-sm focus:ring-2 focus:ring-[#d7671b] outline-none">
          <option value="PUBLIC">Public (Visible to everyone)</option>
          <option value="PRIVATE">Private (Invite only)</option>
        </select>
      </label>

      {error && <p className="text-xs font-bold text-red-500">{error}</p>}

      <button
        disabled={isSubmitting}
        className="mt-2 rounded-xl bg-[#d7671b] py-4 font-bold text-white shadow-lg shadow-orange-200 transition-all hover:bg-[#b85616] disabled:opacity-50"
      >
        {isSubmitting ? "Scheduling..." : "Schedule Live Arena"}
      </button>
    </form>
  );
}
