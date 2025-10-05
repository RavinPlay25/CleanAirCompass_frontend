import { NextResponse } from "next/server";

// ---- Helpers ----
type Bounds = { minLat: number; maxLat: number; minLng: number; maxLng: number };
type HS = { id: string; name: string; lat: number; lng: number; kind?: string; score?: number; source: "overpass" | "wikipedia" };

const OVERPASS = "https://overpass-api.de/api/interpreter";

// Build an Overpass query for tourism/historic/natural POIs with names within bbox
function overpassQuery(b: Bounds) {
  const { minLat: s, maxLat: n, minLng: w, maxLng: e } = b;
  // Overpass bbox order: South, West, North, East
  return `
    [out:json][timeout:25];
    (
      node["tourism"~"attraction|viewpoint|museum|zoo|aquarium"]["name"](${s},${w},${n},${e});
      way ["tourism"~"attraction|viewpoint|museum"]["name"](${s},${w},${n},${e});
      node["historic"]["name"](${s},${w},${n},${e});
      node["natural"~"peak|beach|waterfall"]["name"](${s},${w},${n},${e});
      node["leisure"="park"]["name"](${s},${w},${n},${e});
    );
    out center 200;
  `.trim();
}

async function fetchOverpass(b: Bounds): Promise<HS[]> {
  const q = overpassQuery(b);
  const r = await fetch(OVERPASS, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: `data=${encodeURIComponent(q)}`,
    // cache on server for 5 minutes to be nice to Overpass mirrors
    next: { revalidate: 300 },
  });
  if (!r.ok) throw new Error(`Overpass HTTP ${r.status}`);
  const j = await r.json();

  const out: HS[] = [];
  for (const el of (j?.elements ?? [])) {
    const tags = el.tags || {};
    const name = tags.name;
    if (!name) continue;
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (typeof lat !== "number" || typeof lng !== "number") continue;

    const kind = tags.tourism || tags.historic || tags.natural || tags.leisure || "poi";
    const score =
      (tags.wikidata ? 5 : 0) +
      (tags.wikipedia ? 5 : 0) +
      (/attraction|viewpoint|museum/.test(kind) ? 2 : 0);

    out.push({
      id: `${el.type}/${el.id}`,
      name: String(name),
      lat,
      lng,
      kind: String(kind),
      score,
      source: "overpass",
    });
  }

  // Basic de-dupe by name within ~300m
  return dedupeByNameProx(out, 0.3).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 80);
}

// Wikipedia fallback: geosearch from bbox center
async function fetchWikipediaFallback(b: Bounds): Promise<HS[]> {
  const lat = (b.minLat + b.maxLat) / 2;
  const lng = (b.minLng + b.maxLng) / 2;
  // radius ~ 25km in meters
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lng}&gsradius=25000&gslimit=50&format=json&origin=*`;
  const r = await fetch(url, { next: { revalidate: 300 } });
  if (!r.ok) throw new Error(`Wikipedia HTTP ${r.status}`);
  const j = await r.json();
  const gs = j?.query?.geosearch ?? [];
  const out: HS[] = gs.map((g: any) => ({
    id: `wiki/${g.pageid}`,
    name: g.title,
    lat: g.lat,
    lng: g.lon,
    kind: "wiki",
    score: 3,
    source: "wikipedia",
  }));
  return dedupeByNameProx(out, 0.3).slice(0, 50);
}

// de-dupe by lowercase name and proximity (km)
function dedupeByNameProx(items: HS[], proxKm = 0.3) {
  const res: HS[] = [];
  for (const item of items) {
    const key = item.name.trim().toLowerCase();
    const clash = res.find((r) => r.name.trim().toLowerCase() === key && haversineKm(r.lat, r.lng, item.lat, item.lng) <= proxKm);
    if (!clash) res.push(item);
  }
  return res;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat/2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Antimeridian-aware longitude test used on client; here we rely on Overpass bbox
function validateBounds(b: Bounds) {
  return (
    Number.isFinite(b.minLat) && Number.isFinite(b.maxLat) &&
    Number.isFinite(b.minLng) && Number.isFinite(b.maxLng) &&
    b.minLat <= b.maxLat &&
    b.minLat >= -90 && b.maxLat <= 90 &&
    b.minLng >= -180 && b.maxLng <= 180
  );
}

// ---- API entrypoint ----
export async function GET(req: Request) {
  const u = new URL(req.url);
  const b: Bounds = {
    minLat: Number(u.searchParams.get("minLat")),
    maxLat: Number(u.searchParams.get("maxLat")),
    minLng: Number(u.searchParams.get("minLng")),
    maxLng: Number(u.searchParams.get("maxLng")),
  };

  if (!validateBounds(b)) {
    return NextResponse.json({ error: "bounds required: minLat,maxLat,minLng,maxLng" }, { status: 400 });
  }

  try {
    const list = await fetchOverpass(b);
    if (list.length) {
      return NextResponse.json({ hotspots: list, source: "overpass" });
    }
    // if Overpass returns empty, fall back
    const fallback = await fetchWikipediaFallback(b);
    return NextResponse.json({ hotspots: fallback, source: "wikipedia" });
  } catch {
    // network error -> fallback
    try {
      const fallback = await fetchWikipediaFallback(b);
      return NextResponse.json({ hotspots: fallback, source: "wikipedia" });
    } catch {
      return NextResponse.json({ hotspots: [], source: "none" });
    }
  }
}
