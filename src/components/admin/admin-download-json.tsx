"use client";

import { useState } from "react";

type TestItem = {
  id: string;
  name: string;
  testCode: string | null;
  totalQuestions: number;
  mode: string;
};

export function AdminDownloadJson({ tests }: { tests: TestItem[] }) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function handleDownload(test: TestItem) {
    setDownloadingId(test.id);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/tests/${test.id}/export-json`
      );

      if (!response.ok) {
        const errorBody = await response.text();
        let parsed: { error?: string } = {};
        try {
          parsed = JSON.parse(errorBody);
        } catch {
          // ignore parse errors
        }
        throw new Error(parsed.error ?? "Download failed.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      let filename = `${test.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`;
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) {
          filename = match[1];
        }
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setMessage(`Downloaded: ${test.name}`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Download failed."
      );
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <section className="panel rounded-[1.4rem] p-6 lg:col-span-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#b26d39]">
            Export
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[#2f241c]">
            Download Test JSON
          </h2>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f5e1d0] to-[#edd3ba]">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b46916" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#6d5a49]">
        Download the full question data (prompt, options, answers, metadata) of any test as a JSON file.
      </p>

      <div className="mt-5 max-h-[580px] space-y-3 overflow-y-auto">
        {tests.length === 0 ? (
          <div className="rounded-[1rem] border border-dashed border-[#e0d2c3] bg-[#fdf9f4] px-5 py-8 text-center text-sm text-[#8a7a6a]">
            No tests available to export.
          </div>
        ) : (
          tests.map((test) => (
            <div
              key={test.id}
              className="flex items-center justify-between gap-4 rounded-[1rem] border border-[#eadbcd] bg-[#fffdfa] p-4 transition-all hover:border-[#d7c3ad] hover:shadow-[0_4px_16px_rgba(40,28,18,0.06)]"
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
              <button
                type="button"
                className="btn-primary shrink-0 px-4 py-2.5 text-sm"
                disabled={downloadingId === test.id}
                onClick={() => void handleDownload(test)}
              >
                {downloadingId === test.id ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                    </svg>
                    Exporting…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download JSON
                  </span>
                )}
              </button>
            </div>
          ))
        )}
      </div>

      {message ? (
        <div className="mt-4 rounded-xl bg-[#f5f0e8] px-4 py-2.5 text-sm text-[#6d5a49]">
          {message}
        </div>
      ) : null}
    </section>
  );
}
