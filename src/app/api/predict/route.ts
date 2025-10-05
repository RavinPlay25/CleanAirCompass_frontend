import { NextResponse } from "next/server";

const TIP: Record<string, string> = {
  "Good": "Air quality is satisfactory—enjoy outdoor activities.",
  "Moderate": "Unusually sensitive people limit prolonged outdoor exertion.",
  "Unhealthy for Sensitive Groups": "Sensitive groups reduce exertion; consider a mask.",
  "Unhealthy": "Everyone limit outdoor exertion; high-quality mask recommended.",
  "Very Unhealthy": "Avoid outdoor activity; use high-quality masks indoors/outdoors.",
  "Hazardous": "Stay indoors; use purifiers; follow local advisories.",
  "Unknown": "Live data unavailable. Try a different location.",
};

function toTip(cat?: string) {
  return TIP[cat || "Unknown"] ?? "Check local guidance.";
}

function num(n: any, def = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : def;
}

export async function POST(req: Request) {
  const { co, o3, no2, pm25, lat, lng } = await req.json();

  // The trained model expects AQI sub-indices (0–500) for CO, O3, NO2, PM2.5 + lat/lng
  const coN = Math.min(500, Math.max(0, num(co)));
  const o3N = Math.min(500, Math.max(0, num(o3)));
  const no2N = Math.min(500, Math.max(0, num(no2)));
  const pm25N = Math.min(500, Math.max(0, num(pm25)));
  const latN = Math.max(-90, Math.min(90, num(lat)));
  const lngN = Math.max(-180, Math.min(180, num(lng)));

  const base = process.env.PY_BACKEND_URL;
  if (!base) {
    return NextResponse.json({ error: "PY_BACKEND_URL not set" }, { status: 500 });
  }

  // Call your FastAPI model
  const q = new URLSearchParams({
    co: String(coN), o3: String(o3N), no2: String(no2N), pm25: String(pm25N),
    lat: String(latN), lng: String(lngN),
  });

  let category = "Unknown";
  try {
    const r = await fetch(`${base}/predict?${q.toString()}`, { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      category = String(j?.category ?? "Unknown");
    }
  } catch { /* swallow and keep Unknown */ }

  // Also fetch nearest dataset city + distance for context
  let nearestCity: any = null;
  try {
    const r2 = await fetch(`${base}/nearest-city?lat=${latN}&lng=${lngN}`, { cache: "no-store" });
    if (r2.ok) nearestCity = await r2.json();
  } catch { /* ignore */ }

  return NextResponse.json({
    inputs: { co: coN, o3: o3N, no2: no2N, pm25: pm25N, lat: latN, lng: lngN },
    category,
    tip: toTip(category),
    nearestCity,
  });
}
