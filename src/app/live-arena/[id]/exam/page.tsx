import { notFound, redirect } from "next/navigation";
import { getLiveTestData } from "@/lib/data";
import { requireCurrentStudent } from "@/lib/student-auth";
import { LiveExamClient } from "@/components/live/live-exam-client";

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

  return (
    <LiveExamClient
      attemptId={attempt.id}
      liveTestId={id}
      studentName={student.displayName ?? student.username}
      title={liveTest.title}
      endTime={liveTest.endTime.toISOString()}
      questions={questions}
      initialAnswers={attempt.answers as any}
      initialTimeConsumed={attempt.timeConsumedSeconds}
    />
  );
}
