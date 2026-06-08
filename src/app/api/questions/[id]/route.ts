import { NextResponse } from "next/server";
import { getQuestionDetails } from "@/lib/data";
import { getCurrentStudent } from "@/lib/student-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const student = await getCurrentStudent();
    if (!student) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const question = await getQuestionDetails(id);

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    return NextResponse.json(question);
  } catch (error) {
    console.error("Failed to fetch question:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
