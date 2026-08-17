export const PROJECT_VERSION = 2 as const;
export const LEGACY_PROJECT_VERSION = 1 as const;

export type CableTypeId = "14/2" | "14/3" | "12/2" | "12/3" | "10/2" | "10/3";

export type LocationKind = "panel" | "box" | "external";

export type BoxCapacity = 1 | 2 | 3;

export type DeviceType =
  | "empty"
  | "duplex-15"
  | "duplex-20"
  | "single-outlet"
  | "gfci-15"
  | "gfci-20"
  | "single-pole"
  | "three-way"
  | "four-way"
  | "light"
  | "breaker";

export type DeviceSlot = {
  device: DeviceType;
};

export type BreakerSlot = {
  number: number;
  label: string;
};

export type ConductorColor = "black" | "white" | "red" | "bare";

export type Point = { x: number; y: number };

export type Side = "top" | "right" | "bottom" | "left";

export type WireColorId =
  | "sheath"
  | "yellow"
  | "white"
  | "orange"
  | "blue"
  | "red"
  | "green"
  | "purple"
  | "gray";

export type Location = {
  id: string;
  kind: LocationKind;
  label: string;
  code: string;
  position: Point;
  capacity: BoxCapacity;
  slots: DeviceSlot[];
  spaces: number;
  breakers: BreakerSlot[];
  externalRef: string;
};

export type Cable = {
  id: string;
  type: CableTypeId;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  sourcePort: string;
  targetPort: string;
  label: string;
  color: WireColorId;
  waypoints: Point[];
};

export type Note = {
  id: string;
  text: string;
  position: Point;
};

export type Project = {
  version: typeof PROJECT_VERSION;
  id: string;
  name: string;
  locations: Location[];
  cables: Cable[];
  notes: Note[];
};

export type DrawingMeta = {
  id: string;
  name: string;
  updatedAt: string;
};

export type Library = {
  activeId: string;
  drawings: DrawingMeta[];
};
