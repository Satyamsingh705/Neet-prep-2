"use client";

import { useState } from "react";
import Link from "next/link";

type TestType = {
  id: string;
  name: string;
  testCode?: string | null;
  description?: string | null;
  mode: string;
  sectionChapters: string[];
  totalQuestions: number;
  durationMinutes: number;
  studentAttemptCount: number;
};

export default function StudentTestList({ 
  tests, 
  activeSectionTitle 
}: { 
  tests: TestType[]; 
  activeSectionTitle: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTests = tests.filter((test) => {
    const query = searchQuery.toLowerCase();
    return (
      test.name.toLowerCase().includes(query) ||
      test.testCode?.toLowerCase().includes(query) ||
      test.description?.toLowerCase().includes(query)
    );
  });

  return (
    <section className="panel rounded-none border-x-0 p-4 sm:rounded-[1.4rem] sm:border-x sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#2f241c] sm:text-2xl">Available Tests</h2>
          <p className="mt-1 text-sm text-[#65584a]">All tests inside the {activeSectionTitle} section.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="Search tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-80 rounded-full border border-[#d9cfc3] bg-white px-4 py-2 text-sm text-[#2f241c] outline-none placeholder:text-[#a39686] focus:border-[#b26d39] focus:ring-1 focus:ring-[#b26d39]"
          />
          <div className="rounded-full bg-[#f6e4d3] px-3 py-1 text-sm font-semibold text-[#b85f20] whitespace-nowrap text-center">
            {filteredTests.length} tests
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {filteredTests.length > 0 ? (
          filteredTests.map((test) => (
            <div key={test.id} className="rounded-[1rem] border border-[#eadbcd] bg-white p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#2f241c]">{test.name}</h3>
                  <div className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a52]">{test.testCode ?? `TST-${test.id.slice(-8).toUpperCase()}`}</div>
                  <p className="mt-2 text-sm leading-6 text-[#65584a]">{test.description ?? "No description provided."}</p>
                </div>
                <div className="self-start rounded-full bg-[#f6e4d3] px-3 py-1 text-xs font-semibold text-[#b85f20]">{test.mode === "NEET_PATTERN" ? "NEET Pattern" : "Custom"}</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#6d5a49]">
                {test.sectionChapters.map((chapter) => (
                  <span key={`${test.id}-${chapter}`} className="rounded-full bg-[#f5f0e8] px-3 py-1">{chapter}</span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-[#6d5a49]">
                <span className="rounded-full bg-[#f5f0e8] px-3 py-1">{test.totalQuestions} questions</span>
                <span className="rounded-full bg-[#f5f0e8] px-3 py-1">{test.durationMinutes} minutes</span>
                <span className="rounded-full bg-[#f5f0e8] px-3 py-1">{test.studentAttemptCount} attempts</span>
              </div>
              <div className="mt-5 flex gap-3">
                <Link href={`/tests/${test.id}/instructions`} className="btn-primary w-full sm:w-auto">
                  Start Test
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[1rem] border border-dashed border-[#d9cfc3] bg-[#fcfbf8] p-5 text-sm text-[#736455]">
            No tests found.
          </div>
        )}
      </div>
    </section>
  );
}
