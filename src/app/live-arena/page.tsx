import { requireCurrentStudent } from "@/lib/student-auth";
import { getLiveArenaData } from "@/lib/data";
import { LiveArenaClient } from "@/components/live/live-arena-client";

export default async function LiveArenaPage() {
  const student = await requireCurrentStudent();
  const data = await getLiveArenaData(student.id);

  return (
    <main className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-10 py-10 bg-slate-50 min-h-screen">
      <LiveArenaClient 
        initialTests={data.liveTests} 
        studentName={student.displayName ?? student.username}
        stats={data.stats}
      />
    </main>
  );
}
