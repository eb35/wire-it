import type { Point, Side } from "./types";

export function sideFromHandle(handleId: string): Side {
  const breaker = handleId.match(/brk-(\d+)/);
  if (breaker) {
    return Number(breaker[1]) % 2 === 1 ? "left" : "right";
  }
  const token = handleId.split("-")[1] ?? "r0";
  const letter = token[0];
  if (letter === "t") return "top";
  if (letter === "b") return "bottom";
  if (letter === "l") return "left";
  return "right";
}

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
