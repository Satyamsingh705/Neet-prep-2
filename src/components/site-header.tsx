"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AdminHeaderGreeting } from "@/components/admin/admin-header-greeting";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { StudentHeaderGreeting } from "@/components/student/student-header-greeting";
import { StudentLogoutButton } from "@/components/student/student-logout-button";

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdminRoute = pathname.startsWith("/admin");
  const isStudentRoute = !isAdminRoute;

  if (pathname.startsWith("/attempts/") || pathname.includes("/live-arena/") && pathname.endsWith("/exam")) {
    return null;
  }

  const links = isAdminRoute
    ? [
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/live-tests", label: "Live Arena" },
        { href: "/admin/students", label: "Students" },
        { href: "/admin/results", label: "Results" },
      ]
    : [
        { href: "/", label: "Home" },
        { href: "/live-arena", label: "Live Arena" },
        { href: "/results", label: "Results" },
      ];

  return (
    <header className="sticky top-0 z-30 border-b border-[#d9cfc3] bg-[rgba(249,246,241,0.97)] backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-col px-0 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-4 px-3 sm:px-0">
          <div className="flex min-w-0 items-center gap-4 text-[1rem] text-[#6d5c4d] sm:gap-10 sm:text-[1.1rem]">
            <Link href="/" className="truncate font-semibold text-[#17a765]">
              NEET Practice Platform
            </Link>
            <nav className="hidden items-center gap-6 md:flex">
              {links.map((link) => (
                <Link key={link.href} href={link.href} className={pathname === link.href ? "font-semibold text-[#2f241c]" : undefined}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            {isAdminRoute ? <AdminHeaderGreeting /> : null}
            {isAdminRoute ? <AdminLogoutButton /> : null}
            {isStudentRoute ? <StudentHeaderGreeting /> : null}
            {isStudentRoute ? <StudentLogoutButton /> : null}
          </div>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#dacdbf] bg-white text-[#3b3128] md:hidden"
            onClick={() => setMenuOpen((current) => !current)}
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
          >
            <span className="text-xl leading-none">{menuOpen ? "×" : "≡"}</span>
          </button>
        </div>

        {menuOpen ? (
          <div className="mt-3 mx-3 rounded-[1.2rem] border border-[#e3d6c8] bg-white/95 p-4 shadow-[0_18px_50px_rgba(79,52,26,0.08)] sm:mx-0 md:hidden">
            <nav className="flex flex-col gap-2 text-[0.98rem] text-[#4f4338]">
              {links.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className={`rounded-lg px-3 py-2 ${pathname === link.href ? "bg-[#fff2e5] font-semibold text-[#d7671b]" : "bg-transparent"}`}>
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-4 flex flex-col gap-3">
              {isAdminRoute ? <AdminHeaderGreeting /> : null}
              {isAdminRoute ? <AdminLogoutButton /> : null}
              {isStudentRoute ? <StudentHeaderGreeting /> : null}
              {isStudentRoute ? <StudentLogoutButton /> : null}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}