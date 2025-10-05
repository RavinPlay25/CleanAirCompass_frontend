"use client";

import { useMemo, useState } from "react";
import AQNumberLine from "@/components/AQNumberLine";

const COLORS: Record<string, string> = {
  Good: "#2ECC71",
  Moderate: "#F1C40F",
  "Unhealthy for Sensitive Groups": "#E67E22",
  Unhealthy: "#E74C3C",
  "Very Unhealthy": "#8E44AD",
  Hazardous: "#7D3C98",
};

function category(aqi: number) {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}
function tip(cat: string) {
  const m: Record<string, string> = {
    Good: "Air quality is satisfactory—enjoy outdoor activities.",
    Moderate: "Unusually sensitive people should limit prolonged outdoor exertion.",
    "Unhealthy for Sensitive Groups": "Sensitive groups reduce activity; consider a mask.",
    Unhealthy: "Everyone limit outdoor exertion; mask recommended.",
    "Very Unhealthy": "Avoid outdoor activity; use high-quality masks.",
    Hazardous: "Stay indoors; use purifiers; follow local guidance.",
  };
  return m[cat] ?? "Check local guidance.";
}

export default function ManualPredictor() {
  // Sub-index inputs (0–500). These are AQI *sub-indices*, not raw µg/m³ or ppb.
  const [co, setCO] = useState<number>(20);
  const [o3, setO3] = useState<number>(30);
  const [no2, setNO2] = useState<number>(25);
  const [pm25, setPM25] = useState<number>(35);

  // Location (for later – your Python model if you want to call it)
  const [lat, setLat] = useState<number>(6.9271);
  const [lng, setLng] = useState<number>(79.8612);

  const overall = useMemo(() => {
    const arr = [co, o3, no2, pm25].map((v) => (Number.isFinite(v) ? v : 0));
    return Math.max(...arr);
  }, [co, o3, no2, pm25]);

  const cat = useMemo(() => category(overall), [overall]);
  const color = COLORS[cat] ?? "#374151";

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white rounded-2xl border border-[var(--border)] shadow-soft">
      <h2 className="text-xl font-semibold">Manual Predictor</h2>
      <p className="text-sm text-[var(--muted)] mt-1">
        Enter AQI <b>sub-indices</b> for PM2.5, O₃, NO₂, and CO. (This demo computes overall AQI as the <b>maximum</b> of the sub-indices.)
      </p>

      {/* Inputs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
        <label className="text-sm">
          CO AQI
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={500}
            className="mt-1 w-full border rounded-lg px-2 py-1"
            value={co}
            onChange={(e) => setCO(Number(e.target.value || 0))}
          />
        </label>
        <label className="text-sm">
          Ozone AQI
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={500}
            className="mt-1 w-full border rounded-lg px-2 py-1"
            value={o3}
            onChange={(e) => setO3(Number(e.target.value || 0))}
          />
        </label>
        <label className="text-sm">
          NO₂ AQI
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={500}
            className="mt-1 w-full border rounded-lg px-2 py-1"
            value={no2}
            onChange={(e) => setNO2(Number(e.target.value || 0))}
          />
        </label>
        <label className="text-sm">
          PM2.5 AQI
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={500}
            className="mt-1 w-full border rounded-lg px-2 py-1"
            value={pm25}
            onChange={(e) => setPM25(Number(e.target.value || 0))}
          />
        </label>
        <label className="text-sm">
          Lat
          <input
            type="number"
            step="0.001"
            className="mt-1 w-full border rounded-lg px-2 py-1"
            value={lat}
            onChange={(e) => setLat(Number(e.target.value || 0))}
          />
        </label>
        <label className="text-sm">
          Lng
          <input
            type="number"
            step="0.001"
            className="mt-1 w-full border rounded-lg px-2 py-1"
            value={lng}
            onChange={(e) => setLng(Number(e.target.value || 0))}
          />
        </label>
      </div>

      {/* Result chip */}
      <div
        className="mt-4 p-4 rounded-xl text-white flex items-center justify-between"
        style={{ background: color }}
      >
        <div className="font-semibold">
          Predicted Category: {cat}
        </div>
        <div className="text-sm opacity-95">
          Overall AQI (max sub-index): <b>{Math.round(overall)}</b>
        </div>
      </div>

      {/* Guidance */}
      <div className="mt-3 text-sm bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
        {tip(cat)}
      </div>

      {/* AQ Number Line Gauge */}
      <div className="mt-4 p-3 pt-4 rounded-xl border border-[var(--border)] bg-white">
        <AQNumberLine
          value={overall}
          sub={{ pm25, o3, no2, co }}
          height={110}
          needlePosition="below"
        />
      </div>

      {/* Footer note */}
      <div className="mt-2 text-xs text-[var(--muted)]">
        Later you can replace this simple “max sub-index” logic with the category returned by your Python model API.
      </div>
    </div>
  );
}
