import type { Cable, Location } from "./types";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function nextLocationCode(locations: Location[]): string {
  const used = new Set(locations.map((location) => location.code.toUpperCase()));
  for (const letter of LETTERS) {
    if (!used.has(letter)) return letter;
  }
  return `Z${locations.length + 1}`;
}

export function nextPort(locationId: string, cables: Cable[]): string {
  const used = new Set<string>();
  for (const cable of cables) {
    if (cable.source === locationId) used.add(cable.sourcePort);
    if (cable.target === locationId) used.add(cable.targetPort);
  }
  let n = 1;
  while (used.has(String(n))) n += 1;
  return String(n);
}

export function wireTag(code: string, port: string): string {
  return `${code.trim()}${port.trim()}`;
}

export function wireEndCopy(
  localCode: string,
  localPort: string,
  otherCode: string,
  otherPort: string,
): { title: string; subtitle: string } {
  return {
    title: wireTag(localCode, localPort),
    subtitle: `To ${wireTag(otherCode, otherPort)}`,
  };
}
