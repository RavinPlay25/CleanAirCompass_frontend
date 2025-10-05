import "./globals.css";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CleanAir Compass",
  description: "Eco-friendly, healthy travel analytics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Top nav */}
        <div className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-[var(--border)]">
          <div className="mx-auto max-w-6xl px-4 h-12 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span>🌿</span><b>CleanAir Compass</b>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link href="/" className="hover:underline">Home</Link>
              <Link href="/hotspot" className="hover:underline">Hotspot</Link>
              <Link href="/predictor" className="hover:underline">Predictor</Link>
            </nav>
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
