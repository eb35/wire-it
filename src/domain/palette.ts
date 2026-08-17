import { isBoxCapacity } from "./location";
import type { BoxCapacity, CableTypeId, DeviceType, LocationKind } from "./types";

const CABLE_TYPES = new Set<CableTypeId>(["14/2", "14/3", "12/2", "12/3", "10/2", "10/3"]);

export const PALETTE_MIME = "application/wire-it";

export type PalettePayload =
  | { section: "location"; kind: "panel" }
  | { section: "location"; kind: "box"; capacity: BoxCapacity }
  | { section: "location"; kind: "external" }
  | { section: "note" }
  | { section: "device"; device: DeviceType }
  | { section: "cable"; type: CableTypeId };

const DEVICES = new Set<DeviceType>([
  "empty",
  "duplex-15",
  "duplex-20",
  "single-outlet",
  "gfci-15",
  "gfci-20",
  "single-pole",
  "three-way",
  "four-way",
  "light",
  "breaker",
]);

export function serializePalette(payload: PalettePayload): string {
  return JSON.stringify(payload);
}

export function parsePalette(raw: string): PalettePayload | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PalettePayload> & { kind?: string };
    if (value.section === "note") return { section: "note" };
    if (value.section === "cable" && CABLE_TYPES.has(value.type as CableTypeId)) {
      return { section: "cable", type: value.type as CableTypeId };
    }
    if (value.section === "device" && DEVICES.has(value.device as DeviceType)) {
      return { section: "device", device: value.device as DeviceType };
    }
    if (value.section === "location") {
      if (value.kind === "panel") return { section: "location", kind: "panel" };
      if (value.kind === "external") return { section: "location", kind: "external" };
      if (value.kind === "box" && isBoxCapacity(value.capacity)) {
        return { section: "location", kind: "box", capacity: value.capacity };
      }
    }
    // Milestone 1 drag payload was a bare kind string.
    if (typeof value === "string") return legacyKind(value);
  } catch {
    return legacyKind(raw);
  }
  return null;
}

function legacyKind(raw: string): PalettePayload | null {
  if (raw === "note") return { section: "note" };
  if (raw === "panel") return { section: "location", kind: "panel" };
  if (raw === "external") return { section: "location", kind: "external" };
  if (raw === "box" || raw === "fixture") {
    return { section: "location", kind: "box", capacity: 1 };
  }
  return null;
}

export function isLocationKind(value: string): value is LocationKind {
  return value === "panel" || value === "box" || value === "external";
}
