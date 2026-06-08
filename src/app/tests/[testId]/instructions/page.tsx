import { notFound } from "next/navigation";
import { InstructionsClient } from "@/components/exam/instructions-client";
import { getInstructionData } from "@/lib/data";
import { requireCurrentStudent } from "@/lib/student-auth";

export const preferredRegion = "bom1";

export default async function InstructionsPage({ params }: { params: Promise<{ testId: string }> }) {
  await requireCurrentStudent();
  const { testId } = await params;
  const test = await getInstructionData(testId);

  if (!test) {
    notFound();
  }

  return (
    <main className="mx-auto flex justify-center px-0 py-3 sm:px-4 sm:py-6 lg:px-6">
      <div className="instruction-scale max-w-[1200px]">
        <section className="panel rounded-none border-x-0 px-3 py-5 sm:rounded-[1.6rem] sm:border-x sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="mb-6 rounded-[1.1rem] border border-[#eadbcd] bg-[#fffdfa] px-4 py-4 lg:hidden">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-[#f2d2b6] bg-[linear-gradient(135deg,#d7671b,#f3a14f)] text-lg font-bold text-white">
                OA
              </div>
              <div>
                <div className="text-4xl leading-none font-semibold text-[#241d18]">Online</div>
                <div className="mt-1 text-[0.92rem] font-semibold tracking-[0.26em] text-[#d7671b]">ASSESSMENT SYSTEM</div>
              </div>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:gap-9 xl:grid-cols-[1fr_360px]">
            <div>
              <h1 className="text-3xl leading-none font-semibold text-[#d7671b] sm:text-4xl lg:text-[3.1rem]">Test Instructions</h1>
              <dl className="mt-7 grid gap-y-3 text-[0.98rem] leading-7 text-[#2f241c] sm:grid-cols-[170px_1fr] sm:gap-y-4 sm:text-[1.05rem] lg:grid-cols-[210px_1fr] lg:text-[1.18rem]">
                <dt className="font-semibold">Test Name :</dt>
                <dd>{test.name}</dd>
                <dt className="font-semibold">Test ID :</dt>
                <dd>{test.testCode ?? `TST-${test.id.slice(-8).toUpperCase()}`}</dd>
                <dt className="font-semibold">No of Questions :</dt>
                <dd>{test.totalQuestions}</dd>
                <dt className="font-semibold">Allocated Time :</dt>
                <dd>{test.durationMinutes} Minutes</dd>
                <dt className="font-semibold">Negative Marking :</dt>
                <dd>{test.incorrectMarks}</dd>
              </dl>
              <div className="mt-8 text-[0.98rem] leading-8 text-[#574a3d] lg:text-[1.07rem]">
                <h2 className="text-[1.6rem] font-semibold text-[#d7671b] sm:text-[2rem]">Instructions</h2>
                <ul className="mt-4 space-y-2.5">
                  <li>Use Next and Previous to move through questions. Your answer is auto-saved.</li>
                  <li>Flag behaves like Mark for Review and Next.</li>
                  <li>Clear Response removes the selected option without changing review status.</li>
                  <li>The timer starts when you click Start Test and the attempt auto-submits when it reaches zero.</li>
                  <li>For NEET-pattern tests, each subject has Section A and Section B; only 10 answered questions in Section B are evaluated.</li>
                </ul>
              </div>
            </div>

            <div>
              <div className="rounded-[1.4rem] border border-[#ecd8c4] bg-[#fffdfa] p-5 lg:p-6">
                <h2 className="text-[1.5rem] font-semibold text-[#d7671b] sm:text-[2rem]">Navigation Tools</h2>
                <div className="mt-5 space-y-5 text-[1rem] leading-8 text-[#574a3d]">
                  <div className="grid gap-3 sm:grid-cols-[96px_1fr] sm:items-center sm:gap-5">
                    <button className="btn-primary w-full sm:w-auto">Next &gt;</button>
                    <p>Loads the next question.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[96px_1fr] sm:items-center sm:gap-5">
                    <button className="btn-primary w-full sm:w-auto">&lt; Previous</button>
                    <p>Returns to the previous question.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[96px_1fr] sm:items-center sm:gap-5">
                    <button className="btn-warning w-full sm:w-auto">Flag</button>
                    <p>Marks the question for review and advances to the next one.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[96px_1fr] sm:items-center sm:gap-5">
                    <button className="btn-danger w-full sm:w-auto">End Test</button>
                    <p>Shows a submission summary and ends the attempt once confirmed.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <InstructionsClient testId={test.id} />
        </section>
      </div>
    </main>
  );
}
