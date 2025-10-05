'use client';

import { useMemo, useState } from "react";

const COLORS: Record<string,string> = {
  Good:"#2ECC71", Moderate:"#F1C40F",
  "Unhealthy for Sensitive Groups":"#E67E22",
  Unhealthy:"#E74C3C", "Very Unhealthy":"#8E44AD", Hazardous:"#7D3C98",
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
  const m: Record<string,string> = {
    Good:"Air quality is satisfactory—enjoy outdoor activities.",
    Moderate:"Unusually sensitive people should limit prolonged outdoor exertion.",
    "Unhealthy for Sensitive Groups":"Sensitive groups reduce activity; consider a mask.",
    Unhealthy:"Everyone limit outdoor exertion; mask recommended.",
    "Very Unhealthy":"Avoid outdoor activity; use high-quality masks.",
    Hazardous:"Stay indoors; use purifiers; follow local guidance.",
  };
  return m[cat] ?? "Check local guidance.";
}

export default function ManualPredictor() {
  const [co, setCO] = useState(20);
  const [o3, setO3] = useState(30);
  const [no2, setNO2] = useState(25);
  const [pm25, setPM25] = useState(35);
  const [lat, setLat] = useState(6.9271);
  const [lng, setLng] = useState(79.8612);

  // Overall AQI = max of subindices (simple, replace with your model later)
  const result = useMemo(() => {
    const overall = Math.max(co, o3, no2, pm25);
    const cat = category(overall);
    return { overall, cat, color: COLORS[cat] ?? "#374151" };
  }, [co, o3, no2, pm25]);

  return (
    <div className="p-4 bg-white rounded-2xl border border-[var(--border)] shadow-soft">
      <h3 className="font-semibold">Manual Predictor</h3>
      <p className="text-sm text-[var(--muted)] mt-1">
        Enter pollutant AQI sub-indices and location (demo uses the max sub-index as overall).
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
        <label className="text-sm">CO AQI
          <input type="number" className="mt-1 w-full border rounded-lg px-2 py-1"
                 value={co} min={0} max={500} onChange={e=>setCO(Number(e.target.value))}/>
        </label>
        <label className="text-sm">Ozone AQI
          <input type="number" className="mt-1 w-full border rounded-lg px-2 py-1"
                 value={o3} min={0} max={500} onChange={e=>setO3(Number(e.target.value))}/>
        </label>
        <label className="text-sm">NO₂ AQI
          <input type="number" className="mt-1 w-full border rounded-lg px-2 py-1"
                 value={no2} min={0} max={500} onChange={e=>setNO2(Number(e.target.value))}/>
        </label>
        <label className="text-sm">PM2.5 AQI
          <input type="number" className="mt-1 w-full border rounded-lg px-2 py-1"
                 value={pm25} min={0} max={500} onChange={e=>setPM25(Number(e.target.value))}/>
        </label>
        <label className="text-sm">Lat
          <input type="number" step="0.001" className="mt-1 w-full border rounded-lg px-2 py-1"
                 value={lat} onChange={e=>setLat(Number(e.target.value))}/>
        </label>
        <label className="text-sm">Lng
          <input type="number" step="0.001" className="mt-1 w-full border rounded-lg px-2 py-1"
                 value={lng} onChange={e=>setLng(Number(e.target.value))}/>
        </label>
      </div>

      <div className="mt-4 p-4 rounded-xl text-white" style={{ background: result.color }}>
        <div className="font-semibold">Predicted Category: {result.cat}</div>
        <div className="text-sm opacity-90 mt-1">Overall AQI (max sub-index): <b>{Math.round(result.overall)}</b></div>
      </div>

      <div className="mt-3 text-sm bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
        {tip(result.cat)}
      </div>

      <div className="mt-2 text-xs text-[var(--muted)]">
        Note: This demo computes overall AQI as the maximum sub-index. Replace this with your Python model API later.
      </div>
    </div>
  );
}
