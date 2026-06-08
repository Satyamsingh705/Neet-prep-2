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
      const res = await fetch("/api/admin/live-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          durationMinutes: duration,
          visibility: data.visibility || "PUBLIC",
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
        <span className="text-sm font-bold text-[#2f241c]">Select Test Template</span>
        <select name="testTemplateId" required className="rounded-xl border border-[#dacdbf] p-3 text-sm focus:ring-2 focus:ring-[#d7671b] outline-none">
          <option value="">-- Choose Template --</option>
          {testTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
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
