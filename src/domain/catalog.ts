import type {
  Cable,
  CableTypeId,
  ConductorColor,
  DeviceType,
  LocationKind,
  WireColorId,
} from "./types";

export const CABLE_TYPE_IDS: CableTypeId[] = [
  "14/2",
  "14/3",
  "12/2",
  "12/3",
  "10/2",
  "10/3",
];

export const CABLE_CATALOG: Record<
  CableTypeId,
  { awg: 10 | 12 | 14; sheath: "white" | "yellow" | "orange"; conductors: ConductorColor[] }
> = {
  "14/2": { awg: 14, sheath: "white", conductors: ["black", "white", "bare"] },
  "14/3": { awg: 14, sheath: "white", conductors: ["black", "red", "white", "bare"] },
  "12/2": { awg: 12, sheath: "yellow", conductors: ["black", "white", "bare"] },
  "12/3": { awg: 12, sheath: "yellow", conductors: ["black", "red", "white", "bare"] },
  "10/2": { awg: 10, sheath: "orange", conductors: ["black", "white", "bare"] },
  "10/3": { awg: 10, sheath: "orange", conductors: ["black", "red", "white", "bare"] },
};

const SHEATH_HEX = {
  white: "#E8E4DC",
  yellow: "#E4B84A",
  orange: "#D9783A",
} as const;

export const WIRE_COLOR_IDS: WireColorId[] = [
  "sheath",
  "yellow",
  "white",
  "orange",
  "blue",
  "red",
  "green",
  "purple",
  "gray",
];

export const WIRE_COLORS: Record<WireColorId, { label: string; hex: string | null }> = {
  sheath: { label: "By gauge", hex: null },
  yellow: { label: "Yellow", hex: "#E4B84A" },
  white: { label: "White", hex: "#E8E4DC" },
  orange: { label: "Orange", hex: "#D9783A" },
  blue: { label: "Blue", hex: "#5B8DEF" },
  red: { label: "Red", hex: "#E25555" },
  green: { label: "Green", hex: "#3FA266" },
  purple: { label: "Purple", hex: "#9B7EDE" },
  gray: { label: "Gray", hex: "#8A8F98" },
};

export function resolveCableColor(cable: Pick<Cable, "type" | "color">): string {
  if (cable.color !== "sheath") {
    return WIRE_COLORS[cable.color].hex ?? SHEATH_HEX.yellow;
  }
  return SHEATH_HEX[CABLE_CATALOG[cable.type].sheath];
}

export const DEVICE_OPTIONS: { id: DeviceType; label: string }[] = [
  { id: "none", label: "Junction / none" },
  { id: "duplex-outlet", label: "Duplex outlet" },
  { id: "gfci-outlet", label: "GFCI outlet" },
  { id: "single-pole", label: "Single-pole switch" },
  { id: "three-way", label: "3-way switch" },
  { id: "four-way", label: "4-way switch" },
  { id: "light", label: "Light fixture" },
];

export const KIND_DEFAULTS: Record<
  LocationKind,
  { label: string; device: DeviceType }
> = {
  panel: { label: "Panel", device: "none" },
  box: { label: "Box", device: "duplex-outlet" },
  fixture: { label: "Fixture", device: "light" },
};

export function deviceLabel(device: DeviceType): string {
  return DEVICE_OPTIONS.find((item) => item.id === device)?.label ?? device;
}
