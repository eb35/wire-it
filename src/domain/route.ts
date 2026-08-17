import { GRID_SIZE, locationSize } from "./layout";
import { collapseColinear, connectOrtho, segmentLength, stubPoint } from "./ortho";
import type { Location, Point, Side } from "./types";

export const ROUTE_CLEARANCE = 20;
export const ROUTE_LANE = 14;
export const CORNER_RADIUS = 10;
export const HANDLE_MARGIN = 0.12;
export const LABEL_RUN = 56;
export const ALIGN_EPS = 10;

export type Rect = { x: number; y: number; width: number; height: number };

export function locationRect(
  location: Pick<Location, "position" | "kind" | "capacity" | "spaces">,
): Rect {
  const size = locationSize(location);
  return { x: location.position.x, y: location.position.y, width: size.width, height: size.height };
}

export function inflate(rect: Rect, pad: number): Rect {
  return {
    x: rect.x - pad,
    y: rect.y - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

export function clampHandleT(t: number): number {
  return clamp(t, HANDLE_MARGIN, 1 - HANDLE_MARGIN);
}

export function pointOnSide(rect: Rect, side: Side, t: number): Point {
  const u = clampHandleT(t);
  switch (side) {
    case "top":
      return { x: rect.x + rect.width * u, y: rect.y };
    case "bottom":
      return { x: rect.x + rect.width * u, y: rect.y + rect.height };
    case "left":
      return { x: rect.x, y: rect.y + rect.height * u };
    case "right":
      return { x: rect.x + rect.width, y: rect.y + rect.height * u };
  }
}

export function projectToPerimeter(
  rect: Rect,
  point: Point,
): { side: Side; t: number; point: Point } {
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;
  const clampX = clamp(point.x, left, right);
  const clampY = clamp(point.y, top, bottom);
  const candidates: { side: Side; point: Point }[] = [
    { side: "left", point: { x: left, y: clampY } },
    { side: "right", point: { x: right, y: clampY } },
    { side: "top", point: { x: clampX, y: top } },
    { side: "bottom", point: { x: clampX, y: bottom } },
  ];
  let best = candidates[0]!;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const dist = Math.hypot(point.x - candidate.point.x, point.y - candidate.point.y);
    if (dist < bestDist) {
      best = candidate;
      bestDist = dist;
    }
  }
  const t =
    best.side === "left" || best.side === "right"
      ? (best.point.y - top) / (rect.height || 1)
      : (best.point.x - left) / (rect.width || 1);
  return { side: best.side, t: clampHandleT(t), point: pointOnSide(rect, best.side, t) };
}

export function segmentHitsRect(a: Point, b: Point, rect: Rect, slop = 0.75): boolean {
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  const overlapX = Math.min(maxX, rect.x + rect.width) - Math.max(minX, rect.x);
  const overlapY = Math.min(maxY, rect.y + rect.height) - Math.max(minY, rect.y);
  return overlapX > slop && overlapY > slop;
}

function pathHits(
  path: Point[],
  obstacles: Rect[],
  source?: Rect,
  target?: Rect,
): boolean {
  for (let i = 0; i < path.length - 1; i += 1) {
    const a = path[i]!;
    const b = path[i + 1]!;
    for (const obstacle of obstacles) {
      if (segmentHitsRect(a, b, obstacle)) return true;
    }
    if (i > 0 && source && segmentHitsRect(a, b, source)) return true;
    if (i < path.length - 2 && target && segmentHitsRect(a, b, target)) return true;
  }
  return false;
}

function isOrtho(path: Point[]): boolean {
  for (let i = 0; i < path.length - 1; i += 1) {
    const a = path[i]!;
    const b = path[i + 1]!;
    if (a.x !== b.x && a.y !== b.y) return false;
  }
  return true;
}

function scorePath(path: Point[]): { bends: number; length: number } {
  return {
    bends: Math.max(0, path.length - 2),
    length: path.reduce((sum, point, index) => {
      if (index === 0) return 0;
      return sum + segmentLength(path[index - 1]!, point);
    }, 0),
  };
}

function leavesOutward(path: Point[], start: Point, startSide: Side): boolean {
  if (path.length < 2) return false;
  const next = path[1]!;
  switch (startSide) {
    case "right":
      return next.x >= start.x - 0.5 && Math.abs(next.y - start.y) <= ALIGN_EPS;
    case "left":
      return next.x <= start.x + 0.5 && Math.abs(next.y - start.y) <= ALIGN_EPS;
    case "bottom":
      return next.y >= start.y - 0.5 && Math.abs(next.x - start.x) <= ALIGN_EPS;
    case "top":
      return next.y <= start.y + 0.5 && Math.abs(next.x - start.x) <= ALIGN_EPS;
  }
}

function canGoStraight(start: Point, startSide: Side, end: Point, endSide: Side): boolean {
  if (
    (startSide === "right" && endSide === "left" && end.x > start.x) ||
    (startSide === "left" && endSide === "right" && end.x < start.x)
  ) {
    return Math.abs(start.y - end.y) <= ALIGN_EPS;
  }
  if (
    (startSide === "bottom" && endSide === "top" && end.y > start.y) ||
    (startSide === "top" && endSide === "bottom" && end.y < start.y)
  ) {
    return Math.abs(start.x - end.x) <= ALIGN_EPS;
  }
  return false;
}

function straightPath(start: Point, startSide: Side, end: Point): Point[] {
  if (startSide === "left" || startSide === "right") {
    return collapseColinear([start, { x: end.x, y: start.y }, end]);
  }
  return collapseColinear([start, { x: start.x, y: end.y }, end]);
}

function elbowPaths(start: Point, startSide: Side, end: Point, endSide: Side): Point[][] {
  const leave = stubPoint(start, startSide, LABEL_RUN);
  const arrive = stubPoint(end, endSide, LABEL_RUN);
  return [
    collapseColinear([start, leave, { x: arrive.x, y: leave.y }, arrive, end]),
    collapseColinear([start, leave, { x: leave.x, y: arrive.y }, arrive, end]),
    collapseColinear([start, leave, { x: end.x, y: leave.y }, end]),
    collapseColinear([start, { x: start.x, y: end.y }, end]),
    collapseColinear([start, { x: end.x, y: start.y }, end]),
  ];
}

function aroundRect(
  start: Point,
  startSide: Side,
  end: Point,
  endSide: Side,
  rect: Rect,
  lane: number,
): Point[][] {
  const pad = ROUTE_CLEARANCE + lane * ROUTE_LANE;
  const top = rect.y - pad;
  const bottom = rect.y + rect.height + pad;
  const left = rect.x - pad;
  const right = rect.x + rect.width + pad;
  const leave = stubPoint(start, startSide, Math.max(LABEL_RUN, pad));
  const arrive = stubPoint(end, endSide, Math.max(LABEL_RUN, pad));
  const via = (...mid: Point[]) => collapseColinear([start, leave, ...mid, arrive, end]);
  return [
    via({ x: leave.x, y: top }, { x: arrive.x, y: top }),
    via({ x: leave.x, y: bottom }, { x: arrive.x, y: bottom }),
    via({ x: left, y: leave.y }, { x: left, y: arrive.y }),
    via({ x: right, y: leave.y }, { x: right, y: arrive.y }),
    via({ x: left, y: leave.y }, { x: left, y: top }, { x: arrive.x, y: top }),
    via({ x: left, y: leave.y }, { x: left, y: bottom }, { x: arrive.x, y: bottom }),
    via({ x: right, y: leave.y }, { x: right, y: top }, { x: arrive.x, y: top }),
    via({ x: right, y: leave.y }, { x: right, y: bottom }, { x: arrive.x, y: bottom }),
    via({ x: leave.x, y: top }, { x: right, y: top }, { x: right, y: arrive.y }),
    via({ x: leave.x, y: top }, { x: left, y: top }, { x: left, y: arrive.y }),
    via({ x: leave.x, y: bottom }, { x: right, y: bottom }, { x: right, y: arrive.y }),
    via({ x: leave.x, y: bottom }, { x: left, y: bottom }, { x: left, y: arrive.y }),
  ];
}

export function autoRoute(
  start: Point,
  startSide: Side,
  end: Point,
  endSide: Side,
  obstacles: Rect[],
  lane = 0,
  source?: Rect,
  target?: Rect,
): Point[] {
  const candidates: Point[][] = [];
  if (canGoStraight(start, startSide, end, endSide)) {
    candidates.push(straightPath(start, startSide, end));
  }
  candidates.push(...elbowPaths(start, startSide, end, endSide));
  for (const obstacle of obstacles) {
    candidates.push(...aroundRect(start, startSide, end, endSide, obstacle, lane));
  }
  if (source) candidates.push(...aroundRect(start, startSide, end, endSide, source, lane));
  if (target) candidates.push(...aroundRect(start, startSide, end, endSide, target, lane));

  const valid = candidates
    .map((path) => collapseColinear(path))
    .filter(
      (path) =>
        isOrtho(path) &&
        leavesOutward(path, start, startSide) &&
        !pathHits(path, obstacles, source, target),
    );

  valid.sort((a, b) => {
    const sa = scorePath(a);
    const sb = scorePath(b);
    return sa.bends - sb.bends || sa.length - sb.length;
  });

  return (
    valid[0] ??
    collapseColinear([
      start,
      stubPoint(start, startSide, LABEL_RUN),
      stubPoint(end, endSide, LABEL_RUN),
      end,
    ])
  );
}

export function alignedHandleT(
  from: Rect,
  fromSide: Side,
  to: Rect,
  toSide: Side,
  lane: number,
): { sourceT: number; targetT: number } {
  const spread = (lane % 2 === 0 ? 1 : -1) * Math.ceil(lane / 2) * 0.16;
  const horizontal =
    (fromSide === "left" || fromSide === "right") && (toSide === "left" || toSide === "right");
  const vertical =
    (fromSide === "top" || fromSide === "bottom") && (toSide === "top" || toSide === "bottom");

  if (horizontal) {
    const fromTop = from.y + from.height * HANDLE_MARGIN;
    const fromBottom = from.y + from.height * (1 - HANDLE_MARGIN);
    const toTop = to.y + to.height * HANDLE_MARGIN;
    const toBottom = to.y + to.height * (1 - HANDLE_MARGIN);
    const overlapTop = Math.max(fromTop, toTop);
    const overlapBottom = Math.min(fromBottom, toBottom);
    if (overlapBottom - overlapTop > 8) {
      const y = clamp(
        Math.round(((overlapTop + overlapBottom) / 2 + spread * GRID_SIZE) / GRID_SIZE) * GRID_SIZE,
        overlapTop,
        overlapBottom,
      );
      return {
        sourceT: clampHandleT((y - from.y) / from.height),
        targetT: clampHandleT((y - to.y) / to.height),
      };
    }
  }

  if (vertical) {
    const fromLeft = from.x + from.width * HANDLE_MARGIN;
    const fromRight = from.x + from.width * (1 - HANDLE_MARGIN);
    const toLeft = to.x + to.width * HANDLE_MARGIN;
    const toRight = to.x + to.width * (1 - HANDLE_MARGIN);
    const overlapLeft = Math.max(fromLeft, toLeft);
    const overlapRight = Math.min(fromRight, toRight);
    if (overlapRight - overlapLeft > 8) {
      const x = clamp(
        Math.round(((overlapLeft + overlapRight) / 2 + spread * GRID_SIZE) / GRID_SIZE) * GRID_SIZE,
        overlapLeft,
        overlapRight,
      );
      return {
        sourceT: clampHandleT((x - from.x) / from.width),
        targetT: clampHandleT((x - to.x) / to.width),
      };
    }
  }

  return {
    sourceT: clampHandleT(0.5 + spread),
    targetT: clampHandleT(0.5 + spread),
  };
}

export function sidePairScore(from: Rect, fromSide: Side, to: Rect, toSide: Side): number {
  const align = alignedHandleT(from, fromSide, to, toSide, 0);
  const start = pointOnSide(from, fromSide, align.sourceT);
  const end = pointOnSide(to, toSide, align.targetT);
  if (canGoStraight(start, fromSide, end, toSide)) return 0;
  if (
    (fromSide === "right" || fromSide === "left") !== (toSide === "right" || toSide === "left")
  ) {
    return 1;
  }
  return 2;
}

export function facingSides(from: Rect, to: Rect): { source: Side; target: Side } {
  const fromC = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const toC = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
  const dx = toC.x - fromC.x;
  const dy = toC.y - fromC.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { source: "right", target: "left" }
      : { source: "left", target: "right" };
  }
  return dy >= 0 ? { source: "bottom", target: "top" } : { source: "top", target: "bottom" };
}

export function buildCablePath(
  start: Point,
  startSide: Side,
  waypoints: Point[],
  end: Point,
  endSide: Side,
  obstacles: Rect[] = [],
  lane = 0,
  source?: Rect,
  target?: Rect,
): Point[] {
  if (waypoints.length > 0) {
    return connectOrtho([start, ...waypoints, end]);
  }
  return autoRoute(start, startSide, end, endSide, obstacles, lane, source, target);
}
