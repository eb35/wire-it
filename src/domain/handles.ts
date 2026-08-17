import { locationCenter } from "./layout";
import { nextPort } from "./ports";
import type { Cable, Location, Point, Side } from "./types";

const SIDES: Side[] = ["top", "right", "bottom", "left"];

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

export function handlesForSide(role: "source" | "target", side: Side): string[] {
  const prefix = role === "source" ? "s" : "t";
  const letter = side[0];
  return [0, 1, 2].map((index) => `${prefix}-${letter}${index}`);
}

export function facingSide(from: Point, to: Point): Side {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx >= 0 ? "right" : "left";
  }
  return dy >= 0 ? "bottom" : "top";
}

function nodeCenter(location: Location): Point {
  return locationCenter(location);
}

export function breakerFromHandle(handle: string | null | undefined): string | null {
  const match = handle?.match(/brk-(\d+)/);
  return match?.[1] ?? null;
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
  const prefix = role === "source" ? "s" : "t";
  const numbers = Array.from({ length: spaces }, (_, index) => index + 1);
  const preferOdd = preferSide === "left" || preferSide === "top";
  const preferred = numbers.filter((number) => (number % 2 === 1) === preferOdd);
  const rest = numbers.filter((number) => !preferred.includes(number));
  return [...preferred, ...rest].map((number) => `${prefix}-brk-${number}`);
}

function handlesForLocation(
  location: Location,
  role: "source" | "target",
  side: Side,
): string[] {
  if (location.kind === "panel") {
    return panelHandleIds(role, location.spaces, side);
  }
  return handlesForSide(role, side);
}

export function pickHandles(
  source: Location,
  target: Location,
  cables: Cable[],
): { sourceHandle: string; targetHandle: string; sourceSide: Side; targetSide: Side } {
  const sourceSide = facingSide(nodeCenter(source), nodeCenter(target));
  const targetSide = oppositeSide(sourceSide);
  return {
    sourceHandle: firstFree(
      handlesForLocation(source, "source", sourceSide),
      usedHandles(source.id, "source", cables),
    ),
    targetHandle: firstFree(
      handlesForLocation(target, "target", targetSide),
      usedHandles(target.id, "target", cables),
    ),
    sourceSide,
    targetSide,
  };
}

export function initialWaypoints(
  source: Location,
  target: Location,
  existingBetween: number,
): Point[] {
  const start = nodeCenter(source);
  const end = nodeCenter(target);
  const offset = (existingBetween % 2 === 0 ? 1 : -1) * Math.ceil((existingBetween + 1) / 2) * 28;
  if (Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)) {
    const midX = (start.x + end.x) / 2 + offset;
    return [
      { x: midX, y: start.y },
      { x: midX, y: end.y },
    ];
  }
  const midY = (start.y + end.y) / 2 + offset;
  return [
    { x: start.x, y: midY },
    { x: end.x, y: midY },
  ];
}

export function countCablesBetween(
  cables: Cable[],
  a: string,
  b: string,
): number {
  return cables.filter(
    (cable) =>
      (cable.source === a && cable.target === b) ||
      (cable.source === b && cable.target === a),
  ).length;
}

export function allHandleIds(): { source: string[]; target: string[] } {
  return {
    source: SIDES.flatMap((side) => handlesForSide("source", side)),
    target: SIDES.flatMap((side) => handlesForSide("target", side)),
  };
}
