export type RoutePoint = { x: number; y: number };

export const EXIT_GAP = 12;
export const LANE_GAP = 18;
export const NUT_APPROACH = 28;
export const TERMINAL_HANDLE = 16;

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

export function laneXs(count: number, startX: number, gap = LANE_GAP): number[] {
  return Array.from({ length: count }, (_, index) => startX + index * gap);
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

export function terminalHandle(screw: RoutePoint, laneX: number, offset = TERMINAL_HANDLE): RoutePoint {
  const dx = laneX - screw.x;
  const length = Math.abs(dx) || 1;
  return {
    x: screw.x + (dx / length) * offset,
    y: screw.y,
  };
}

export function conductorPath(exit: RoutePoint, dest: RoutePoint, laneX: number): string {
  if (Math.abs(dest.y - exit.y) < 1) {
    return `M ${fmt(exit.x)} ${fmt(exit.y)} H ${fmt(dest.x)}`;
  }
  return `M ${fmt(exit.x)} ${fmt(exit.y)} H ${fmt(laneX)} V ${fmt(dest.y)} H ${fmt(dest.x)}`;
}

export function verticalLaneOf(path: string): number | null {
  const match = path.match(/H ([-.\d]+) V /);
  return match ? Number(match[1]) : null;
}

function fmt(value: number): string {
  return String(Math.round(value * 10) / 10);
}
