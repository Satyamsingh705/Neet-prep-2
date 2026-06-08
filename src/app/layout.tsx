import type { Metadata } from "next";
import { AppChrome } from "@/components/app-chrome";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "NEET Mock Platform",
  description: "Admin-managed NEET-style mock test platform with JSON, ZIP, and PDF uploads.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="app-shell">
          <AppChrome />
          {children}
        </div>
      </body>
    </html>
  );
}
