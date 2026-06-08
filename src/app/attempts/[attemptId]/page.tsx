import { notFound, redirect } from "next/navigation";
import { ExamClient } from "@/components/exam/exam-client";
import { getAttemptData } from "@/lib/data";
import { requireCurrentStudent } from "@/lib/student-auth";

export const preferredRegion = "bom1";

export default async function AttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const student = await requireCurrentStudent();
  const { attemptId } = await params;
  const data = await getAttemptData(attemptId, student.id);

  if (!data) {
    notFound();
  }

  if (data.attempt.status !== "IN_PROGRESS") {
    redirect(`/attempts/${attemptId}/result`);
  }

  return (
    <ExamClient
      attemptId={data.attempt.id}
      studentName={student.displayName ?? student.username}
      test={{
        id: data.test.id,
        testCode: data.test.testCode,
        name: data.test.name,
        durationMinutes: data.test.durationMinutes,
        totalQuestions: data.test.totalQuestions,
        mode: data.test.mode,
      }}
      initialAnswers={data.answers}
      initialCurrentQuestionIndex={data.attempt.currentQuestionIndex}
      questions={data.questions}
      startedAt={data.attempt.startedAt.toISOString()}
      initialTabSwitchCount={data.attempt.tabSwitchCount}
      initialTotalTimeSpentSeconds={data.attempt.totalTimeSpentSeconds}
    />
  );
}
