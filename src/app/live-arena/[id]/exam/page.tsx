import { notFound, redirect } from "next/navigation";
import { getLiveTestData } from "@/lib/data";
import { requireCurrentStudent } from "@/lib/student-auth";
import { ExamClient } from "@/components/exam/exam-client";

export default async function LiveExamPage({ params }: { params: Promise<{ id: string }> }) {
  const student = await requireCurrentStudent();
  const { id } = await params;
  const data = await getLiveTestData(id, student.id);

  if (!data) {
    notFound();
  }

  const { liveTest, questions, attempt } = data;
  const now = new Date();

  if (now < liveTest.startTime) {
    redirect(`/live-arena/${id}`);
  }

  if (now > liveTest.endTime || (attempt && attempt.status !== "IN_PROGRESS")) {
    redirect(`/live-arena/${id}/leaderboard`);
  }

  if (!attempt) {
      redirect(`/live-arena/${id}`);
  }

  const remainingMs = Math.max(0, liveTest.endTime.getTime() - now.getTime());
  const durationMinutes = Math.max(1, Math.ceil(remainingMs / 60000));

  const test = {
    id: liveTest.id,
    testCode: liveTest.code ?? null,
    name: liveTest.title,
    durationMinutes,
    totalQuestions: questions.length,
    mode: "LIVE",
  };

  return (
    <ExamClient
      attemptId={attempt.id}
      studentName={student.displayName ?? student.username}
      test={test}
      initialAnswers={attempt.answers as any}
      initialCurrentQuestionIndex={1}
      questions={questions}
      startedAt={attempt.startedAt?.toISOString?.() ?? new Date().toISOString()}
      initialTabSwitchCount={0}
      initialTotalTimeSpentSeconds={attempt.timeConsumedSeconds ?? 0}
    />
  );
}
