export type RoutePoint = { x: number; y: number };
export type DeviceRect = { x: number; y: number; width: number; height: number };
export type RouteKind = "stub" | "left" | "right" | "top" | "nut";

export const EXIT_GAP = 12;
export const LANE_GAP = 18;
export const NUT_APPROACH = 28;
export const TERMINAL_HANDLE = 16;
export const DEVICE_CLEAR = 24;

export function jacketExits(
  jacket: { x: number; y: number; width: number; height: number },
  count: number,
  gap = EXIT_GAP,
): RoutePoint[] {
  if (count <= 0) return [];
  const start = jacket.y + jacket.height / 2 - ((count - 1) * gap) / 2;
  return Array.from({ length: count }, (_, index) => ({
    x: jacket.x + jacket.width,
    y: start + index * gap,
  }));
}

export function laneXs(count: number, startX: number, endX?: number, gap = LANE_GAP): number[] {
  if (count <= 0) return [];
  if (endX == null) {
    return Array.from({ length: count }, (_, index) => startX + index * gap);
  }
  if (count === 1) return [Math.min(endX, startX)];
  const span = Math.max(0, endX - startX);
  const step = Math.min(gap, Math.max(8, span / (count - 1)));
  return Array.from({ length: count }, (_, index) => startX + index * step);
}

export function nutApproach(
  nut: RoutePoint,
  index: number,
  total: number,
  radius = NUT_APPROACH,
): RoutePoint {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
  return {
    x: nut.x + Math.cos(angle) * radius,
    y: nut.y + Math.sin(angle) * radius,
  };
}

export function terminalHandle(
  screw: RoutePoint,
  side: "left" | "right" | "top",
  offset = TERMINAL_HANDLE,
): RoutePoint {
  if (side === "top") return { x: screw.x, y: screw.y - offset };
  if (side === "left") return { x: screw.x - offset, y: screw.y };
  return { x: screw.x + offset, y: screw.y };
}

export function routeToHandle(
  exit: RoutePoint,
  handle: RoutePoint,
  laneX: number,
  kind: RouteKind,
  device?: DeviceRect,
): RoutePoint[] {
  if (kind === "stub") return [exit, handle];

  const gutterX = device ? Math.min(laneX, device.x - DEVICE_CLEAR) : laneX;

  if (kind === "left") {
    const x = Math.min(gutterX, handle.x - 12);
    return [exit, { x, y: exit.y }, { x, y: handle.y }, handle];
  }

  if (kind === "nut") {
    return [exit, { x: gutterX, y: exit.y }, { x: gutterX, y: handle.y }, handle];
  }

  if (kind === "top" && device) {
    const over = device.y - DEVICE_CLEAR;
    return [exit, { x: gutterX, y: exit.y }, { x: gutterX, y: over }, { x: handle.x, y: over }, handle];
  }

  if (kind === "right" && device) {
    const under = device.y + device.height + DEVICE_CLEAR;
    const around = device.x + device.width + 20;
    return [
      exit,
      { x: gutterX, y: exit.y },
      { x: gutterX, y: under },
      { x: around, y: under },
      { x: around, y: handle.y },
      handle,
    ];
  }

  return [exit, { x: gutterX, y: exit.y }, { x: gutterX, y: handle.y }, handle];
}

export function pathFromPoints(points: RoutePoint[]): string {
  if (points.length === 0) return "";
  const first = points[0]!;
  let d = `M ${fmt(first.x)} ${fmt(first.y)}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]!;
    const point = points[i]!;
    if (Math.abs(point.y - prev.y) < 0.1) d += ` H ${fmt(point.x)}`;
    else if (Math.abs(point.x - prev.x) < 0.1) d += ` V ${fmt(point.y)}`;
    else d += ` L ${fmt(point.x)} ${fmt(point.y)}`;
  }
  return d;
}

export function conductorPath(exit: RoutePoint, dest: RoutePoint, laneX: number): string {
  return pathFromPoints(routeToHandle(exit, dest, laneX, "nut"));
}

export function verticalLaneOf(path: string): number | null {
  const match = path.match(/H ([-.\d]+) V /);
  return match ? Number(match[1]) : null;
}

function fmt(value: number): string {
  return String(Math.round(value * 10) / 10);
}
