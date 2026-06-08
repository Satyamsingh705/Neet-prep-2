import { AdminStudentManager } from "@/components/admin/admin-student-manager";
import { requireCurrentAdmin } from "@/lib/admin-auth";
import { getStudentsForAdmin } from "@/lib/data";

export default async function AdminStudentsPage() {
  await requireCurrentAdmin();
  const students = await getStudentsForAdmin();

  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-6 px-6 py-8">
      <section className="panel rounded-[1.4rem] p-7">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#b26d39]">Student Access</p>
        <h1 className="mt-3 text-4xl font-semibold text-[#2f241c]">Create and manage student login accounts.</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-[#65584a]">Manage who can sign in to the student portal. Passwords are stored in encrypted form, and deleting a student permanently removes that account together with its saved attempts and results.</p>
      </section>
      <AdminStudentManager students={students} />
    </main>
  );
}