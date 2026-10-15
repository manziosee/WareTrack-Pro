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
