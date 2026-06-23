import { notFound } from "next/navigation";
import { getLiveTestData, getLiveLeaderboard } from "@/lib/data";
import { getCurrentStudent } from "@/lib/student-auth";
import { RealtimeLeaderboard } from "@/components/live/realtime-leaderboard";

export default async function LiveLeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const student = await getCurrentStudent();
  const { id } = await params;
  
  const [data, initialEntries] = await Promise.all([
      getLiveTestData(id),
      getLiveLeaderboard(id)
  ]);

  if (!data) {
    notFound();
  }

  const { liveTest } = data;

  // Compute total marks for the test template (use totalEvaluatedQuestions if present)
  const testTemplate = liveTest.testTemplate;
  const perQuestion = testTemplate.correctMarks ?? 0;
  const questionCount = testTemplate.totalEvaluatedQuestions ?? testTemplate.totalQuestions ?? 0;
  const totalMarks = perQuestion * questionCount;

  return (
    <main className="mx-auto flex max-w-[1000px] flex-col gap-8 px-6 py-12">
      <section className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#b26d39]">Live Rankings</p>
        <h1 className="mt-4 text-4xl font-bold text-[#2f241c] sm:text-5xl">{liveTest.title}</h1>
        <p className="mt-4 text-lg text-[#6d5a49]">Real-time leaderboard for the ongoing challenge.</p>
      </section>

      <RealtimeLeaderboard 
        liveTestId={id} 
        initialEntries={initialEntries} 
        currentStudentId={student?.id}
        totalMarks={totalMarks}
      />
    </main>
  );
}
