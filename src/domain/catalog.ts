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

export const DEVICE_OPTIONS: { id: DeviceType; label: string; hint: string }[] = [
  { id: "empty", label: "Empty", hint: "Open gang" },
  { id: "duplex-15", label: "15A duplex", hint: "Standard receptacle" },
  { id: "duplex-20", label: "20A duplex", hint: "T-slot receptacle" },
  { id: "single-outlet", label: "Single receptacle", hint: "One outlet" },
  { id: "gfci-15", label: "15A GFCI", hint: "GFCI receptacle" },
  { id: "gfci-20", label: "20A GFCI", hint: "GFCI receptacle" },
  { id: "single-pole", label: "Single-pole", hint: "Switch" },
  { id: "three-way", label: "3-way", hint: "Switch" },
  { id: "four-way", label: "4-way", hint: "Switch" },
  { id: "light", label: "Light", hint: "Fixture in a box" },
  { id: "breaker", label: "Breaker", hint: "Panel space" },
];

export const PALETTE_DEVICES: DeviceType[] = [
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
];

export const KIND_LABEL: Record<LocationKind, string> = {
  panel: "Panel",
  box: "Box",
  external: "Off-drawing",
};

export function deviceLabel(device: DeviceType): string {
  return DEVICE_OPTIONS.find((item) => item.id === device)?.label ?? device;
}

export function deviceShort(device: DeviceType): string {
  switch (device) {
    case "empty":
      return "";
    case "duplex-15":
      return "15A";
    case "duplex-20":
      return "20A";
    case "single-outlet":
      return "1×";
    case "gfci-15":
      return "G15";
    case "gfci-20":
      return "G20";
    case "single-pole":
      return "SP";
    case "three-way":
      return "3W";
    case "four-way":
      return "4W";
    case "light":
      return "LT";
    case "breaker":
      return "BRK";
  }
}
