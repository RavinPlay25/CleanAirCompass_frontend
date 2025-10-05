import { NextResponse } from "next/server";

type Bp = { cLo: number; cHi: number; iLo: number; iHi: number };
const R = 24.45; // 25°C, 1 atm

// Breakpoints
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

function linearAQI(c: number | undefined, bps: Bp[]) {
  if (c === undefined || !Number.isFinite(c)) return undefined;
  for (const bp of bps) {
    if (c >= bp.cLo && c <= bp.cHi) {
      return ((bp.iHi - bp.iLo) / (bp.cHi - bp.cLo)) * (c - bp.cLo) + bp.iLo;
    }
  }
  return undefined;
}

async function fetchOpenMeteo(lat: number, lng: number) {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=pm2_5,carbon_monoxide,nitrogen_dioxide,ozone&timezone=UTC&past_days=2`;
  const r = await fetch(url, { next: { revalidate: 60 } });
  if (!r.ok) throw new Error(`OpenMeteo HTTP ${r.status}`);
  return r.json() as Promise<any>;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const hours = Math.max(6, Math.min(120, Number(searchParams.get("hours") || 48))); // clamp 6..120

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
  }

  try {
    const m = await fetchOpenMeteo(lat, lng);
    const t: string[] = m?.hourly?.time || [];
    const pm25_ug: number[] = m?.hourly?.pm2_5 || [];
    const no2_ug: number[]  = m?.hourly?.nitrogen_dioxide || [];
    const o3_ug: number[]   = m?.hourly?.ozone || [];
    const co_mg: number[]   = m?.hourly?.carbon_monoxide || [];

    const n = Math.min(t.length, pm25_ug.length, no2_ug.length, o3_ug.length, co_mg.length);
    const start = Math.max(0, n - hours);

    const series = [];
    for (let i = start; i < n; i++) {
      const pm25 = pm25_ug[i];                                  // µg/m³
      const no2_ppb = no2_ug[i] !== null ? (no2_ug[i] * R) / 46.0055 : undefined; // µg/m³ -> ppb
      const o3_ppb  = o3_ug[i]  !== null ? (o3_ug[i]  * R) / 48      : undefined; // µg/m³ -> ppb
      const co_ppm  = co_mg[i]  !== null ? (co_mg[i]  * R) / 28.01   : undefined; // mg/m³  -> ppm

      const a_pm25 = linearAQI(pm25, PM25);
      const a_no2  = linearAQI(no2_ppb, NO2_1H_PPb);
      const a_o3   = linearAQI(o3_ppb,  O3_8H_PPb);
      const a_co   = linearAQI(co_ppm,  CO_8H_PPM);

      const vals = [a_pm25, a_o3, a_no2, a_co].filter(v => v !== undefined) as number[];
      const overall = vals.length ? Math.max(...vals) : undefined;

      series.push({
        t: t[i],
        pm25: a_pm25 !== undefined ? Math.round(a_pm25) : null,
        o3:   a_o3   !== undefined ? Math.round(a_o3)   : null,
        no2:  a_no2  !== undefined ? Math.round(a_no2)  : null,
        co:   a_co   !== undefined ? Math.round(a_co)   : null,
        overall: overall !== undefined ? Math.round(overall) : null,
      });
    }

    return NextResponse.json({ source: "openmeteo", series });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "series fetch failed" }, { status: 500 });
  }
}
