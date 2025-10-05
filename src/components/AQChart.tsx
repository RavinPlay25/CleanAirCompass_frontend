"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

type Props = { lat: number; lng: number };

type Point = { t: string; pm25?: number; o3?: number; no2?: number; co?: number };

// ---------- AQI math (same logic as your API) ----------
type Bp = { cLo: number; cHi: number; iLo: number; iHi: number };
const R = 24.45;

const PM25: Bp[] = [
  { cLo: 0.0, cHi: 12.0, iLo: 0, iHi: 50 },
  { cLo: 12.1, cHi: 35.4, iLo: 51, iHi: 100 },
  { cLo: 35.5, cHi: 55.4, iLo: 101, iHi: 150 },
  { cLo: 55.5, cHi: 150.4, iLo: 151, iHi: 200 },
  { cLo: 150.5, cHi: 250.4, iLo: 201, iHi: 300 },
  { cLo: 250.5, cHi: 500.4, iLo: 301, iHi: 500 },
];
const O3_8H_PPb: Bp[] = [
  { cLo: 0, cHi: 54, iLo: 0, iHi: 50 },
  { cLo: 55, cHi: 70, iLo: 51, iHi: 100 },
  { cLo: 71, cHi: 85, iLo: 101, iHi: 150 },
  { cLo: 86, cHi: 105, iLo: 151, iHi: 200 },
  { cLo: 106, cHi: 200, iLo: 201, iHi: 300 },
  { cLo: 201, cHi: 604, iLo: 301, iHi: 500 },
];
const NO2_1H_PPb: Bp[] = [
  { cLo: 0, cHi: 53, iLo: 0, iHi: 50 },
  { cLo: 54, cHi: 100, iLo: 51, iHi: 100 },
  { cLo: 101, cHi: 360, iLo: 101, iHi: 150 },
  { cLo: 361, cHi: 649, iLo: 151, iHi: 200 },
  { cLo: 650, cHi: 1249, iLo: 201, iHi: 300 },
  { cLo: 1250, cHi: 2049, iLo: 301, iHi: 500 },
];
const CO_8H_PPM: Bp[] = [
  { cLo: 0.0, cHi: 4.4,  iLo: 0,   iHi: 50 },
  { cLo: 4.5, cHi: 9.4,  iLo: 51,  iHi: 100 },
  { cLo: 9.5, cHi: 12.4, iLo: 101, iHi: 150 },
  { cLo: 12.5,cHi: 15.4, iLo: 151, iHi: 200 },
  { cLo: 15.5,cHi: 30.4, iLo: 201, iHi: 300 },
  { cLo: 30.5,cHi: 50.4, iLo: 301, iHi: 500 },
];

function linearAQI(c: number, bps: Bp[]) {
  for (const bp of bps) {
    if (c >= bp.cLo && c <= bp.cHi) {
      return ((bp.iHi - bp.iLo) / (bp.cHi - bp.cLo)) * (c - bp.cLo) + bp.iLo;
    }
  }
  return undefined;
}

export default function AQChart({ lat, lng }: Props) {
  const [data, setData] = useState<Point[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const qs = useMemo(() => `latitude=${lat}&longitude=${lng}&hourly=pm2_5,carbon_monoxide,nitrogen_dioxide,ozone&timezone=UTC`, [lat, lng]);

  useEffect(() => {
    let alive = true;

    async function run() {
      setErr(null);
      setData(null);
      try {
        const r = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${qs}`, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();

        const times: string[] = j?.hourly?.time ?? [];
        const pm25_ug: number[] = j?.hourly?.pm2_5 ?? [];
        const no2_ug:  number[] = j?.hourly?.nitrogen_dioxide ?? [];
        const o3_ug:   number[] = j?.hourly?.ozone ?? [];
        const co_mg:   number[] = j?.hourly?.carbon_monoxide ?? [];

        const points: Point[] = [];
        const n = Math.min(times.length, 60); // ~last 60 hours
        for (let i = times.length - n; i < times.length; i++) {
          if (i < 0) continue;
          const t = times[i];

          // normalize
          const pm25 = pm25_ug?.[i];
          const no2_ppb = no2_ug?.[i] != null ? (no2_ug[i] * R) / 46.0055 : undefined;
          const o3_ppb  = o3_ug?.[i]  != null ? (o3_ug[i]  * R) / 48      : undefined;
          const co_ppm  = co_mg?.[i]  != null ? (co_mg[i]  * R) / 28.01   : undefined;

          // to sub-index
          const p: Point = { t };
          if (pm25 != null) p.pm25 = Math.round(linearAQI(pm25, PM25) ?? 0);
          if (o3_ppb != null) p.o3 = Math.round(linearAQI(o3_ppb, O3_8H_PPb) ?? 0);
          if (no2_ppb != null) p.no2 = Math.round(linearAQI(no2_ppb, NO2_1H_PPb) ?? 0);
          if (co_ppm != null) p.co = Math.round(linearAQI(co_ppm, CO_8H_PPM) ?? 0);

          points.push(p);
        }

        if (alive) setData(points);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load trend data");
      }
    }
    run();
    return () => { alive = false; };
  }, [qs]);

  if (err) {
    return <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-lg p-3">Trend error: {err}</div>;
  }
  if (!data) {
    return <div className="text-sm text-[var(--muted)] border rounded-lg p-3">Loading trend…</div>;
  }
  if (data.length === 0) {
    return <div className="text-sm text-[var(--muted)] border rounded-lg p-3">No recent data.</div>;
  }

  // compact HH:mm labels
  const tickFmt = (iso: string) => {
    const d = new Date(iso);
    return d.toISOString().slice(11, 16); // HH:MM
  };

  return (
    <div className="w-full h-64 rounded-xl border border-[var(--border)]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 18, bottom: 8, left: 6 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="t" tickFormatter={tickFmt} minTickGap={20} />
          <YAxis domain={[0, 200]} tickCount={5} />
          <Tooltip
            labelFormatter={(x) => new Date(x as string).toLocaleString()}
            formatter={(v: any, name) => [v, name.toUpperCase()]}
          />
          <Legend />
          <Line type="monotone" dataKey="pm25" name="PM2.5" stroke="#16a34a" dot={false} />
          <Line type="monotone" dataKey="no2"  name="NO₂"  stroke="#2563eb" dot={false} />
          <Line type="monotone" dataKey="o3"   name="O₃"   stroke="#f59e0b" dot={false} />
          <Line type="monotone" dataKey="co"   name="CO"   stroke="#ef4444" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
