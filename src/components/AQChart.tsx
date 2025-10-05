"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";

type Point = { t: string; overall: number | null; pm25: number | null; o3: number | null; no2: number | null; co: number | null };
type SeriesResp = { source?: string; series?: Point[]; error?: string };

export default function AQChart({ lat, lng, hours = 48 }: { lat: number; lng: number; hours?: number }) {
  const [data, setData] = useState<Point[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [show, setShow] = useState({ overall: true, pm25: true, o3: false, no2: false, co: false });

  useEffect(() => {
    let mounted = true;
    setData(null); setErr(null);
    const q = new URLSearchParams({ lat: String(lat), lng: String(lng), hours: String(hours) });
    fetch(`/api/aq/series?${q.toString()}`, { cache: "no-store" })
      .then(r => r.json())
      .then((j: SeriesResp) => {
        if (!mounted) return;
        if (j.error) setErr(j.error);
        else setData(j.series ?? []);
      })
      .catch(() => mounted && setErr("Failed to load series."));
    return () => { mounted = false; };
  }, [lat, lng, hours]);

  const controls = (
    <div className="flex flex-wrap gap-3 text-xs">
      {["overall","pm25","o3","no2","co"].map(k => (
        <label key={k} className="inline-flex items-center gap-1">
          <input
            type="checkbox"
            checked={(show as any)[k]}
            onChange={(e) => setShow(s => ({ ...s, [k]: e.target.checked }))}
          />
          {k.toUpperCase()}
        </label>
      ))}
    </div>
  );

  if (err) return <div className="text-sm text-red-600">{err}</div>;
  if (!data) return <div className="text-sm text-[var(--muted)]">Loading chart…</div>;
  if (data.length === 0) return <div className="text-sm text-[var(--muted)]">No series available for this point.</div>;

  return (
    <div className="space-y-2">
      {controls}
      <div className="w-full h-64">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              tickFormatter={(v) => new Date(v).toLocaleString(undefined, { hour: "2-digit", day: "2-digit", month: "short" })}
              tick={{ fontSize: 11 }}
              minTickGap={20}
            />
            <YAxis domain={[0, 500]} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(val: any) => (val === null || val === undefined ? "—" : val)}
              labelFormatter={(v) => new Date(v).toLocaleString()}
            />
            <Legend />
            {show.overall && <Line type="monotone" dataKey="overall" dot={false} strokeWidth={2} />}
            {show.pm25   && <Line type="monotone" dataKey="pm25"   dot={false} />}
            {show.o3     && <Line type="monotone" dataKey="o3"     dot={false} />}
            {show.no2    && <Line type="monotone" dataKey="no2"    dot={false} />}
            {show.co     && <Line type="monotone" dataKey="co"     dot={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="text-[10px] text-[var(--muted)]">
        AQI (0–500). “Overall” is max of sub-indices at each hour. Source: Open-Meteo hourly air quality (converted to US AQI).
      </div>
    </div>
  );
}
