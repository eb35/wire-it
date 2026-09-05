import type { Cable, Point } from "./types";

export function cableOnWireText(cable: Pick<Cable, "type" | "label">): string {
  const label = cable.label.trim();
  return label ? `${cable.type} ${label}` : cable.type;
}

export function repeatOnWire(text: string, times = 10): string {
  return Array.from({ length: times }, () => text).join("   ·   ");
}

export function labelPlacement(
  from: Point,
  toward: Point,
  endPad = 56,
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
  const along = Math.min(Math.max(endPad * 0.45, 28), Math.max(20, length * 0.5));
  const perp = 14;
  return {
    point: {
      x: from.x + ux * along + nx * perp,
      y: from.y + uy * along + ny * perp,
    },
    angle,
  };
}

export function markOffsets(text: string, pathLength: number, fontSize = 11, endPad = 56): number[] {
  if (pathLength < endPad * 2 + 24) return [];
  const unit = Math.max(160, text.length * fontSize * 0.62 + 90);
  const start = endPad;
  const offsets: number[] = [];
  for (let offset = start; offset < pathLength - endPad; offset += unit) {
    offsets.push(offset);
  }
  return offsets;
}
