'use client';

import dynamic from "next/dynamic";

// Load map only in the browser (allowed now because this page is a Client Component)
const HotspotMap = dynamic(() => import("@/components/HotspotMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[460px] rounded-2xl border border-[var(--border)] shadow-soft grid place-items-center">
      <span className="text-[var(--muted)] text-sm">Loading map…</span>
    </div>
  ),
});

export default function HotspotPage() {
  return (
    <main className="min-h-screen py-8">
      <div className="mx-auto max-w-6xl px-4 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text)]">Hotspot Explorer</h1>
          <p className="text-[var(--muted)]">Pick a place on the map and fetch live air quality.</p>
        </header>
        <HotspotMap />
      </div>
    </main>
  );
}
