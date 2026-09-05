import { PANEL_HEADER, PANEL_ROW, panelSize } from "./layout";
import { nextPort } from "./ports";
import {
  alignedHandleT,
  clampHandleT,
  facingSides,
  HANDLE_MARGIN,
  locationRect,
  pointOnSide,
  sidePairScore,
} from "./route";
import type { Cable, Location, Point, Side } from "./types";

const SIDES: Side[] = ["top", "right", "bottom", "left"];
const SIDE_PAIRS: [Side, Side][] = [
  ["right", "left"],
  ["left", "right"],
  ["bottom", "top"],
  ["top", "bottom"],
  ["right", "top"],
  ["right", "bottom"],
  ["left", "top"],
  ["left", "bottom"],
  ["top", "right"],
  ["top", "left"],
  ["bottom", "right"],
  ["bottom", "left"],
];
const LETTER: Record<Side, string> = { top: "t", right: "r", bottom: "b", left: "l" };
const FROM_LETTER: Record<string, Side> = { t: "top", r: "right", b: "bottom", l: "left" };

export type ParsedHandle = {
  role: "source" | "target";
  side: Side;
  t: number;
  breaker?: number;
  id: string;
};

export type LocationLanding = {
  cableId: string;
  handleId: string;
  role: "source" | "target";
  side: Side;
  t: number;
};

export function oppositeSide(side: Side): Side {
  switch (side) {
    case "top":
      return "bottom";
    case "bottom":
      return "top";
    case "left":
      return "right";
    case "right":
      return "left";
  }
}

export function formatHandle(role: "source" | "target", side: Side, t: number): string {
  const prefix = role === "source" ? "s" : "t";
  return `${prefix}-${LETTER[side]}-${Math.round(Math.min(1, Math.max(0, t)) * 100)}`;
}

export function uniqueBoxHandle(
  role: "source" | "target",
  side: Side,
  t: number,
  locationId: string,
  cables: Cable[],
): string {
  const used = usedHandles(locationId, role, cables);
  const min = Math.round(HANDLE_MARGIN * 100);
  const max = Math.round((1 - HANDLE_MARGIN) * 100);
  const start = Math.round(clampHandleT(t) * 100);
  for (let i = 0; i <= max - min; i += 1) {
    const delta = i === 0 ? 0 : Math.ceil(i / 2) * (i % 2 === 0 ? 1 : -1);
    const pct = Math.min(max, Math.max(min, start + delta));
    const id = formatHandle(role, side, pct / 100);
    if (!used.has(id)) return id;
  }
  return formatHandle(role, side, t);
}

export function formatBreakerHandle(role: "source" | "target", number: number): string {
  const prefix = role === "source" ? "s" : "t";
  return `${prefix}-brk-${number}`;
}

export function parseHandle(id: string | null | undefined): ParsedHandle {
  const value = id ?? "s-r-50";
  const role: "source" | "target" = value.startsWith("t") ? "target" : "source";
  const breaker = value.match(/brk-(\d+)/);
  if (breaker) {
    const number = Number(breaker[1]);
    return {
      role,
      side: number % 2 === 1 ? "left" : "right",
      t: 0.5,
      breaker: number,
      id: value,
    };
  }
  const offset = value.match(/^([st])-([trbl])-(\d+)$/);
  if (offset) {
    return {
      role,
      side: FROM_LETTER[offset[2]!] ?? "right",
      t: Number(offset[3]) / 100,
      id: value,
    };
  }
  const sideOnly = value.match(/^([st])-([trbl])$/);
  if (sideOnly) {
    return {
      role,
      side: FROM_LETTER[sideOnly[2]!] ?? "right",
      t: 0.5,
      id: value,
    };
  }
  const legacy = value.match(/^([st])-([trbl])(\d)$/);
  if (legacy) {
    const index = Number(legacy[3]);
    return {
      role,
      side: FROM_LETTER[legacy[2]!] ?? "right",
      t: (28 + index * 22) / 100,
      id: value,
    };
  }
  return { role, side: "right", t: 0.5, id: value };
}

export function sideFromHandle(handleId: string): Side {
  return parseHandle(handleId).side;
}

export function handlesForSide(role: "source" | "target", side: Side): string[] {
  return [formatHandle(role, side, 0.5)];
}

export function facingSide(from: Point, to: Point): Side {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx >= 0 ? "right" : "left";
  }
  return dy >= 0 ? "bottom" : "top";
}

export function breakerFromHandle(handle: string | null | undefined): string | null {
  const match = handle?.match(/brk-(\d+)/);
  return match?.[1] ?? null;
}

export function breakerOffsetT(number: number, spaces: number): number {
  const row = Math.floor((number - 1) / 2);
  const height = panelSize(spaces).height || 1;
  return (PANEL_HEADER + row * PANEL_ROW + PANEL_ROW / 2) / height;
}

export function portForHandle(location: Location, handle: string, cables: Cable[]): string {
  if (location.kind === "panel") {
    return breakerFromHandle(handle) ?? nextPort(location.id, cables);
  }
  return nextPort(location.id, cables);
}

function firstFree(ids: string[], used: Set<string>): string {
  return ids.find((id) => !used.has(id)) ?? ids[0]!;
}

function usedHandles(locationId: string, role: "source" | "target", cables: Cable[]): Set<string> {
  return new Set(
    cables
      .filter((cable) => (role === "source" ? cable.source : cable.target) === locationId)
      .map((cable) => (role === "source" ? cable.sourceHandle : cable.targetHandle)),
  );
}

function panelHandleIds(role: "source" | "target", spaces: number, preferSide: Side): string[] {
  const numbers = Array.from({ length: spaces }, (_, index) => index + 1);
  const preferOdd = preferSide === "left" || preferSide === "top";
  const preferred = numbers.filter((number) => (number % 2 === 1) === preferOdd);
  const rest = numbers.filter((number) => !preferred.includes(number));
  return [...preferred, ...rest].map((number) => formatBreakerHandle(role, number));
}

function isLockedHandle(parsed: ParsedHandle | null): boolean {
  if (!parsed) return false;
  if (parsed.breaker) return true;
  return /-[trbl]-\d+$/.test(parsed.id);
}

function bestTargetSide(from: ReturnType<typeof locationRect>, fromSide: Side, to: ReturnType<typeof locationRect>): Side {
  let best: Side = "left";
  let bestScore = 99;
  for (const side of SIDES) {
    const score = sidePairScore(from, fromSide, to, side);
    if (score < bestScore) {
      best = side;
      bestScore = score;
    }
  }
  return best;
}

export function pickConnection(
  source: Location,
  target: Location,
  cables: Cable[],
  preferSourceHandle?: string | null,
  preferTargetHandle?: string | null,
): { sourceHandle: string; targetHandle: string; sourceSide: Side; targetSide: Side } {
  const sourceRect = locationRect(source);
  const targetRect = locationRect(target);
  const facing = facingSides(sourceRect, targetRect);
  const lane = countCablesBetween(cables, source.id, target.id);
  const preferSource = preferSourceHandle ? parseHandle(preferSourceHandle) : null;
  const preferTarget = preferTargetHandle ? parseHandle(preferTargetHandle) : null;
  const sourceLocked = isLockedHandle(preferSource);
  const targetLocked = isLockedHandle(preferTarget);

  let sourceSide = facing.source;
  let targetSide = facing.target;
  if (sourceLocked && preferSource) sourceSide = preferSource.side;
  if (targetLocked && preferTarget) targetSide = preferTarget.side;
  if (!sourceLocked && !targetLocked) {
    let bestScore = sidePairScore(sourceRect, facing.source, targetRect, facing.target);
    for (const [fromSide, toSide] of SIDE_PAIRS) {
      const score = sidePairScore(sourceRect, fromSide, targetRect, toSide);
      if (score < bestScore) {
        bestScore = score;
        sourceSide = fromSide;
        targetSide = toSide;
      }
    }
  } else if (sourceLocked && !targetLocked) {
    targetSide = bestTargetSide(sourceRect, sourceSide, targetRect);
  } else if (targetLocked && !sourceLocked) {
    sourceSide = bestTargetSide(targetRect, targetSide, sourceRect);
  }

  const align = alignedHandleT(sourceRect, sourceSide, targetRect, targetSide, lane);
  let sourceT = align.sourceT;
  let targetT = align.targetT;
  if (sourceLocked && preferSource && !preferSource.breaker) {
    sourceT = preferSource.t;
    const start = pointOnSide(sourceRect, sourceSide, sourceT);
    if (targetSide === "left" || targetSide === "right") {
      targetT = (start.y - targetRect.y) / (targetRect.height || 1);
    } else {
      targetT = (start.x - targetRect.x) / (targetRect.width || 1);
    }
  }
  if (targetLocked && preferTarget && !preferTarget.breaker) {
    targetT = preferTarget.t;
    const end = pointOnSide(targetRect, targetSide, targetT);
    if (sourceSide === "left" || sourceSide === "right") {
      sourceT = (end.y - sourceRect.y) / (sourceRect.height || 1);
    } else {
      sourceT = (end.x - sourceRect.x) / (sourceRect.width || 1);
    }
  }

  let sourceHandle: string;
  let targetHandle: string;

  if (source.kind === "panel") {
    sourceHandle = preferSource?.breaker
      ? formatBreakerHandle("source", preferSource.breaker)
      : firstFree(
          panelHandleIds("source", source.spaces, sourceSide),
          usedHandles(source.id, "source", cables),
        );
    sourceSide = parseHandle(sourceHandle).side;
  } else if (sourceLocked) {
    sourceHandle = formatHandle("source", sourceSide, sourceT);
  } else {
    sourceHandle = uniqueBoxHandle("source", sourceSide, sourceT, source.id, cables);
  }

  if (target.kind === "panel") {
    targetHandle = preferTarget?.breaker
      ? formatBreakerHandle("target", preferTarget.breaker)
      : firstFree(
          panelHandleIds("target", target.spaces, targetSide),
          usedHandles(target.id, "target", cables),
        );
    targetSide = parseHandle(targetHandle).side;
  } else if (targetLocked) {
    targetHandle = formatHandle("target", targetSide, targetT);
  } else {
    targetHandle = uniqueBoxHandle("target", targetSide, targetT, target.id, cables);
  }

  return { sourceHandle, targetHandle, sourceSide, targetSide };
}

export function pickHandles(
  source: Location,
  target: Location,
  cables: Cable[],
): { sourceHandle: string; targetHandle: string; sourceSide: Side; targetSide: Side } {
  return pickConnection(source, target, cables);
}

export function initialWaypoints(
  _source: Location,
  _target: Location,
  _existingBetween: number,
): Point[] {
  return [];
}

export function countCablesBetween(cables: Cable[], a: string, b: string): number {
  return cables.filter(
    (cable) =>
      (cable.source === a && cable.target === b) || (cable.source === b && cable.target === a),
  ).length;
}

export function cableLane(cables: Cable[], cable: Cable): number {
  const peers = cables.filter(
    (item) =>
      (item.source === cable.source && item.target === cable.target) ||
      (item.source === cable.target && item.target === cable.source),
  );
  const index = peers.findIndex((item) => item.id === cable.id);
  return Math.max(0, index);
}

export function landingPoint(
  location: Pick<Location, "position" | "kind" | "capacity" | "spaces">,
  handleId: string,
): Point {
  const parsed = parseHandle(handleId);
  const rect = locationRect(location);
  const t =
    parsed.breaker != null && location.kind === "panel"
      ? breakerOffsetT(parsed.breaker, location.spaces)
      : parsed.t;
  return pointOnSide(rect, parsed.side, t);
}

export function landingsForLocation(locationId: string, cables: Cable[]): LocationLanding[] {
  const landings: LocationLanding[] = [];
  for (const cable of cables) {
    if (cable.source === locationId) {
      const parsed = parseHandle(cable.sourceHandle);
      landings.push({
        cableId: cable.id,
        handleId: cable.sourceHandle,
        role: "source",
        side: parsed.side,
        t: parsed.t,
      });
    }
    if (cable.target === locationId) {
      const parsed = parseHandle(cable.targetHandle);
      landings.push({
        cableId: cable.id,
        handleId: cable.targetHandle,
        role: "target",
        side: parsed.side,
        t: parsed.t,
      });
    }
  }
  return landings;
}

export function handleStyle(
  side: Side,
  t: number,
): { position: "top" | "right" | "bottom" | "left"; style: { left?: string; top?: string } } {
  const pct = `${Math.round(Math.min(1, Math.max(0, t)) * 100)}%`;
  if (side === "top") return { position: "top", style: { left: pct } };
  if (side === "bottom") return { position: "bottom", style: { left: pct } };
  if (side === "left") return { position: "left", style: { top: pct } };
  return { position: "right", style: { top: pct } };
}

export function allHandleIds(): { source: string[]; target: string[] } {
  return {
    source: SIDES.flatMap((side) => handlesForSide("source", side)),
    target: SIDES.flatMap((side) => handlesForSide("target", side)),
  };
}
