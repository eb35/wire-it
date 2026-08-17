import type { BoxCapacity, Location, Point } from "./types";

export const GANG_UNIT = 96;
export const BOX_CAPTION = 34;
export const PANEL_WIDTH = 176;
export const PANEL_HEADER = 56;
export const PANEL_ROW = 34;
export const EXTERNAL_SIZE = { width: 148, height: 100 };
export const CABLE_SNAP_DISTANCE = 88;

export function boxBodySize(capacity: BoxCapacity): { width: number; height: number } {
  return { width: GANG_UNIT * capacity, height: GANG_UNIT * 2 };
}

export function boxSize(capacity: BoxCapacity): { width: number; height: number } {
  const body = boxBodySize(capacity);
  return { width: body.width, height: body.height + BOX_CAPTION };
}

export function panelSize(spaces: number): { width: number; height: number } {
  const rows = Math.max(1, Math.ceil(spaces / 2));
  return { width: PANEL_WIDTH, height: PANEL_HEADER + rows * PANEL_ROW };
}

export function locationSize(
  location: Pick<Location, "kind" | "capacity" | "spaces">,
): { width: number; height: number } {
  if (location.kind === "panel") return panelSize(location.spaces);
  if (location.kind === "external") return EXTERNAL_SIZE;
  return boxSize(location.capacity);
}

export function locationCenter(location: Location): Point {
  const { width, height } = locationSize(location);
  return { x: location.position.x + width / 2, y: location.position.y + height / 2 };
}

export function pointInLocation(location: Location, point: Point): boolean {
  const { width, height } = locationSize(location);
  return (
    point.x >= location.position.x &&
    point.x <= location.position.x + width &&
    point.y >= location.position.y &&
    point.y <= location.position.y + height
  );
}

export function distanceToLocation(location: Location, point: Point): number {
  const { width, height } = locationSize(location);
  const nearestX = Math.max(location.position.x, Math.min(point.x, location.position.x + width));
  const nearestY = Math.max(location.position.y, Math.min(point.y, location.position.y + height));
  return Math.hypot(point.x - nearestX, point.y - nearestY);
}

export function nearestLocation(
  locations: Location[],
  point: Point,
  maxDistance = CABLE_SNAP_DISTANCE,
): Location | null {
  let best: Location | null = null;
  let bestDistance = maxDistance;
  for (const location of locations) {
    const distance = distanceToLocation(location, point);
    if (distance <= bestDistance) {
      best = location;
      bestDistance = distance;
    }
  }
  return best;
}
