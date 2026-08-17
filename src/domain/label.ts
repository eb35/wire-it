import type { Cable } from "./types";

export function cableOnWireText(cable: Pick<Cable, "type" | "label">): string {
  const label = cable.label.trim();
  return label ? `${cable.type} ${label}` : cable.type;
}

export function repeatOnWire(text: string, times = 10): string {
  return Array.from({ length: times }, () => text).join("   ·   ");
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
