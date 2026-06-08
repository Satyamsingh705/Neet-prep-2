"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { startLiveAttempt, persistLiveAttempt, submitLiveAttempt } from "@/lib/data";
import { getCurrentStudent } from "@/lib/student-auth";
import { StoredAnswersMap } from "@/lib/types";

export async function startLiveAttemptAction(liveTestId: string) {
  const student = await getCurrentStudent();
  if (!student) throw new Error("Unauthorized");

  const attempt = await startLiveAttempt(liveTestId, {
    id: student.id,
    username: student.username,
    displayName: student.displayName,
  });

  revalidatePath(`/live-tests/${liveTestId}`);
  return attempt;
}

export async function persistLiveAttemptAction(params: {
  attemptId: string;
  answers: StoredAnswersMap;
  timeConsumedSeconds: number;
}) {
  const student = await getCurrentStudent();
  if (!student) throw new Error("Unauthorized");

  return persistLiveAttempt({
    ...params,
    studentId: student.id,
  });
}

export async function submitLiveAttemptAction(attemptId: string) {
  const student = await getCurrentStudent();
  if (!student) throw new Error("Unauthorized");

  const result = await submitLiveAttempt(attemptId, student.id);
  revalidatePath("/results");
  return result;
}

export async function registerForBattleAction(liveTestId: string) {
  const student = await getCurrentStudent();
  if (!student) throw new Error("Unauthorized");

  try {
    const registration = await prisma.$transaction(async (tx) => {
      const existing = await tx.battleRegistration.findUnique({
        where: { liveTestId_studentId: { liveTestId, studentId: student.id } },
      });

      if (existing) return existing;

      const reg = await tx.battleRegistration.create({
        data: {
          liveTestId,
          studentId: student.id,
          studentName: student.displayName ?? student.username,
        },
      });

      await tx.liveTest.update({
        where: { id: liveTestId },
        data: { registeredCount: { increment: 1 } },
      });

      return reg;
    });

    revalidatePath("/live-arena");
    return { success: true, registration };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Failed to register" };
  }
}

export async function unregisterFromBattleAction(liveTestId: string) {
  const student = await getCurrentStudent();
  if (!student) throw new Error("Unauthorized");

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.battleRegistration.findUnique({
        where: { liveTestId_studentId: { liveTestId, studentId: student.id } },
      });

      if (!existing) return;

      await tx.battleRegistration.delete({
        where: { id: existing.id },
      });

      await tx.liveTest.update({
        where: { id: liveTestId },
        data: { registeredCount: { decrement: 1 } },
      });
    });

    revalidatePath("/live-arena");
    return { success: true };
  } catch (error) {
    console.error("Unregistration error:", error);
    return { error: "Failed to unregister" };
  }
}
