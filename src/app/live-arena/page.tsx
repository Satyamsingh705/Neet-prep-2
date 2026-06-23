import { requireCurrentStudent } from "@/lib/student-auth";
import { getLiveArenaData } from "@/lib/data";
import { LiveArenaClient } from "@/components/live/live-arena-client";

// ISOLATION: This page shows ONLY arena/competitive tests (LiveTest table)
// Regular tests (Test table) are NOT shown here
// Regular tests are shown in /sections/* pages

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
