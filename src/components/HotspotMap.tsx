"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import AQChart from "./AQChart";
import AQNumberLine from "./AQNumberLine";


type HS = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind?: string;
  score?: number;
  source: "overpass" | "wikipedia";
};

type Live = {
  source?: string | null;
  subIndices?: { pm25?: number; o3?: number; no2?: number; co?: number };
  overall?: number | null;
  category?: string;
  tip?: string;
  nearestCity?: {
    city: string;
    country: string;
    aqi_value: number;
    aqi_category: string;
    distance_km: number;
  };
  debug?: { openaqError?: string };
};

function haversineKm(a: [number, number], b: [number, number]) {
  const [lat1, lon1] = a,
    [lat2, lon2] = b;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Must be rendered INSIDE MapContainer
function MapEvents({
  onClickPoint,
  onMoveEnd,
}: {
  onClickPoint: (lat: number, lng: number) => void;
  onMoveEnd: (
    b: { minLat: number; maxLat: number; minLng: number; maxLng: number },
    center: [number, number]
  ) => void;
}) {
  useMapEvents({
    click(e) {
      if (e?.latlng) onClickPoint(e.latlng.lat, e.latlng.lng);
    },
    moveend(e) {
      const map = e.target;
      if (!map) return;
      const b = map.getBounds();
      onMoveEnd(
        {
          minLat: b.getSouth(),
          maxLat: b.getNorth(),
          minLng: b.getWest(),
          maxLng: b.getEast(),
        },
        [map.getCenter().lat, map.getCenter().lng]
      );
    },
  });
  return null;
}

export default function HotspotMap() {
  // Sri Lanka-ish default center
  const [center, setCenter] = useState<[number, number]>([7.0, 81.2]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [live, setLive] = useState<Live | null>(null);

  // Hotspots (sidebar)
  const [hotspots, setHotspots] = useState<HS[]>([]);
  const [hsSource, setHsSource] = useState<string>("—");
  const [loadingHS, setLoadingHS] = useState(false);

  // Fetch hotspots for current frame (bbox)
  const loadHotspots = useCallback(
    async (b: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => {
      setLoadingHS(true);
      try {
        const q = new URLSearchParams({
          minLat: String(b.minLat),
          maxLat: String(b.maxLat),
          minLng: String(b.minLng),
          maxLng: String(b.maxLng),
        });
        const r = await fetch(`/api/hotspots?${q.toString()}`, { cache: "no-store" });
        const j = await r.json();
        setHotspots(Array.isArray(j.hotspots) ? j.hotspots : []);
        setHsSource(j.source ?? "—");
      } catch {
        setHotspots([]);
        setHsSource("—");
      } finally {
        setLoadingHS(false);
      }
    },
    []
  );

  // Predict AQ for any lat/lng (map or hotspot click)
  const fetchLive = useCallback(async (lat: number, lng: number) => {
    setSelected([lat, lng]); // show pin immediately
    setLive(null);
    try {
      const q = new URLSearchParams({ lat: String(lat), lng: String(lng) });
      const r = await fetch(`/api/aq?${q.toString()}`, { cache: "no-store" });
      const j = await r.json();
      setLive(j);
    } catch {
      setLive({
        source: "none",
        subIndices: {},
        overall: null,
        category: "Unknown",
        tip: "Could not fetch live data.",
      });
    }
  }, []);

  // Initial hotspots load (coarse bbox to populate list on first paint)
  useEffect(() => {
    const br = { minLat: -10, maxLat: 20, minLng: 70, maxLng: 90 };
    loadHotspots(br);
  }, [loadHotspots]);

  // Sort hotspots by distance from current center
  const list = useMemo(() => {
    if (!hotspots?.length) return [];
    return hotspots
      .map((h) => ({ ...h, dist: haversineKm(center, [h.lat, h.lng]) }))
      .sort((a, b) => a.dist - b.dist);
  }, [hotspots, center]);

  // Sub-index chip row
  const subRow = useMemo(() => {
    if (!live) return null;
    const v = live.subIndices || {};
    const chip = (label: string, val?: number) => (
      <span className="px-3 py-1 rounded-full border text-xs">
        {label}: <b>{typeof val === "number" ? val : "—"}</b>
      </span>
    );
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {chip("PM2.5 AQI", v.pm25)}
        {chip("NO₂ AQI", v.no2)}
        {chip("O₃ AQI", v.o3)}
        {chip("CO AQI", v.co)}
      </div>
    );
  }, [live]);

  // Optional: use browser location
  const useMyLocation = async () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchLive(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
      {/* LEFT: Map + Prediction below */}
      <div className="space-y-4">
        {/* Map */}
        <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-white">
          <div className="px-3 py-2 text-xs text-[var(--muted)] border-b border-[var(--border)]">
            Tip: Click anywhere on the map to pin and predict air quality.
          </div>
          <MapContainer center={center} zoom={6} style={{ height: 520 }}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapEvents
              onClickPoint={(lat, lng) => fetchLive(lat, lng)}
              onMoveEnd={(bbox, ctr) => {
                setCenter(ctr);
                loadHotspots(bbox);
              }}
            />

            {selected && (
              <Marker position={selected}>
                <Popup>
                  Selected: {selected[0].toFixed(3)}, {selected[1].toFixed(3)}
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* Prediction panel (below map) */}
        <div className="rounded-xl border border-[var(--border)] bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Prediction</div>
            <button className="text-xs px-2 py-1 rounded-full border" onClick={useMyLocation}>
              Use my location
            </button>
          </div>

          {!live ? (
            <div className="mt-2 text-sm text-[var(--muted)]">
              Click on the map or choose a hotspot to see live sub-indices, model category, and guidance.
            </div>
          ) : (
            <>
              <div
                className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-sm text-white"
                style={{ background: "linear-gradient(90deg,#1f2937,#374151)" }}
              >
                Overall:&nbsp;
                <b className="ml-1">
                  {typeof live.overall === "number" ? live.overall : "—"} ({live.category ?? "Unknown"})
                </b>
              </div>

              {subRow}

              <div className="mt-2 text-xs text-[var(--muted)]">
                Source: {live.source ?? "—"}
                {live?.debug?.openaqError ? (
                  <span className="ml-2 text-red-600">OpenAQ error: {live.debug.openaqError}</span>
                ) : null}
              </div>

              {live.tip && (
                <div className="mt-3 text-sm bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
                  {live.tip}
                </div>
              )}

              {live.nearestCity && (
                <div className="mt-3 rounded-xl border border-[var(--border)] p-3 bg-white">
                  <div className="text-sm font-semibold mb-1">Nearest city in dataset</div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span>
                      <b>{live.nearestCity.city}</b>, {live.nearestCity.country}
                    </span>
                    <span className="px-2 py-0.5 rounded-full border text-xs">
                      AQI {live.nearestCity.aqi_value}
                    </span>
                    <span className="px-2 py-0.5 rounded-full border text-xs">
                      {live.nearestCity.aqi_category}
                    </span>
                    <span className="text-[var(--muted)]">
                      • Distance ≈ <b>{live.nearestCity.distance_km.toFixed(1)} km</b>
                    </span>
                  </div>
                </div>
              )}

              {/* Trend chart under prediction */}
              {typeof live?.overall === "number" && (
                  <div className="mt-3">
                    <AQNumberLine value={live.overall} sub={live.subIndices} />
                  </div>
                )}
            </>
          )}
        </div>
      </div>

      {/* RIGHT: Hotspots sidebar */}
      <aside className="bg-white rounded-xl border border-[var(--border)] p-3 flex flex-col">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Hotspots in view</div>
          <span className="text-xs text-[var(--muted)]">Source: {hsSource}</span>
        </div>

        <div className="mt-2 grow overflow-auto border border-[var(--border)] rounded-lg p-2">
          {loadingHS ? (
            <div className="text-sm text-[var(--muted)]">Loading…</div>
          ) : list.length === 0 ? (
            <div className="text-sm text-[var(--muted)]">No hotspots in this frame. Pan or zoom.</div>
          ) : (
            <ul className="space-y-2">
              {list.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{h.name}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {h.kind ?? "poi"} • {h.dist.toFixed(1)} km
                    </div>
                  </div>
                  <button
                    className="px-3 py-1 rounded-full text-xs border"
                    onClick={() => fetchLive(h.lat, h.lng)}
                  >
                    Predict
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
