import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format-date-time";
import { LiveTestForm } from "@/components/admin/live-test-form";

export default async function AdminLiveTestsPage() {
  const admin = await getCurrentAdmin();
  if (!admin) return <div>Unauthorized</div>;

  const [liveTests, testTemplates] = await Promise.all([
    prisma.liveTest.findMany({
      orderBy: { startTime: "desc" },
      include: {
        _count: { select: { attempts: true } },
        testTemplate: { select: { name: true } },
      },
    }),
    prisma.test.findMany({
      where: { published: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-8">
      <section className="panel rounded-[1.5rem] p-8">
        <h1 className="text-3xl font-bold text-[#2f241c]">Manage Live Competitive Tests</h1>
        <p className="mt-2 text-[#6d5a49]">Schedule and monitor real-time challenges for all students.</p>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
        <section className="panel rounded-[1.3rem] p-6 h-fit">
          <h2 className="text-xl font-bold text-[#2f241c] mb-6">Schedule New Test</h2>
          <LiveTestForm testTemplates={testTemplates} />
        </section>

        <section className="panel rounded-[1.3rem] p-6">
          <h2 className="text-xl font-bold text-[#2f241c] mb-6">Existing Schedules</h2>
          <div className="overflow-hidden rounded-xl border border-[#e6d9cb]">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-[#fcfbf8] text-[#8a6a52]">
                <tr>
                  <th className="px-4 py-3 font-bold">Title</th>
                  <th className="px-4 py-3 font-bold">Starts At</th>
                  <th className="px-4 py-3 font-bold">Duration</th>
                  <th className="px-4 py-3 font-bold text-center">Joined</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee3d7]">
                {liveTests.map((test) => (
                  <tr key={test.id} className="hover:bg-[#fcfbf8]">
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#2f241c]">{test.title}</div>
                      <div className="text-[0.65rem] uppercase tracking-wider text-[#8a6a52]">{test.testTemplate.name}</div>
                    </td>
                    <td className="px-4 py-3 text-[#6d5a49]">{formatDateTime(test.startTime)}</td>
                    <td className="px-4 py-3 text-[#6d5a49]">{test.durationMinutes}m</td>
                    <td className="px-4 py-3 text-center text-[#6d5a49]">{test._count.attempts}</td>
                    <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${getStatusColor(test.status)}`}>
                            {test.status}
                        </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function getStatusColor(status: string) {
    switch (status) {
        case "SCHEDULED": return "bg-blue-50 text-blue-700 ring-blue-200";
        case "LIVE": return "bg-red-50 text-red-700 ring-red-200";
        case "COMPLETED": return "bg-green-50 text-green-700 ring-green-200";
        default: return "bg-gray-50 text-gray-700 ring-gray-200";
    }
}
