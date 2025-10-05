"use client";

import { useState } from "react";

type Result = {
  inputs: { co: number; o3: number; no2: number; pm25: number; lat: number; lng: number };
  category: string;
  tip: string;
  nearestCity?: { city: string; country: string; aqi_value: number; aqi_category: string; distance_km: number };
};

export default function PredictorPage() {
  const [co, setCo] = useState(20);
  const [o3, setO3] = useState(30);
  const [no2, setNo2] = useState(25);
  const [pm25, setPm25] = useState(35);
  const [lat, setLat] = useState(6.9271);  // Colombo defaults
  const [lng, setLng] = useState(79.8612);
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setRes(null);
    try {
      const r = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ co, o3, no2, pm25, lat, lng }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Request failed");
      setRes(j);
    } catch (e: any) {
      setErr(e?.message || "Failed to predict");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold">Manual AQI Predictor</h1>
      <p className="text-[var(--muted)] mt-1">
        Enter AQI <b>sub-index values</b> (0–500) for CO, O₃, NO₂, PM2.5 plus a latitude/longitude.
        We’ll predict the overall category using your trained model and show the nearest city from the dataset.
      </p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4 md:grid-cols-3 bg-white rounded-xl border border-[var(--border)] p-4">
        <Field label="CO AQI" value={co} setValue={setCo} />
        <Field label="O₃ AQI" value={o3} setValue={setO3} />
        <Field label="NO₂ AQI" value={no2} setValue={setNo2} />
        <Field label="PM2.5 AQI" value={pm25} setValue={setPm25} />
        <Field label="Latitude" value={lat} setValue={setLat} min={-90} max={90} step={0.001} />
        <Field label="Longitude" value={lng} setValue={setLng} min={-180} max={180} step={0.001} />

        <div className="md:col-span-3 flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-full text-sm font-semibold text-white"
            style={{ background: "linear-gradient(90deg,#16a34a,#4ade80)" }}
          >
            {loading ? "Predicting…" : "Predict"}
          </button>
          {err && <span className="text-red-600 text-sm">{err}</span>}
        </div>
      </form>

      {res && (
        <div className="mt-6 bg-white rounded-xl border border-[var(--border)] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 rounded-full text-white text-sm"
              style={{ background: "linear-gradient(90deg,#2563eb,#60a5fa)" }}>
              Predicted: <b className="ml-1">{res.category}</b>
            </span>
            <span className="text-sm text-[var(--muted)]">
              Inputs → CO {res.inputs.co}, O₃ {res.inputs.o3}, NO₂ {res.inputs.no2}, PM2.5 {res.inputs.pm25} at ({res.inputs.lat.toFixed(3)}, {res.inputs.lng.toFixed(3)})
            </span>
          </div>

          <div className="mt-3 text-sm bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
            {res.tip}
          </div>

          {res.nearestCity && (
            <div className="mt-4 rounded-xl border border-[var(--border)] p-3">
              <div className="text-sm font-semibold mb-1">Nearest city in dataset</div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span><b>{res.nearestCity.city}</b>, {res.nearestCity.country}</span>
                <span className="px-2 py-0.5 rounded-full border text-xs">AQI {res.nearestCity.aqi_value}</span>
                <span className="px-2 py-0.5 rounded-full border text-xs">{res.nearestCity.aqi_category}</span>
                <span className="text-[var(--muted)]">• Distance ≈ <b>{res.nearestCity.distance_km.toFixed(1)} km</b></span>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function Field({
  label, value, setValue, min = 0, max = 500, step = 1,
}: { label: string; value: number; setValue: (n: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="number"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="mt-1 w-full rounded-lg border border-[var(--border)] p-2"
      />
    </label>
  );
}
