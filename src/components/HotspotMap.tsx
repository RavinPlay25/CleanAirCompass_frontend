'use client';

import { useCallback, useMemo, useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";

type Live = {
  subIndices?: { pm25?: number; o3?: number; no2?: number; co?: number };
  overall?: number;
  category?: string;
  tip?: string;
};

function ClickCatcher({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

export default function HotspotMap() {
  useEffect(() => { import('leaflet-defaulticon-compatibility'); }, []);

  const [center] = useState<LatLngExpression>([6.9271, 79.8612]); // Colombo
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState<Live | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onPick = useCallback((lat: number, lng: number) => {
    setPicked({ lat, lng });
    setLive(null);
    setErr(null);
  }, []);

  const fetchLive = useCallback(async () => {
    if (!picked) return;
    setLoading(true);
    setErr(null);
    try {
      const q = new URLSearchParams({ lat: String(picked.lat), lng: String(picked.lng) });
      const r = await fetch(`/api/aq?${q.toString()}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed");
      // Always ensure subIndices is an object so UI is safe
      setLive({
        subIndices: j?.subIndices ?? {},
        overall: j?.overall,
        category: j?.category,
        tip: j?.tip,
      });
    } catch (e: any) {
      setErr(e.message || "Request failed");
      setLive(null);
    } finally {
      setLoading(false);
    }
  }, [picked]);

  const subRow = useMemo(() => {
    if (!live?.subIndices) return null;
    const s = live.subIndices ?? {};
    const chip = (label: string, v?: number) => (
      <span
        key={label}
        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 border border-[var(--border)]"
      >
        {label}: <b className="ml-1">{typeof v === "number" ? v : "—"}</b>
      </span>
    );
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {chip("PM2.5 AQI", s.pm25)}
        {chip("NO₂ AQI",   s.no2)}
        {chip("O₃ AQI",    s.o3)}
        {chip("CO AQI",    s.co)}
      </div>
    );
  }, [live?.subIndices]);

  return (
    <div className="grid lg:grid-cols-[1.6fr,1fr] gap-4">
      {/* Map */}
      <div className="h-[460px] rounded-2xl overflow-hidden border border-[var(--border)] shadow-soft">
        <MapContainer center={center} zoom={5} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickCatcher onPick={onPick} />
          {picked && (
            <Marker position={[picked.lat, picked.lng]}>
              <Popup>Selected<br />{picked.lat.toFixed(3)}, {picked.lng.toFixed(3)}</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Details panel */}
      <div className="p-4 bg-white rounded-2xl border border-[var(--border)] shadow-soft">
        <h3 className="font-semibold">Hotspot Explorer</h3>
        <p className="text-sm text-[var(--muted)] mt-1">
          Click on the map to pick a location, then fetch live air quality.
        </p>

        <div className="mt-3">
          <div className="text-sm">Selected:
            <b className="ml-1">
              {picked ? `${picked.lat.toFixed(3)}, ${picked.lng.toFixed(3)}` : "—"}
            </b>
          </div>

          <button
            onClick={fetchLive}
            disabled={!picked || loading}
            className="mt-3 px-4 py-2 rounded-lg text-white font-semibold disabled:opacity-50"
            style={{ background: "linear-gradient(90deg,#16a34a,#4ade80)" }}
          >
            {loading ? "Fetching…" : "Fetch live air"}
          </button>

          {err && <div className="mt-3 text-sm text-red-600">{err}</div>}

          {live && (
            <div className="mt-4">
              <div
                className="inline-flex items-center px-3 py-1 rounded-full text-sm text-white"
                style={{ background: "linear-gradient(90deg,#1f2937,#374151)" }}
              >
                Overall:{" "}
                <b className="ml-2">
                  {(typeof live.overall === "number" ? live.overall : "—")}
                  {" "}
                  ({live.category ?? "Unknown"})
                </b>
              </div>

              {subRow}

              {live.tip && (
                <div className="mt-3 text-sm bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
                  {live.tip}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
