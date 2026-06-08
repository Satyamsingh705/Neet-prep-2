"use client";

import { LiveUpdateListener } from "@/components/live-update-listener";
import { SiteHeader } from "@/components/site-header";

export function AppChrome() {
  return (
    <>
      <LiveUpdateListener />
      <SiteHeader />
    </>
  );
}