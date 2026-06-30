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
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="flex w-full h-[56px] items-center justify-between px-4 sm:px-[1.5%] xl:px-[2%]">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2 font-serif text-[#6b4f3f] text-2xl tracking-wide">
            NEETPrep
          </Link>
          <nav className="hidden md:flex items-center gap-2">
            {links.map((link) => (
              <Link 
                key={link.href} 
                href={link.href} 
                className={`px-4 py-2 text-lg font-serif transition-colors ${
                  pathname === link.href 
                    ? "text-[#6b4f3f]" 
                    : "text-[#6b4f3f]/80 hover:text-[#6b4f3f]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

          <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-3">
            {isAdminRoute ? <AdminHeaderGreeting /> : null}
            {isStudentRoute ? <StudentHeaderGreeting /> : null}
          </div>
          <div className="h-5 w-px bg-slate-200" />
          {isAdminRoute ? <AdminLogoutButton /> : null}
          {isStudentRoute ? <StudentLogoutButton /> : null}
        </div>

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 md:hidden"
          onClick={() => setMenuOpen((current) => !current)}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white p-4 space-y-4">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <Link 
                key={link.href} 
                href={link.href} 
                onClick={() => setMenuOpen(false)}
                className={`px-3 py-2 text-lg font-serif ${
                  pathname === link.href ? "text-[#6b4f3f]" : "text-[#6b4f3f]/80"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="pt-4 border-t border-slate-100 space-y-3">
            {isAdminRoute ? <AdminHeaderGreeting /> : null}
            {isStudentRoute ? <StudentHeaderGreeting /> : null}
            <div className="flex flex-col gap-2">
              {isAdminRoute ? <AdminLogoutButton /> : null}
              {isStudentRoute ? <StudentLogoutButton /> : null}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);