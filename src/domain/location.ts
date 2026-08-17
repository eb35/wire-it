import type { BoxCapacity, BreakerSlot, DeviceSlot, DeviceType, Location, LocationKind } from "./types";

export const BOX_CAPACITIES: BoxCapacity[] = [1, 2, 3];
export const DEFAULT_PANEL_SPACES = 12;
export const MAX_PANEL_SPACES = 40;

export function isBoxCapacity(value: unknown): value is BoxCapacity {
  return value === 1 || value === 2 || value === 3;
}

export function emptySlots(capacity: BoxCapacity): DeviceSlot[] {
  return Array.from({ length: capacity }, () => ({ device: "empty" as const }));
}

export function defaultBreakers(spaces: number): BreakerSlot[] {
  return Array.from({ length: spaces }, (_, index) => ({
    number: index + 1,
    label: "",
  }));
}

export function clampPanelSpaces(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PANEL_SPACES;
  return Math.min(MAX_PANEL_SPACES, Math.max(2, Math.floor(value)));
}

export function padSlots(slots: DeviceSlot[], capacity: BoxCapacity): DeviceSlot[] {
  const next = slots.slice(0, capacity);
  while (next.length < capacity) next.push({ device: "empty" });
  return next;
}

export function migrateLegacyDevice(device: string | undefined): DeviceType {
  switch (device) {
    case "none":
      return "empty";
    case "duplex-outlet":
      return "duplex-15";
    case "gfci-outlet":
      return "gfci-15";
    case "empty":
    case "duplex-15":
    case "duplex-20":
    case "single-outlet":
    case "gfci-15":
    case "gfci-20":
    case "single-pole":
    case "three-way":
    case "four-way":
    case "light":
    case "breaker":
      return device;
    default:
      return "empty";
  }
}

export function migrateLegacyKind(kind: string | undefined): LocationKind | null {
  if (kind === "fixture") return "box";
  if (kind === "panel" || kind === "box" || kind === "external") return kind;
  return null;
}

export function locationDefaults(kind: LocationKind): Pick<
  Location,
  "label" | "capacity" | "slots" | "spaces" | "breakers" | "externalRef"
> {
  if (kind === "panel") {
    return {
      label: "Panel",
      capacity: 1,
      slots: emptySlots(1),
      spaces: DEFAULT_PANEL_SPACES,
      breakers: defaultBreakers(DEFAULT_PANEL_SPACES),
      externalRef: "",
    };
  }
  if (kind === "external") {
    return {
      label: "Off-drawing",
      capacity: 1,
      slots: emptySlots(1),
      spaces: DEFAULT_PANEL_SPACES,
      breakers: defaultBreakers(DEFAULT_PANEL_SPACES),
      externalRef: "",
    };
  }
  return {
    label: "Box",
    capacity: 1,
    slots: emptySlots(1),
    spaces: DEFAULT_PANEL_SPACES,
    breakers: defaultBreakers(DEFAULT_PANEL_SPACES),
    externalRef: "",
  };
}

export function firstEmptySlot(location: Location): number {
  const index = location.slots.findIndex((slot) => slot.device === "empty");
  return index === -1 ? 0 : index;
}

export function occupiedSlotSummary(location: Location): string {
  if (location.kind === "panel") {
    const used = location.breakers.filter((slot) => slot.label.trim()).length;
    return used ? `${used} labeled` : `${location.spaces} spaces`;
  }
  if (location.kind === "external") {
    return location.externalRef.trim() || "Other drawing";
  }
  const filled = location.slots.filter((slot) => slot.device !== "empty");
  if (filled.length === 0) return "Junction / empty";
  return filled.map((slot) => slot.device).join(", ");
}
