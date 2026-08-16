import type { Point } from "./types";

function dist2(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function distToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length2 = dx * dx + dy * dy;
  if (length2 === 0) return dist2(point, a);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length2));
  return dist2(point, { x: a.x + t * dx, y: a.y + t * dy });
}

export function insertWaypoint(
  waypoints: Point[],
  start: Point,
  end: Point,
  point: Point,
): Point[] {
  const points = [start, ...waypoints, end];
  let bestIndex = 1;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length - 1; i += 1) {
    const distance = distToSegment(point, points[i]!, points[i + 1]!);
    if (distance < bestDist) {
      bestDist = distance;
      bestIndex = i + 1;
    }
  }
  const next = waypoints.slice();
  next.splice(bestIndex - 1, 0, point);
  return next;
}

export function updateWaypoint(waypoints: Point[], index: number, point: Point): Point[] {
  return waypoints.map((waypoint, i) => (i === index ? point : waypoint));
}

export function removeWaypoint(waypoints: Point[], index: number): Point[] {
  return waypoints.filter((_, i) => i !== index);
}
