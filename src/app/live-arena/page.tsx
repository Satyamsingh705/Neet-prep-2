import { requireCurrentStudent } from "@/lib/student-auth";
import { getLiveArenaData } from "@/lib/data";
import { LiveArenaClient } from "@/components/live/live-arena-client";

export default async function LiveArenaPage() {
  const student = await requireCurrentStudent();
  const data = await getLiveArenaData(student.id);

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <LiveArenaClient 
        initialTests={data.liveTests} 
        studentName={student.displayName ?? student.username}
        stats={data.stats}
      />
    </main>
  );
}
