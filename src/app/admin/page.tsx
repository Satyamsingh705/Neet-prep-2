import Link from "next/link";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { AdminDownloadJson } from "@/components/admin/admin-download-json";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { getDashboardData } from "@/lib/data";
import { formatDateTime } from "@/lib/format-date-time";

export default async function AdminDashboardPage() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return (
      <main className="mx-auto flex max-w-[720px] flex-col gap-6 px-6 py-10">
        <section className="panel rounded-[1.5rem] p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#b26d39]">Admin Access</p>
          <h1 className="mt-3 text-4xl font-semibold text-[#2f241c]">Sign in to manage tests, students, and results.</h1>
          <p className="mt-4 text-lg leading-8 text-[#65584a]">Default admin credentials are pre-seeded for local use: admin ID admin and password admin123.</p>
          <AdminLoginForm />
        </section>
      </main>
    );
  }

  const dashboard = await getDashboardData();

  return (
    <main className="mx-auto grid max-w-[1400px] gap-6 px-6 py-8 lg:grid-cols-[1fr_1fr]">
      <section className="panel rounded-[1.4rem] p-7">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#b26d39]">Admin command center</p>
        <h1 className="mt-3 text-4xl font-semibold text-[#2f241c]">Question intake, test generation, and result monitoring.</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[#65584a]">
          Use bulk uploads for text, image, and PDF page questions. Configure either a fixed NEET pattern or smaller chapter-based drills with your own timer and marking values.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link href="/admin/questions" className="btn-primary">Manage Question Bank</Link>
          <Link href="/admin/tests" className="btn-secondary">Create Mock Test</Link>
          <Link href="/admin/live-tests" className="btn-secondary">Live Competitive Tests</Link>
          <Link href="/admin/results" className="btn-secondary">View Submitted Results</Link>
          <Link href="/admin/students" className="btn-secondary">Manage Student Access</Link>
          <a href="#download-json" className="btn-secondary">Download JSON</a>
          <Link href="/admin/modify-answers" className="btn-secondary">Modify Answers</Link>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        {dashboard.questions.map((group) => (
          <div key={`${group.subject}`} className="panel rounded-[1.2rem] p-5">
            <div className="text-sm uppercase tracking-[0.25em] text-[#8d715c]">{group.subject}</div>
            <div className="mt-2 text-4xl font-semibold text-[#d7671b]">{group._count._all}</div>
            <div className="mt-2 text-sm text-[#6d5a49]">Questions available for random test assembly.</div>
          </div>
        ))}
      </section>

      <section className="panel rounded-[1.4rem] p-6 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-[#2f241c]">Tests</h2>
          <Link href="/admin/tests" className="text-sm font-semibold text-[#d7671b]">Open builder</Link>
        </div>
        <div className="mt-5 grid max-h-[540px] gap-4 overflow-y-auto md:grid-cols-2 xl:grid-cols-3">
          {dashboard.tests.map((test) => (
            <div key={test.id} className="rounded-[1rem] border border-[#e4d7c7] bg-[#fffdfa] p-5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-[#2f241c]">{test.name}</h3>
                <span className="rounded-full bg-[#f5e1d0] px-3 py-1 text-xs font-semibold text-[#b76428]">{test.mode}</span>
              </div>
              <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6a52]">{test.testCode ?? `TST-${test.id.slice(-8).toUpperCase()}`}</div>
              <div className="mt-3 text-sm leading-6 text-[#65584a]">{test.totalQuestions} questions · {test.durationMinutes} min · {test._count.attempts} attempts</div>
              <div className="mt-5 flex gap-3">
                <Link href={`/tests/${test.id}/instructions`} className="btn-primary">Preview flow</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div id="download-json" className="lg:col-span-2">
        <AdminDownloadJson tests={dashboard.tests} />
      </div>



      <section className="panel rounded-[1.4rem] p-6 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-[#2f241c]">Recent Submitted Attempts</h2>
          <Link href="/admin/results" className="text-sm font-semibold text-[#d7671b]">Open all results</Link>
        </div>
        <div className="mt-5 max-h-[520px] overflow-y-auto rounded-[1rem] border border-[#e6d9cb]">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#f7efe6] text-[#7a5f4c]">
              <tr>
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Test</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Started</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.attempts.filter((attempt) => attempt.status !== "IN_PROGRESS").map((attempt) => (
                <tr key={attempt.id} className="border-t border-[#eee3d7] bg-white">
                  <td className="px-4 py-3 font-medium text-[#2f241c]">{attempt.studentName ?? attempt.id.slice(-6)}</td>
                  <td className="px-4 py-3 text-[#65584a]">
                    <div className="font-medium text-[#2f241c]">{attempt.test.name}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[#8a6a52]">{attempt.test.testCode ?? `TST-${attempt.test.id.slice(-8).toUpperCase()}`}</div>
                  </td>
                  <td className="px-4 py-3 text-[#65584a]">{attempt.status}</td>
                  <td className="px-4 py-3 text-[#65584a]">{formatDateTime(attempt.startedAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/results/${attempt.id}`} className="text-sm font-semibold text-[#d7671b]">View analysis</Link>
                  </td>
                </tr>
              ))}
              {dashboard.attempts.filter((attempt) => attempt.status !== "IN_PROGRESS").length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-[#736455]">
                    No submitted attempts yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
