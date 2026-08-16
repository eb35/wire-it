import type { Cable } from "./types";

export function cableOnWireText(cable: Pick<Cable, "type" | "label">): string {
  const label = cable.label.trim();
  return label ? `${cable.type}  ${label}` : cable.type;
}

export function repeatOnWire(text: string, times = 10): string {
  return Array.from({ length: times }, () => text).join("   ·   ");
}
