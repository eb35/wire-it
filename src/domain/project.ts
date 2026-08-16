import { CABLE_TYPE_IDS } from "./catalog";
import { createId } from "./id";
import { nextLocationCode } from "./ports";
import type {
  Cable,
  CableTypeId,
  DeviceType,
  Location,
  LocationKind,
  Note,
  Point,
  Project,
  WireColorId,
} from "./types";
import { PROJECT_VERSION } from "./types";

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

const LOCATION_KINDS = new Set<LocationKind>(["panel", "box", "fixture"]);
const DEVICES = new Set<DeviceType>([
  "none",
  "duplex-outlet",
  "gfci-outlet",
  "single-pole",
  "three-way",
  "four-way",
  "light",
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
  };
}

export function parseProject(raw: unknown): Project {
  if (!isRecord(raw) || raw.version !== PROJECT_VERSION) {
    throw new Error("This file is not a Wire-it drawing (unexpected version).");
  }
  if (typeof raw.id !== "string" || typeof raw.name !== "string") {
    throw new Error("This drawing is missing a name.");
  }
  if (!Array.isArray(raw.locations) || !Array.isArray(raw.cables) || !Array.isArray(raw.notes)) {
    throw new Error("This drawing is missing locations, cables, or notes.");
  }

  const locations: Location[] = [];
  raw.locations.forEach((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.label !== "string" ||
      !LOCATION_KINDS.has(item.kind as LocationKind) ||
      !DEVICES.has(item.device as DeviceType) ||
      !isPoint(item.position)
    ) {
      throw new Error(`Location ${index + 1} is invalid.`);
    }
    locations.push({
      id: item.id,
      kind: item.kind as LocationKind,
      label: item.label,
      code:
        typeof item.code === "string" && item.code.trim()
          ? item.code.trim().toUpperCase()
          : nextLocationCode(locations),
      device: item.device as DeviceType,
      position: item.position,
    });
  });

  const locationIds = new Set(locations.map((location) => location.id));
  const cables: Cable[] = raw.cables.map((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      !CABLE_TYPE_IDS.includes(item.type as CableTypeId) ||
      typeof item.source !== "string" ||
      typeof item.target !== "string" ||
      typeof item.sourceHandle !== "string" ||
      typeof item.targetHandle !== "string" ||
      !WIRE_COLOR_IDS.has(item.color as WireColorId) ||
      !Array.isArray(item.waypoints) ||
      !item.waypoints.every(isPoint)
    ) {
      throw new Error(`Cable ${index + 1} is invalid.`);
    }
    if (!locationIds.has(item.source) || !locationIds.has(item.target)) {
      throw new Error(`Cable ${index + 1} points at a missing box.`);
    }
    return {
      id: item.id,
      type: item.type as CableTypeId,
      source: item.source,
      target: item.target,
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
      waypoints: item.waypoints,
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

  return {
    version: PROJECT_VERSION,
    id: raw.id,
    name: raw.name,
    locations,
    cables,
    notes,
  };
}

export function downloadJson(project: Project): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug(project.name)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function slug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "drawing";
}
