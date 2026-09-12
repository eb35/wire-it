import { CABLE_TYPE_IDS } from "./catalog";
import { createId } from "./id";
import {
  clampPanelSpaces,
  defaultBreakers,
  emptySlots,
  isBoxCapacity,
  locationDefaults,
  migrateLegacyDevice,
  migrateLegacyKind,
  padSlots,
} from "./location";
import { pruneInternals } from "./splices";
import { nextLocationCode } from "./ports";
import type {
  BoxCapacity,
  BreakerSlot,
  Cable,
  CableTypeId,
  ConductorColor,
  DeviceSlot,
  DeviceType,
  LandingTarget,
  Location,
  Note,
  Nut,
  Pigtail,
  Point,
  Project,
  Splice,
  WireColorId,
} from "./types";
import { PROJECT_VERSION, SUPPORTED_PROJECT_VERSIONS } from "./types";

const WIRE_COLOR_IDS = new Set<WireColorId>([
  "sheath",
  "yellow",
  "white",
  "orange",
  "blue",
  "red",
  "green",
  "purple",
  "gray",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPoint(value: unknown): value is Point {
  return isRecord(value) && typeof value.x === "number" && typeof value.y === "number";
}

export function emptyProject(name = "Untitled"): Project {
  return {
    version: PROJECT_VERSION,
    id: createId("dwg"),
    name,
    locations: [],
    cables: [],
    notes: [],
    nuts: [],
    splices: [],
    pigtails: [],
  };
}

function parseSlots(raw: unknown, capacity: BoxCapacity, fallback: DeviceType): DeviceSlot[] {
  if (!Array.isArray(raw)) {
    const slots = emptySlots(capacity);
    slots[0] = { device: fallback };
    return slots;
  }
  const slots = raw.map((item) => {
    if (isRecord(item) && typeof item.device === "string") {
      return { device: migrateLegacyDevice(item.device) };
    }
    if (typeof item === "string") return { device: migrateLegacyDevice(item) };
    return { device: "empty" as const };
  });
  return padSlots(slots, capacity);
}

function parseBreakers(raw: unknown, spaces: number): BreakerSlot[] {
  const fallback = defaultBreakers(spaces);
  if (!Array.isArray(raw)) return fallback;
  return fallback.map((slot, index) => {
    const item = raw[index];
    if (!isRecord(item)) return slot;
    return {
      number: typeof item.number === "number" ? item.number : slot.number,
      label: typeof item.label === "string" ? item.label : "",
    };
  });
}

function parseLocation(item: unknown, index: number, used: Location[]): Location {
  if (!isRecord(item) || typeof item.id !== "string" || typeof item.label !== "string" || !isPoint(item.position)) {
    throw new Error(`Location ${index + 1} is invalid.`);
  }
  const kind = migrateLegacyKind(item.kind as string);
  if (!kind) {
    throw new Error(`Location ${index + 1} is invalid.`);
  }
  const defaults = locationDefaults(kind);
  const capacity = kind === "box" && isBoxCapacity(item.capacity) ? item.capacity : defaults.capacity;
  const fallbackDevice = migrateLegacyDevice(typeof item.device === "string" ? item.device : "empty");
  const spaces = kind === "panel" && typeof item.spaces === "number" ? clampPanelSpaces(item.spaces) : defaults.spaces;

  return {
    id: item.id,
    kind,
    label: item.label,
    code:
      typeof item.code === "string" && item.code.trim()
        ? item.code.trim().toUpperCase()
        : nextLocationCode(used),
    position: item.position,
    capacity,
    slots: kind === "box" ? parseSlots(item.slots, capacity, fallbackDevice) : emptySlots(1),
    spaces,
    breakers: kind === "panel" ? parseBreakers(item.breakers, spaces) : defaultBreakers(defaults.spaces),
    externalRef: typeof item.externalRef === "string" ? item.externalRef : "",
  };
}

export function parseProject(raw: unknown): Project {
  if (
    !isRecord(raw) ||
    typeof raw.version !== "number" ||
    !SUPPORTED_PROJECT_VERSIONS.includes(raw.version as (typeof SUPPORTED_PROJECT_VERSIONS)[number])
  ) {
    throw new Error("This file is not a Wire-it drawing (unexpected version).");
  }
  const version = raw.version;
  if (typeof raw.id !== "string" || typeof raw.name !== "string") {
    throw new Error("This drawing is missing a name.");
  }
  if (!Array.isArray(raw.locations) || !Array.isArray(raw.cables) || !Array.isArray(raw.notes)) {
    throw new Error("This drawing is missing locations, cables, or notes.");
  }

  const locations: Location[] = [];
  raw.locations.forEach((item, index) => {
    locations.push(parseLocation(item, index, locations));
  });

  const locationIds = new Set(locations.map((location) => location.id));
  const rawCables: Cable[] = raw.cables.map((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      !CABLE_TYPE_IDS.includes(item.type as CableTypeId) ||
      typeof item.source !== "string" ||
      typeof item.sourceHandle !== "string" ||
      typeof item.targetHandle !== "string" ||
      !WIRE_COLOR_IDS.has(item.color as WireColorId) ||
      !Array.isArray(item.waypoints) ||
      !item.waypoints.every(isPoint)
    ) {
      throw new Error(`Cable ${index + 1} is invalid.`);
    }
    if (!locationIds.has(item.source)) {
      throw new Error(`Cable ${index + 1} points at a missing box.`);
    }
    const dangling =
      item.target === "" || item.target === null || item.target === undefined;
    const target = dangling ? "" : typeof item.target === "string" ? item.target : "";
    if (!dangling && !locationIds.has(target)) {
      throw new Error(`Cable ${index + 1} points at a missing box.`);
    }
    if (dangling && !isPoint(item.looseEnd)) {
      throw new Error(`Cable ${index + 1} needs a loose end.`);
    }
    return {
      id: item.id,
      type: item.type as CableTypeId,
      source: item.source,
      target,
      sourceHandle: item.sourceHandle,
      targetHandle: item.targetHandle,
      sourcePort:
        typeof item.sourcePort === "string" && item.sourcePort.trim()
          ? item.sourcePort.trim()
          : "1",
      targetPort:
        typeof item.targetPort === "string" && item.targetPort.trim()
          ? item.targetPort.trim()
          : "1",
      label: typeof item.label === "string" ? item.label : "",
      color: item.color as WireColorId,
      waypoints: version >= 3 ? item.waypoints : [],
      ...(dangling || isPoint(item.looseEnd) ? { looseEnd: item.looseEnd as Point } : {}),
    };
  });

  const notes: Note[] = raw.notes.map((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.text !== "string" ||
      !isPoint(item.position)
    ) {
      throw new Error(`Note ${index + 1} is invalid.`);
    }
    return { id: item.id, text: item.text, position: item.position };
  });

  const { locations: nextLocations, cables } = attachPanelCables(locations, rawCables);
  const nuts = parseNuts(raw.nuts);
  const splices = parseSplices(raw.splices);
  const pigtails = parsePigtails(raw.pigtails);

  return pruneInternals({
    version: PROJECT_VERSION,
    id: raw.id,
    name: raw.name,
    locations: nextLocations,
    cables,
    notes,
    nuts,
    splices,
    pigtails,
  });
}

function parseNuts(raw: unknown): Nut[] {
  if (!Array.isArray(raw)) return [];
  const nuts: Nut[] = [];
  for (const item of raw) {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.locationId !== "string" ||
      typeof item.label !== "string"
    ) {
      continue;
    }
    nuts.push({ id: item.id, locationId: item.locationId, label: item.label.trim() || "N" });
  }
  return nuts;
}

function parseLandingTarget(raw: unknown): LandingTarget | null {
  if (!isRecord(raw) || typeof raw.kind !== "string") return null;
  if (raw.kind === "nut" && typeof raw.nutId === "string") {
    return { kind: "nut", nutId: raw.nutId };
  }
  if (
    raw.kind === "terminal" &&
    typeof raw.slotIndex === "number" &&
    Number.isInteger(raw.slotIndex) &&
    raw.slotIndex >= 0 &&
    typeof raw.terminalId === "string"
  ) {
    return { kind: "terminal", slotIndex: raw.slotIndex, terminalId: raw.terminalId };
  }
  return null;
}

const CONDUCTORS = new Set<ConductorColor>(["black", "white", "red", "bare"]);

function parsePigtails(raw: unknown): Pigtail[] {
  if (!Array.isArray(raw)) return [];
  const pigtails: Pigtail[] = [];
  for (const item of raw) {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.locationId !== "string" ||
      typeof item.nutId !== "string" ||
      !CONDUCTORS.has(item.conductor as ConductorColor)
    ) {
      continue;
    }
    const target = parseLandingTarget(item.target);
    if (!target || target.kind !== "terminal") continue;
    pigtails.push({
      id: item.id,
      locationId: item.locationId,
      nutId: item.nutId,
      conductor: item.conductor as ConductorColor,
      target,
    });
  }
  return pigtails;
}

function parseSplices(raw: unknown): Splice[] {
  if (!Array.isArray(raw)) return [];
  const splices: Splice[] = [];
  for (const item of raw) {
    if (
      !isRecord(item) ||
      typeof item.locationId !== "string" ||
      typeof item.cableId !== "string" ||
      !CONDUCTORS.has(item.conductor as ConductorColor)
    ) {
      continue;
    }
    const target = parseLandingTarget(item.target);
    if (!target) continue;
    splices.push({
      locationId: item.locationId,
      cableId: item.cableId,
      conductor: item.conductor as ConductorColor,
      target,
    });
  }
  return splices;
}

function panelNumber(port: string, handle: string): number | null {
  const fromHandle = Number(handle.match(/brk-(\d+)/)?.[1] ?? "");
  if (Number.isFinite(fromHandle) && fromHandle > 0) return fromHandle;
  const fromPort = Number(port);
  if (Number.isFinite(fromPort) && fromPort > 0) return fromPort;
  return null;
}

function panelHandle(handle: string, number: number): string {
  if (handle.includes("brk-")) return handle;
  const prefix = handle.startsWith("t-") ? "t" : "s";
  return `${prefix}-brk-${number}`;
}

function attachPanelCables(
  locations: Location[],
  cables: Cable[],
): { locations: Location[]; cables: Cable[] } {
  const needed = new Map<string, number>();
  for (const location of locations) {
    if (location.kind === "panel") needed.set(location.id, location.spaces);
  }
  for (const cable of cables) {
    for (const [id, port, handle] of [
      [cable.source, cable.sourcePort, cable.sourceHandle],
      [cable.target, cable.targetPort, cable.targetHandle],
    ] as const) {
      const current = needed.get(id);
      if (current === undefined) continue;
      const number = panelNumber(port, handle);
      if (number) needed.set(id, Math.max(current, number));
    }
  }

  const nextLocations = locations.map((location) => {
    const spaces = needed.get(location.id);
    if (!spaces || spaces === location.spaces) return location;
    const even = clampPanelSpaces(spaces % 2 === 0 ? spaces : spaces + 1);
    return {
      ...location,
      spaces: even,
      breakers: defaultBreakers(even).map((slot, index) => ({
        ...slot,
        label: location.breakers[index]?.label ?? "",
        number: location.breakers[index]?.number ?? slot.number,
      })),
    };
  });

  const byId = new Map(nextLocations.map((location) => [location.id, location]));
  const nextCables = cables.map((cable) => {
    const source = byId.get(cable.source);
    const target = byId.get(cable.target);
    let sourceHandle = cable.sourceHandle;
    let sourcePort = cable.sourcePort;
    let targetHandle = cable.targetHandle;
    let targetPort = cable.targetPort;
    if (source?.kind === "panel") {
      const number = panelNumber(cable.sourcePort, cable.sourceHandle) ?? 1;
      sourceHandle = panelHandle(cable.sourceHandle, number);
      sourcePort = String(number);
    }
    if (target?.kind === "panel") {
      const number = panelNumber(cable.targetPort, cable.targetHandle) ?? 1;
      targetHandle = panelHandle(cable.targetHandle, number);
      targetPort = String(number);
    }
    return { ...cable, sourceHandle, targetHandle, sourcePort, targetPort };
  });

  return { locations: nextLocations, cables: nextCables };
}

export function slug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "drawing";
}
