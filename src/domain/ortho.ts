import type { Point, Side } from "./types";

export function stubPoint(point: Point, side: Side, length = 24): Point {
  switch (side) {
    case "right":
      return { x: point.x + length, y: point.y };
    case "left":
      return { x: point.x - length, y: point.y };
    case "bottom":
      return { x: point.x, y: point.y + length };
    case "top":
      return { x: point.x, y: point.y - length };
  }
}

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

function aligned(a: Point, b: Point): boolean {
  return a.x === b.x || a.y === b.y;
}

export function collapseColinear(points: Point[]): Point[] {
  if (points.length < 3) return points.map((point) => ({ ...point }));
  const out: Point[] = [{ ...points[0]! }];
  for (let i = 1; i < points.length - 1; i += 1) {
    const previous = out[out.length - 1]!;
    const current = points[i]!;
    const next = points[i + 1]!;
    const colinear =
      (previous.x === current.x && current.x === next.x) ||
      (previous.y === current.y && current.y === next.y);
    if (!colinear && !samePoint(previous, current)) {
      out.push({ ...current });
    }
  }
  const last = points[points.length - 1]!;
  if (!samePoint(out[out.length - 1]!, last)) {
    out.push({ ...last });
  }
  return out;
}

function pointLineDistance(point: Point, a: Point, b: Point): number {
  if (a.x === b.x) return Math.abs(point.x - a.x);
  if (a.y === b.y) return Math.abs(point.y - a.y);
  return Math.hypot(point.x - a.x, point.y - a.y);
}

export function collapseNearColinear(points: Point[], epsilon = 10): Point[] {
  if (points.length < 3) return points.map((point) => ({ ...point }));
  const out: Point[] = [{ ...points[0]! }];
  for (let i = 1; i < points.length - 1; i += 1) {
    const previous = out[out.length - 1]!;
    const current = points[i]!;
    const next = points[i + 1]!;
    if (samePoint(previous, current)) continue;
    if (pointLineDistance(current, previous, next) <= epsilon) continue;
    out.push({ ...current });
  }
  const last = points[points.length - 1]!;
  if (!samePoint(out[out.length - 1]!, last)) out.push({ ...last });
  return collapseColinear(out);
}

export function connectOrtho(points: Point[]): Point[] {
  if (points.length === 0) return [];
  const path: Point[] = [{ ...points[0]! }];
  for (let i = 1; i < points.length; i += 1) {
    const previous = path[path.length - 1]!;
    const current = points[i]!;
    if (samePoint(previous, current)) continue;
    if (aligned(previous, current)) {
      path.push({ ...current });
      continue;
    }
    path.push({ x: current.x, y: previous.y });
    path.push({ ...current });
  }
  return collapseColinear(path);
}

export function buildOrthoPath(
  start: Point,
  startSide: Side,
  waypoints: Point[],
  end: Point,
  endSide: Side,
): Point[] {
  const raw = [
    start,
    stubPoint(start, startSide),
    ...waypoints,
    stubPoint(end, endSide),
    end,
  ];
  const path: Point[] = [{ ...raw[0]! }];
  for (let i = 1; i < raw.length; i += 1) {
    const previous = path[path.length - 1]!;
    const current = raw[i]!;
    if (samePoint(previous, current)) continue;
    if (aligned(previous, current)) {
      path.push({ ...current });
      continue;
    }
    const before = path[path.length - 2];
    const lastWasVertical = before
      ? before.x === previous.x
      : startSide === "top" || startSide === "bottom";
    path.push(
      lastWasVertical
        ? { x: current.x, y: previous.y }
        : { x: previous.x, y: current.y },
    );
    path.push({ ...current });
  }
  return collapseColinear(path);
}

export function isHorizontalSegment(a: Point, b: Point): boolean {
  return Math.abs(a.y - b.y) <= Math.abs(a.x - b.x);
}

export function segmentMid(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function segmentLength(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function movePathSegment(path: Point[], segmentIndex: number, pointer: Point): Point[] {
  if (path.length < 2) return path.map((point) => ({ ...point }));
  const last = path.length - 1;
  if (segmentIndex < 0 || segmentIndex >= last) return path.slice(1, -1);

  if (path.length === 2) {
    const start = path[0]!;
    const end = path[1]!;
    if (isHorizontalSegment(start, end)) {
      return collapseNearColinear([
        start,
        { x: start.x, y: pointer.y },
        { x: end.x, y: pointer.y },
        end,
      ]).slice(1, -1);
    }
    return collapseNearColinear([
      start,
      { x: pointer.x, y: start.y },
      { x: pointer.x, y: end.y },
      end,
    ]).slice(1, -1);
  }

  const next = path.map((point) => ({ ...point }));
  const a = next[segmentIndex]!;
  const b = next[segmentIndex + 1]!;
  if (isHorizontalSegment(a, b)) {
    if (segmentIndex > 0) next[segmentIndex] = { x: a.x, y: pointer.y };
    if (segmentIndex + 1 < last) next[segmentIndex + 1] = { x: b.x, y: pointer.y };
  } else {
    if (segmentIndex > 0) next[segmentIndex] = { x: pointer.x, y: a.y };
    if (segmentIndex + 1 < last) next[segmentIndex + 1] = { x: pointer.x, y: b.y };
  }
  return collapseNearColinear(next).slice(1, -1);
}

export function removePathVertex(path: Point[], vertexIndex: number): Point[] {
  if (vertexIndex <= 0 || vertexIndex >= path.length - 1) return path.slice(1, -1);
  return connectOrtho(path.filter((_, index) => index !== vertexIndex)).slice(1, -1);
}

export function moveOrthoSegment(
  start: Point,
  startSide: Side,
  waypoints: Point[],
  end: Point,
  endSide: Side,
  segmentIndex: number,
  pointer: Point,
): Point[] {
  const path = buildOrthoPath(start, startSide, waypoints, end, endSide);
  const last = path.length - 1;
  if (segmentIndex < 0 || segmentIndex >= last) return waypoints;

  if (path.length === 2) {
    if (isHorizontalSegment(start, end)) {
      return collapseColinear([
        start,
        { x: start.x, y: pointer.y },
        { x: end.x, y: pointer.y },
        end,
      ]).slice(1, -1);
    }
    return collapseColinear([
      start,
      { x: pointer.x, y: start.y },
      { x: pointer.x, y: end.y },
      end,
    ]).slice(1, -1);
  }

  const next = path.map((point) => ({ ...point }));
  const a = next[segmentIndex]!;
  const b = next[segmentIndex + 1]!;
  if (isHorizontalSegment(a, b)) {
    if (segmentIndex > 0) next[segmentIndex] = { x: a.x, y: pointer.y };
    if (segmentIndex + 1 < last) next[segmentIndex + 1] = { x: b.x, y: pointer.y };
  } else {
    if (segmentIndex > 0) next[segmentIndex] = { x: pointer.x, y: a.y };
    if (segmentIndex + 1 < last) next[segmentIndex + 1] = { x: pointer.x, y: b.y };
  }

  return collapseColinear(next).slice(1, -1);
}

export function pathToD(points: Point[]): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function pointToward(from: Point, to: Point, distance: number): Point {
  const length = segmentLength(from, to) || 1;
  const t = Math.min(1, distance / length);
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

export function pathToRoundedD(points: Point[], radius = 10): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`;
  if (points.length === 2) {
    return `M ${points[0]!.x} ${points[0]!.y} L ${points[1]!.x} ${points[1]!.y}`;
  }
  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const next = points[i + 1]!;
    const r = Math.min(radius, segmentLength(prev, curr) / 2, segmentLength(curr, next) / 2);
    if (r < 1.5) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }
    const incoming = pointToward(curr, prev, r);
    const outgoing = pointToward(curr, next, r);
    d += ` L ${incoming.x} ${incoming.y} Q ${curr.x} ${curr.y} ${outgoing.x} ${outgoing.y}`;
  }
  const last = points[points.length - 1]!;
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export function pathLength(points: Point[]): number {
  let length = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    length += segmentLength(points[i]!, points[i + 1]!);
  }
  return length;
}

export function alongSegment(
  from: Point,
  toward: Point,
  along = 28,
  perp = 14,
): { point: Point; angle: number } {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  let nx = -uy;
  let ny = ux;
  if (angle > 90 || angle < -90) {
    angle += 180;
    nx = -nx;
    ny = -ny;
  }
  const travel = Math.min(along, Math.max(12, length * 0.35));
  return {
    point: {
      x: from.x + ux * travel + nx * perp,
      y: from.y + uy * travel + ny * perp,
    },
    angle,
  };
}

export function labelAnchor(
  from: Point,
  toward: Point,
  along = 26,
  perp = 16,
): Point {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  return {
    x: from.x + (dx / length) * along + nx * perp,
    y: from.y + (dy / length) * along + ny * perp,
  };
}
