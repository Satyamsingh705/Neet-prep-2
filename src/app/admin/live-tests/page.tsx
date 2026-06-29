import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma, withRetry } from "@/lib/prisma";
import { LiveTestForm } from "@/components/admin/live-test-form";
import { AdminLiveTestsManager } from "@/components/admin/admin-live-tests-manager";

export default async function AdminLiveTestsPage() {
  const admin = await getCurrentAdmin();
  if (!admin) return <div>Unauthorized</div>;

  let liveTests: {
    id: string;
    title: string;
    startTime: Date;
    durationMinutes: number;
    status: string;
    _count: { attempts: number };
    testTemplate: { name: string };
    [key: string]: unknown;
  }[] = [];
  let testTemplates: { id: string; name: string }[] = [];

  try {
    [liveTests, testTemplates] = await Promise.all([
      withRetry(() =>
        prisma.liveTest.findMany({
          orderBy: { startTime: "desc" },
          include: {
            _count: { select: { attempts: true } },
            testTemplate: { select: { name: true } },
          },
        })
      ),
      withRetry(() =>
        prisma.test.findMany({
          where: { published: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      ),
    ]);
  } catch (error) {
    console.error("[admin/live-tests] Failed to load data:", error);
    // Fall through with empty arrays — page will render with empty state
  }

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
          <AdminLiveTestsManager tests={liveTests} />
        </section>
      </div>
    </main>
  );
}

