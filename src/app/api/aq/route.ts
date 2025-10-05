import { NextResponse } from "next/server";

type Bp = { cLo: number; cHi: number; iLo: number; iHi: number };
const R = 24.45;

// Breakpoints (US EPA-style)
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
function toCategory(aqi?: number) {
  if (aqi === undefined) return "Unknown";
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

function norm(param: string, value: number, unit: string) {
  const p = param.toLowerCase();
  const u = unit.toLowerCase();

  if (p === "pm25") {
    if (u.includes("g/m")) return value; // µg/m³ or ug/m3
    return undefined;
  }
  if (p === "o3" || p === "no2") {
    if (u === "ppb") return value;
    if (u.includes("g/m")) return (value * R) / (p === "o3" ? 48 : 46.0055); // µg/m³ -> ppb
    return undefined;
  }
  if (p === "co") {
    if (u === "ppm") return value;
    if (u === "mg/m³" || u === "mg/m3") return (value * R) / 28.01;          // mg/m³ -> ppm
    if (u.includes("g/m")) return ((value / 1000) * R) / 28.01;              // µg/m³ -> ppm
    return undefined;
  }
  return undefined;
}

// ---------- data sources ----------
async function fetchOpenAQ(lat: number, lng: number, radius: number) {
  const url = `https://api.openaq.org/v2/measurements?coordinates=${lat},${lng}&radius=${radius}&limit=400&order_by=datetime&sort=desc&parameters=pm25,o3,no2,co`;
  const r = await fetch(url, { next: { revalidate: 30 } });
  if (!r.ok) throw new Error(`OpenAQ HTTP ${r.status}`);
  return r.json() as Promise<any>;
}

async function fetchOpenMeteo(lat: number, lng: number) {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=pm2_5,carbon_monoxide,nitrogen_dioxide,ozone&timezone=UTC`;
  const r = await fetch(url, { next: { revalidate: 30 } });
  if (!r.ok) throw new Error(`OpenMeteo HTTP ${r.status}`);
  return r.json() as Promise<any>;
}

// Python model
async function modelCategory(args: {co?:number;o3?:number;no2?:number;pm25?:number;lat:number;lng:number}) {
  const base = process.env.PY_BACKEND_URL;
  if (!base) return undefined;
  const {co=0,o3=0,no2=0,pm25=0,lat,lng} = args;
  const q = new URLSearchParams({
    co: String(co), o3: String(o3), no2: String(no2), pm25: String(pm25),
    lat: String(lat), lng: String(lng),
  });
  try {
    const r = await fetch(`${base}/predict?${q.toString()}`, { cache: "no-store" });
    if (!r.ok) return undefined;
    const j = await r.json();
    return (j?.category as string) || undefined;
  } catch {
    return undefined;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radius = Number(searchParams.get("radius") ?? 100_000); // 100 km default

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
  }

  let openaqError: string | undefined;
  let source: "openaq" | "openmeteo" | "none" = "none";
  let aqi_pm25: number | undefined;
  let aqi_o3: number | undefined;
  let aqi_no2: number | undefined;
  let aqi_co: number | undefined;

  // ---------- Try OpenAQ first (optional; OK if it fails) ----------
  try {
    const data = await fetchOpenAQ(lat, lng, radius);
    const seen = new Map<string, { value: number; unit: string }>();
    for (const item of (data?.results as any[] | undefined) ?? []) {
      const p = String(item?.parameter ?? "").toLowerCase();
      if (!["pm25", "o3", "no2", "co"].includes(p)) continue;
      const val = Number(item?.value);
      const unit = String(item?.unit ?? "");
      if (!Number.isFinite(val)) continue;
      if (!seen.has(p)) seen.set(p, { value: val, unit });
    }
    const pm25_u = seen.get("pm25") ? norm("pm25", seen.get("pm25")!.value, seen.get("pm25")!.unit) : undefined;
    const o3_ppb  = seen.get("o3")  ? norm("o3",  seen.get("o3")!.value,  seen.get("o3")!.unit) : undefined;
    const no2_ppb = seen.get("no2") ? norm("no2", seen.get("no2")!.value, seen.get("no2")!.unit) : undefined;
    const co_ppm  = seen.get("co")  ? norm("co",  seen.get("co")!.value,  seen.get("co")!.unit) : undefined;

    aqi_pm25 = pm25_u !== undefined ? Math.round(linearAQI(pm25_u, PM25) ?? 0) : undefined;
    aqi_o3   = o3_ppb  !== undefined ? Math.round(linearAQI(o3_ppb,  O3_8H_PPb) ?? 0) : undefined;
    aqi_no2  = no2_ppb !== undefined ? Math.round(linearAQI(no2_ppb, NO2_1H_PPb) ?? 0) : undefined;
    aqi_co   = co_ppm  !== undefined ? Math.round(linearAQI(co_ppm,  CO_8H_PPM) ?? 0) : undefined;

    if ([aqi_pm25, aqi_o3, aqi_no2, aqi_co].some(v => v !== undefined)) {
      source = "openaq";
    }
  } catch (e) {
    openaqError = (e as Error).message;
  }

  // ---------- Fallback: Open-Meteo (if we still have no sub-indices) ----------
  if (![aqi_pm25, aqi_o3, aqi_no2, aqi_co].some(v => v !== undefined)) {
    try {
      const m = await fetchOpenMeteo(lat, lng);

      const latestNumber = (arr: unknown[], lookback = 48): number | undefined => {
        if (!Array.isArray(arr) || arr.length === 0) return undefined;
        const start = Math.max(0, arr.length - lookback);
        for (let i = arr.length - 1; i >= start; i--) {
          const v = arr[i];
          if (typeof v === "number" && Number.isFinite(v)) return v;
        }
        return undefined;
      };

      // units: pm2_5 µg/m³; nitrogen_dioxide µg/m³; ozone µg/m³; carbon_monoxide mg/m³
      const pm25_ug = latestNumber(m?.hourly?.pm2_5 ?? []);
      const no2_ug  = latestNumber(m?.hourly?.nitrogen_dioxide ?? []);
      const o3_ug   = latestNumber(m?.hourly?.ozone ?? []);
      const co_mg   = latestNumber(m?.hourly?.carbon_monoxide ?? []);

      const pm25_u = pm25_ug; // already µg/m³
      const no2_ppb = no2_ug !== undefined ? (no2_ug * R) / 46.0055 : undefined;
      const o3_ppb  = o3_ug  !== undefined ? (o3_ug  * R) / 48      : undefined;
      const co_ppm  = co_mg  !== undefined ? (co_mg  * R) / 28.01   : undefined;

      aqi_pm25 = pm25_u !== undefined ? Math.round(linearAQI(pm25_u, PM25) ?? 0) : undefined;
      aqi_o3   = o3_ppb  !== undefined ? Math.round(linearAQI(o3_ppb,  O3_8H_PPb) ?? 0) : undefined;
      aqi_no2  = no2_ppb !== undefined ? Math.round(linearAQI(no2_ppb, NO2_1H_PPb) ?? 0) : undefined;
      aqi_co   = co_ppm  !== undefined ? Math.round(linearAQI(co_ppm,  CO_8H_PPM) ?? 0) : undefined;

      source = "openmeteo";
    } catch {
      // leave as none
    }
  }

  const subs = [aqi_pm25, aqi_o3, aqi_no2, aqi_co].filter((x) => x !== undefined) as number[];
  const overall = subs.length ? Math.max(...subs) : undefined;

  let cat = await modelCategory({ co: aqi_co, o3: aqi_o3, no2: aqi_no2, pm25: aqi_pm25, lat, lng });
  if (!cat) cat = toCategory(overall);

  const tip = {
    "Good":"Air quality is satisfactory—enjoy outdoor activities.",
    "Moderate":"Unusually sensitive people limit prolonged outdoor exertion.",
    "Unhealthy for Sensitive Groups":"Sensitive groups reduce exertion; consider a mask.",
    "Unhealthy":"Everyone limit outdoor exertion; high-quality mask recommended.",
    "Very Unhealthy":"Avoid outdoor activity; use high-quality masks indoors/outdoors.",
    "Hazardous":"Stay indoors; use purifiers; follow local advisories.",
    "Unknown":"Live data unavailable nearby. Try a larger city.",
  }[cat] ?? "Check local guidance.";

  return NextResponse.json({
    source,
    radiusUsed: source === "openaq" ? radius : null,
    subIndices: { pm25: aqi_pm25, o3: aqi_o3, no2: aqi_no2, co: aqi_co },
    overall,
    category: cat,
    tip,
    debug: { openaqError },
  });
}
