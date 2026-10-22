/** Distance and route-ordering helpers (no external map API needed). */

export interface Point {
  lat: number;
  lng: number;
}

/** Great-circle distance in kilometres. */
export function haversineKm(a: Point, b: Point) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Road distance is roughly 1.35× the straight line in Kigali's hilly street grid. */
export const ROAD_FACTOR = 1.35;
/** Average urban speed including stops, km/h. */
export const CITY_SPEED_KMH = 22;
/** Minutes spent at each stop. */
export const STOP_MINUTES = 8;

export interface Stop extends Point {
  id: number;
  priorityWeight?: number;
  deadline?: Date | null;
}

/**
 * Nearest-neighbour ordering, improved with 2-opt swaps. High-priority stops
 * are pulled earlier by shrinking their effective distance.
 */
export function optimizeRoute<T extends Stop>(start: Point, stops: T[]) {
  if (stops.length <= 1) return stops;
  const remaining = [...stops];
  const ordered: T[] = [];
  let current: Point = start;
  while (remaining.length) {
    let best = 0;
    let bestScore = Infinity;
    remaining.forEach((s, i) => {
      const score = haversineKm(current, s) / (s.priorityWeight || 1);
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    });
    const next = remaining.splice(best, 1)[0];
    ordered.push(next);
    current = next;
  }

  // 2-opt: reverse segments while it shortens the total distance
  const total = (route: T[]) => route.reduce((sum, s, i) => sum + haversineKm(i === 0 ? start : route[i - 1], s), 0);
  let improved = true;
  let route = ordered;
  let guard = 0;
  while (improved && guard++ < 50) {
    improved = false;
    for (let i = 0; i < route.length - 1; i++) {
      for (let k = i + 1; k < route.length; k++) {
        const candidate = [...route.slice(0, i), ...route.slice(i, k + 1).reverse(), ...route.slice(k + 1)];
        if (total(candidate) + 1e-9 < total(route)) {
          route = candidate;
          improved = true;
        }
      }
    }
  }
  return route;
}

/** Distance, drive time and arrival estimate for each leg of an ordered route. */
export function routeLegs<T extends Stop>(start: Point, route: T[], departAt = new Date()) {
  let clock = departAt.getTime();
  let prev: Point = start;
  let totalKm = 0;
  const legs = route.map((stop) => {
    const km = haversineKm(prev, stop) * ROAD_FACTOR;
    const driveMin = (km / CITY_SPEED_KMH) * 60;
    clock += driveMin * 60000;
    const eta = new Date(clock);
    clock += STOP_MINUTES * 60000;
    totalKm += km;
    prev = stop;
    return { stop, km: Math.round(km * 10) / 10, driveMinutes: Math.round(driveMin), eta, late: stop.deadline ? eta > stop.deadline : false };
  });
  return { legs, totalKm: Math.round(totalKm * 10) / 10, totalMinutes: Math.round((clock - departAt.getTime()) / 60000) };
}

// ---------------------------------------------------------------------------
// Real road distances: Mapbox (traffic-aware) when MAPBOX_TOKEN is set,
// otherwise OSRM (open-source routing on OpenStreetMap data).
// ---------------------------------------------------------------------------

/** OSRM server; set OSRM_URL=off to use straight-line estimates only. */
const OSRM_URL = (process.env.OSRM_URL || 'https://router.project-osrm.org').replace(/\/$/, '');
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN || '';
const OSRM_TIMEOUT_MS = 4000;
/**
 * OSRM assumes free-flowing roads, so its times are scaled up for city traffic.
 * Mapbox "driving-traffic" already includes traffic.
 */
const TRAFFIC_FACTOR = Number(process.env.ROUTE_TRAFFIC_FACTOR) || (MAPBOX_TOKEN ? 1.0 : 1.6);
const osrmCache = new Map<string, { at: number; data: any }>();

export const routingProvider = () => (MAPBOX_TOKEN ? 'mapbox' : OSRM_URL === 'off' ? 'estimate' : 'osrm');

const coords = (points: Point[]) => points.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(';');

/** Turn an OSRM-style path (/table/v1/driving/…, /route/v1/driving/…) into the provider's URL. */
function routingUrl(path: string) {
  if (!MAPBOX_TOKEN) return `${OSRM_URL}${path}`;
  const [base, query = ''] = path.split('?');
  const coordinates = base.split('/').pop()!;
  const count = coordinates.split(';').length;
  const params = new URLSearchParams(query);
  params.set('access_token', MAPBOX_TOKEN);
  if (base.startsWith('/table/')) {
    // Traffic-aware matrices allow up to 10 points; larger ones use normal driving times
    const profile = count <= 10 ? 'driving-traffic' : 'driving';
    return `https://api.mapbox.com/directions-matrix/v1/mapbox/${profile}/${coordinates}?${params}`;
  }
  params.delete('steps');
  return `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordinates}?${params}`;
}

async function osrm(path: string) {
  if (!MAPBOX_TOKEN && OSRM_URL === 'off') return null;
  const hit = osrmCache.get(path);
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.data;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);
  try {
    const res = await fetch(routingUrl(path), { signal: controller.signal, headers: { 'User-Agent': 'WareTrack-Pro' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.code !== 'Ok') return null;
    if (osrmCache.size > 500) osrmCache.clear();
    osrmCache.set(path, { at: Date.now(), data });
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Road distance (km) and drive time (min) between every pair of points, or null if unavailable. */
export async function roadMatrix(points: Point[]) {
  if (points.length < 2 || points.length > (MAPBOX_TOKEN ? 25 : 60)) return null;
  const data = await osrm(`/table/v1/driving/${coords(points)}?annotations=duration,distance`);
  if (!data?.distances || !data?.durations) return null;
  return {
    km: (data.distances as (number | null)[][]).map((row) => row.map((m) => (m === null ? Infinity : m / 1000))),
    minutes: (data.durations as (number | null)[][]).map((row) => row.map((s) => (s === null ? Infinity : s / 60))),
  };
}

/** Road distance (km) from several origins to one destination, or null. */
export async function roadDistancesTo(origins: Point[], destination: Point) {
  if (!origins.length || origins.length > (MAPBOX_TOKEN ? 24 : 60)) return null;
  const all = [...origins, destination];
  const sources = origins.map((_, i) => i).join(';');
  const data = await osrm(`/table/v1/driving/${coords(all)}?sources=${sources}&destinations=${origins.length}&annotations=distance,duration`);
  if (!data?.distances) return null;
  return origins.map((_, i) => ({ km: data.distances[i][0] === null ? null : data.distances[i][0] / 1000, minutes: data.durations?.[i]?.[0] === null ? null : data.durations[i][0] / 60 }));
}

/** The road path through the points, for drawing on the map. */
export async function roadPath(points: Point[]) {
  if (points.length < 2 || points.length > (MAPBOX_TOKEN ? 25 : 60)) return null;
  const data = await osrm(`/route/v1/driving/${coords(points)}?overview=full&geometries=geojson&steps=false`);
  const route = data?.routes?.[0];
  if (!route) return null;
  return {
    km: route.distance / 1000,
    minutes: (route.duration / 60) * TRAFFIC_FACTOR,
    legs: (route.legs as { distance: number; duration: number }[]).map((l) => ({ km: l.distance / 1000, minutes: (l.duration / 60) * TRAFFIC_FACTOR })),
    /** [lat, lng] pairs */
    line: (route.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng] as [number, number]),
  };
}

/**
 * Order stops using real road distances when available (nearest neighbour +
 * 2-opt on the road matrix), falling back to straight-line ordering.
 */
export async function optimizeRouteByRoad<T extends Stop>(start: Point, stops: T[]) {
  if (stops.length <= 1) return { route: stops, source: 'estimate' as const };
  const matrix = await roadMatrix([start, ...stops]);
  if (!matrix) return { route: optimizeRoute(start, stops), source: 'estimate' as const };
  const d = (a: number, b: number) => matrix.minutes[a][b];
  // Indexes: 0 = start, i + 1 = stops[i]
  const remaining = stops.map((_, i) => i + 1);
  const order: number[] = [];
  let current = 0;
  while (remaining.length) {
    let best = 0;
    let bestScore = Infinity;
    remaining.forEach((idx, i) => {
      const score = d(current, idx) / (stops[idx - 1].priorityWeight || 1);
      if (score < bestScore) { bestScore = score; best = i; }
    });
    current = remaining.splice(best, 1)[0];
    order.push(current);
  }
  const total = (r: number[]) => r.reduce((sum, idx, i) => sum + d(i === 0 ? 0 : r[i - 1], idx), 0);
  let route = order;
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 50) {
    improved = false;
    for (let i = 0; i < route.length - 1; i++) {
      for (let k = i + 1; k < route.length; k++) {
        const candidate = [...route.slice(0, i), ...route.slice(i, k + 1).reverse(), ...route.slice(k + 1)];
        if (total(candidate) + 1e-9 < total(route)) { route = candidate; improved = true; }
      }
    }
  }
  return { route: route.map((idx) => stops[idx - 1]), source: 'roads' as const };
}

/** Legs with real road distances and times when available, else estimates. */
export async function roadLegs<T extends Stop>(start: Point, route: T[], departAt = new Date()) {
  const path = route.length ? await roadPath([start, ...route]) : null;
  if (!path) return { ...routeLegs(start, route, departAt), source: 'estimate' as const, line: null as [number, number][] | null };
  let clock = departAt.getTime();
  const legs = route.map((stop, i) => {
    const leg = path.legs[i];
    clock += leg.minutes * 60000;
    const eta = new Date(clock);
    clock += STOP_MINUTES * 60000;
    return { stop, km: Math.round(leg.km * 10) / 10, driveMinutes: Math.round(leg.minutes), eta, late: stop.deadline ? eta > stop.deadline : false };
  });
  return {
    legs,
    totalKm: Math.round(path.km * 10) / 10,
    totalMinutes: Math.round((clock - departAt.getTime()) / 60000),
    source: 'roads' as const,
    line: path.line,
  };
}
