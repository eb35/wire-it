import { create } from "zustand";
import {
  breakerOffsetT,
  clampPanelSpaces,
  createId,
  defaultBreakers,
  emptySlots,
  firstEmptySlot,
  formatBreakerHandle,
  formatHandle,
  locationDefaults,
  uniqueBoxHandle,
  locationRect,
  nearestLocation,
  nextLocationCode,
  padSlots,
  parseHandle,
  pickConnection,
  pointOnSide,
  portForHandle,
  projectToPerimeter,
  snapToGrid,
} from "../domain";
import type {
  BoxCapacity,
  Cable,
  CableTypeId,
  DeviceType,
  Library,
  Location,
  LocationKind,
  Point,
  Project,
  WireColorId,
} from "../domain/types";
import {
  deleteRemoteDrawing,
  fetchDrawing,
  listDrawings,
  putDrawing,
  type GetToken,
} from "../persist/cloud";
import {
  createBlankDrawing,
  listCachedProjects,
  loadWorkspace,
  readDrawing,
  removeDrawing,
  saveWorkspace,
} from "../persist/storage";

export type SaveStatus = "local" | "saving" | "saved" | "error" | "offline";

export type CloudAuth = {
  userId: string;
  getToken: GetToken;
};

export type Selection =
  | { kind: "location"; id: string }
  | { kind: "cable"; id: string }
  | { kind: "note"; id: string };

type LocationPatch = {
  label?: string;
  code?: string;
  capacity?: BoxCapacity;
  slots?: Location["slots"];
  spaces?: number;
  breakers?: Location["breakers"];
  externalRef?: string;
};

type DiagramState = {
  library: Library;
  project: Project;
  selection: Selection | null;
  connectType: CableTypeId | null;
  connectFrom: string | null;
  draggingCableEnd: { cableId: string; end: "source" | "target" } | null;
  saveStatus: SaveStatus;
  pendingMigration: number | null;
  setProjectName: (name: string) => void;
  newDrawing: () => void;
  switchDrawing: (id: string) => void;
  deleteDrawing: (id: string) => void;
  connectCloud: (auth: CloudAuth) => Promise<void>;
  disconnectCloud: () => void;
  acceptMigration: () => Promise<void>;
  skipMigration: () => Promise<void>;
  addLocation: (
    input: { kind: LocationKind; capacity?: BoxCapacity },
    position: Point,
  ) => void;
  updateLocation: (id: string, patch: LocationPatch) => void;
  placeDevice: (locationId: string, device: DeviceType, slotIndex?: number) => void;
  moveNode: (id: string, position: Point) => void;
  deleteLocation: (id: string) => void;
  addNote: (position: Point) => void;
  updateNote: (id: string, text: string) => void;
  deleteNote: (id: string) => void;
  beginConnect: (type: CableTypeId, fromId?: string) => void;
  clickLocationForConnect: (locationId: string) => void;
  connectByHandles: (input: {
    sourceId: string;
    targetId: string;
    sourceHandle: string;
    targetHandle: string;
  }) => void;
  reconnectCable: (
    id: string,
    input: {
      sourceId: string;
      targetId: string;
      sourceHandle: string;
      targetHandle: string;
    },
  ) => void;
  addDanglingCable: (sourceId: string, sourceHandle: string | null | undefined, looseEnd: Point) => void;
  setLooseEnd: (id: string, looseEnd: Point) => void;
  attachLooseEnd: (id: string, targetId: string, targetHandle?: string | null) => void;
  slideLanding: (id: string, end: "source" | "target", point: Point) => void;
  dropCableEnd: (id: string, end: "source" | "target", point: Point) => void;
  setDraggingCableEnd: (value: { cableId: string; end: "source" | "target" } | null) => void;
  cancelConnect: () => void;
  updateCable: (
    id: string,
    patch: {
      label?: string;
      type?: CableTypeId;
      color?: WireColorId;
      sourcePort?: string;
      targetPort?: string;
    },
  ) => void;
  setWaypoints: (id: string, waypoints: Point[]) => void;
  resetRoute: (id: string) => void;
  deleteCable: (id: string) => void;
  setSelection: (selection: Selection | null) => void;
  deleteSelection: () => void;
  importProject: (project: Project) => void;
};

function makeCable(
  project: Project,
  source: Location,
  target: Location,
  sourceHandle: string,
  targetHandle: string,
  type: CableTypeId,
): Cable {
  return {
    id: createId("cab"),
    type,
    source: source.id,
    target: target.id,
    sourceHandle,
    targetHandle,
    sourcePort: portForHandle(source, sourceHandle, project.cables),
    targetPort: portForHandle(target, targetHandle, project.cables),
    label: "",
    color: "sheath",
    waypoints: [],
  };
}

function nearestBreakerHandle(
  location: Location,
  role: "source" | "target",
  point: Point,
): string {
  const rect = locationRect(location);
  let best = 1;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let number = 1; number <= location.spaces; number += 1) {
    const side = number % 2 === 1 ? "left" : "right";
    const landing = pointOnSide(rect, side, breakerOffsetT(number, location.spaces));
    const dist = Math.hypot(point.x - landing.x, point.y - landing.y);
    if (dist < bestDist) {
      best = number;
      bestDist = dist;
    }
  }
  return formatBreakerHandle(role, best);
}

function applyLocationPatch(item: Location, patch: LocationPatch): Location {
  const next = { ...item, ...patch };
  if (patch.capacity && patch.capacity !== item.capacity) {
    next.slots = padSlots(item.slots, patch.capacity);
  }
  if (patch.spaces && patch.spaces !== item.spaces) {
    const spaces = clampPanelSpaces(patch.spaces);
    next.spaces = spaces;
    next.breakers = defaultBreakers(spaces).map((slot, index) => ({
      ...slot,
      label: item.breakers[index]?.label ?? "",
      number: item.breakers[index]?.number ?? slot.number,
    }));
  }
  return next;
}

const loaded = loadWorkspace();

let cloud: CloudAuth | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingProject: Project | null = null;

function persist(library: Library, project: Project): { library: Library; project: Project } {
  saveWorkspace(library, project);
  const stored = localStorage.getItem("wire-it:library");
  const nextLibrary = stored ? (JSON.parse(stored) as Library) : library;
  if (cloud) scheduleCloudSave(project);
  return { library: nextLibrary, project };
}

function scheduleCloudSave(project: Project): void {
  pendingProject = project;
  useDiagramStore.setState({ saveStatus: "saving" });
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void flushCloudSave();
  }, 1000);
}

async function flushCloudSave(): Promise<void> {
  const session = cloud;
  const project = pendingProject;
  if (!session || !project) return;
  pendingProject = null;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    const meta = await putDrawing(session.getToken, project);
    useDiagramStore.setState((state) => ({
      saveStatus: "saved",
      library: {
        ...state.library,
        drawings: state.library.drawings.map((item) =>
          item.id === meta.id ? meta : item,
        ),
      },
    }));
  } catch {
    useDiagramStore.setState({ saveStatus: "error" });
  }
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  library: loaded.library,
  project: loaded.project,
  selection: null,
  connectType: null,
  connectFrom: null,
  draggingCableEnd: null,
  saveStatus: "local",
  pendingMigration: null,

  setProjectName: (name) => {
    const { library, project } = get();
    const next = { ...project, name };
    set(persist(library, next));
  },

  newDrawing: () => {
    const { library } = get();
    const project = createBlankDrawing();
    set({
      ...persist(library, project),
      selection: null,
      connectType: null,
      connectFrom: null,
    });
  },

  switchDrawing: (id) => {
    const { library, project } = get();
    saveWorkspace(library, project);
    pendingProject = project;
    void flushCloudSave();
    const apply = (next: Project) => {
      const nextLibrary = { ...library, activeId: id };
      saveWorkspace(nextLibrary, next);
      set({
        library: nextLibrary,
        project: next,
        selection: null,
        connectType: null,
        connectFrom: null,
      });
    };
    const cached = readDrawing(id);
    if (cached) {
      apply(cached);
      return;
    }
    if (!cloud) return;
    void fetchDrawing(cloud.getToken, id).then((next) => {
      if (next) apply(next);
    });
  },

  deleteDrawing: (id) => {
    const { library, project } = get();
    removeDrawing(id);
    if (cloud) {
      void deleteRemoteDrawing(cloud.getToken, id);
    }
    const remaining = library.drawings.filter((item) => item.id !== id);
    if (remaining.length === 0) {
      const blank = createBlankDrawing();
      set({
        ...persist({ activeId: blank.id, drawings: [] }, blank),
        selection: null,
      });
      return;
    }
    const nextActive = library.activeId === id ? remaining[0]!.id : library.activeId;
    const nextProject = nextActive === project.id ? project : readDrawing(nextActive);
    if (!nextProject) {
      if (!cloud) return;
      void fetchDrawing(cloud.getToken, nextActive).then((fetched) => {
        if (!fetched) return;
        const nextLibrary = { activeId: nextActive, drawings: remaining };
        set({
          ...persist(nextLibrary, fetched),
          selection: null,
        });
      });
      return;
    }
    const nextLibrary = { activeId: nextActive, drawings: remaining };
    set({
      ...persist(nextLibrary, nextProject),
      selection: null,
    });
  },

  addLocation: (input, position) => {
    const { library, project } = get();
    const defaults = locationDefaults(input.kind);
    const capacity = input.kind === "box" && input.capacity ? input.capacity : defaults.capacity;
    const location: Location = {
      id: createId("loc"),
      kind: input.kind,
      label: defaults.label,
      code: nextLocationCode(project.locations),
      position: snapToGrid(position),
      capacity,
      slots: emptySlots(capacity),
      spaces: defaults.spaces,
      breakers: defaultBreakers(defaults.spaces),
      externalRef: "",
    };
    set({
      ...persist(library, { ...project, locations: [...project.locations, location] }),
      selection: { kind: "location", id: location.id },
    });
  },

  updateLocation: (id, patch) => {
    const { library, project } = get();
    set(
      persist(library, {
        ...project,
        locations: project.locations.map((item) =>
          item.id === id ? applyLocationPatch(item, patch) : item,
        ),
      }),
    );
  },

  placeDevice: (locationId, device, slotIndex) => {
    const { library, project } = get();
    const location = project.locations.find((item) => item.id === locationId);
    if (!location) return;

    if (location.kind === "panel") {
      if (device !== "breaker") return;
      const index = slotIndex ?? location.breakers.findIndex((slot) => !slot.label.trim());
      const target = index >= 0 ? index : 0;
      const breakers = location.breakers.map((slot, i) =>
        i === target ? { ...slot, label: slot.label.trim() || "Circuit" } : slot,
      );
      set(
        persist(library, {
          ...project,
          locations: project.locations.map((item) =>
            item.id === locationId ? { ...item, breakers } : item,
          ),
        }),
      );
      return;
    }

    if (location.kind !== "box" || device === "breaker") return;
    const index = slotIndex ?? firstEmptySlot(location);
    const slots = location.slots.map((slot, i) => (i === index ? { device } : slot));
    set(
      persist(library, {
        ...project,
        locations: project.locations.map((item) =>
          item.id === locationId ? { ...item, slots } : item,
        ),
      }),
    );
  },

  moveNode: (id, position) => {
    const { library, project } = get();
    if (id.startsWith("loose:")) {
      const cableId = id.slice("loose:".length);
      const looseEnd = snapToGrid({ x: position.x + 6, y: position.y + 6 });
      const hit = project.locations.find((location) => {
        const rect = locationRect(location);
        return (
          looseEnd.x >= rect.x - 24 &&
          looseEnd.x <= rect.x + rect.width + 24 &&
          looseEnd.y >= rect.y - 24 &&
          looseEnd.y <= rect.y + rect.height + 24
        );
      });
      if (hit) {
        get().attachLooseEnd(cableId, hit.id);
        return;
      }
      set(
        persist(library, {
          ...project,
          cables: project.cables.map((item) =>
            item.id === cableId ? { ...item, looseEnd, waypoints: [] } : item,
          ),
        }),
      );
      return;
    }
    const snapped = snapToGrid(position);
    if (project.locations.some((item) => item.id === id)) {
      const locations = project.locations.map((item) =>
        item.id === id ? { ...item, position: snapped } : item,
      );
      const cables = project.cables.map((cable) => {
        if (cable.waypoints.length > 0 || cable.lockLandings) return cable;
        if (cable.source !== id && cable.target !== id) return cable;
        if (!cable.target) return { ...cable, waypoints: [] };
        const source = locations.find((item) => item.id === cable.source);
        const target = locations.find((item) => item.id === cable.target);
        if (!source || !target) return cable;
        const others = project.cables.filter((item) => item.id !== cable.id);
        const handles = pickConnection(
          source,
          target,
          others,
          source.kind === "panel" ? cable.sourceHandle : null,
          target.kind === "panel" ? cable.targetHandle : null,
        );
        return {
          ...cable,
          sourceHandle: handles.sourceHandle,
          targetHandle: handles.targetHandle,
          waypoints: [],
        };
      });
      set(persist(library, { ...project, locations, cables }));
      return;
    }
    set(
      persist(library, {
        ...project,
        notes: project.notes.map((item) => (item.id === id ? { ...item, position: snapped } : item)),
      }),
    );
  },

  deleteLocation: (id) => {
    const { library, project, selection } = get();
    set({
      ...persist(library, {
        ...project,
        locations: project.locations.filter((item) => item.id !== id),
        cables: project.cables.filter((cable) => cable.source !== id && cable.target !== id),
      }),
      selection: selection?.kind === "location" && selection.id === id ? null : selection,
    });
  },

  addNote: (position) => {
    const { library, project } = get();
    const note = { id: createId("note"), text: "Note", position };
    set({
      ...persist(library, { ...project, notes: [...project.notes, note] }),
      selection: { kind: "note", id: note.id },
    });
  },

  updateNote: (id, text) => {
    const { library, project } = get();
    set(
      persist(library, {
        ...project,
        notes: project.notes.map((item) => (item.id === id ? { ...item, text } : item)),
      }),
    );
  },

  deleteNote: (id) => {
    const { library, project, selection } = get();
    set({
      ...persist(library, {
        ...project,
        notes: project.notes.filter((item) => item.id !== id),
      }),
      selection: selection?.kind === "note" && selection.id === id ? null : selection,
    });
  },

  beginConnect: (type, fromId) => {
    set({ connectType: type, connectFrom: fromId ?? null, selection: null });
  },

  clickLocationForConnect: (locationId) => {
    const { connectType, connectFrom, library, project } = get();
    if (!connectType) return;
    if (!connectFrom) {
      set({ connectFrom: locationId });
      return;
    }
    if (connectFrom === locationId) {
      set({ connectFrom: null });
      return;
    }
    const source = project.locations.find((item) => item.id === connectFrom);
    const target = project.locations.find((item) => item.id === locationId);
    if (!source || !target) return;
    const handles = pickConnection(source, target, project.cables);
    const cable = makeCable(project, source, target, handles.sourceHandle, handles.targetHandle, connectType);
    set({
      ...persist(library, { ...project, cables: [...project.cables, cable] }),
      connectFrom: null,
      selection: { kind: "cable", id: cable.id },
    });
  },

  connectByHandles: ({ sourceId, targetId, sourceHandle, targetHandle }) => {
    const { library, project, connectType } = get();
    if (sourceId === targetId) return;
    const source = project.locations.find((item) => item.id === sourceId);
    const target = project.locations.find((item) => item.id === targetId);
    if (!source || !target) return;
    const already = project.cables.some(
      (cable) =>
        cable.source === sourceId &&
        cable.target === targetId &&
        cable.sourceHandle === sourceHandle &&
        cable.targetHandle === targetHandle,
    );
    if (already) return;
    const handles = pickConnection(source, target, project.cables, sourceHandle, targetHandle);
    const cable = makeCable(
      project,
      source,
      target,
      handles.sourceHandle,
      handles.targetHandle,
      connectType ?? "12/2",
    );
    set({
      ...persist(library, { ...project, cables: [...project.cables, cable] }),
      selection: { kind: "cable", id: cable.id },
    });
  },

  reconnectCable: (id, { sourceId, targetId, sourceHandle, targetHandle }) => {
    const { library, project } = get();
    if (sourceId === targetId) return;
    const cable = project.cables.find((item) => item.id === id);
    const source = project.locations.find((item) => item.id === sourceId);
    const target = project.locations.find((item) => item.id === targetId);
    if (!cable || !source || !target) return;
    const others = project.cables.filter((item) => item.id !== id);
    const sourceChanged = cable.source !== sourceId;
    const targetChanged = cable.target !== targetId;
    const handles = pickConnection(source, target, others, sourceHandle, targetHandle);
    const next: Cable = {
      ...cable,
      source: sourceId,
      target: targetId,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      sourcePort: sourceChanged ? portForHandle(source, handles.sourceHandle, others) : cable.sourcePort,
      targetPort: targetChanged ? portForHandle(target, handles.targetHandle, others) : cable.targetPort,
      waypoints: [],
      looseEnd: undefined,
    };
    set(
      persist(library, {
        ...project,
        cables: project.cables.map((item) => (item.id === id ? next : item)),
      }),
    );
  },

  addDanglingCable: (sourceId, sourceHandle, looseEnd) => {
    const { library, project, connectType } = get();
    const source = project.locations.find((item) => item.id === sourceId);
    if (!source) return;
    const parsed = parseHandle(sourceHandle ?? "s-r-50");
    const handle =
      source.kind === "panel" && parsed.breaker
        ? formatBreakerHandle("source", parsed.breaker)
        : uniqueBoxHandle("source", parsed.side, parsed.t, source.id, project.cables);
    const cable: Cable = {
      id: createId("cab"),
      type: connectType ?? "12/2",
      source: sourceId,
      target: "",
      sourceHandle: handle,
      targetHandle: "t-loose",
      sourcePort: portForHandle(source, handle, project.cables),
      targetPort: "1",
      label: "",
      color: "sheath",
      waypoints: [],
      looseEnd: snapToGrid(looseEnd),
    };
    set({
      ...persist(library, { ...project, cables: [...project.cables, cable] }),
      connectType: null,
      connectFrom: null,
      selection: { kind: "cable", id: cable.id },
    });
  },

  setLooseEnd: (id, looseEnd) => {
    const { library, project } = get();
    set(
      persist(library, {
        ...project,
        cables: project.cables.map((item) =>
          item.id === id ? { ...item, looseEnd: snapToGrid(looseEnd), waypoints: [] } : item,
        ),
      }),
    );
  },

  attachLooseEnd: (id, targetId, targetHandle) => {
    const { library, project } = get();
    const cable = project.cables.find((item) => item.id === id);
    const source = project.locations.find((item) => item.id === cable?.source);
    const target = project.locations.find((item) => item.id === targetId);
    if (!cable || !source || !target || source.id === target.id) return;
    const others = project.cables.filter((item) => item.id !== id);
    const handles = pickConnection(source, target, others, cable.sourceHandle, targetHandle);
    const next: Cable = {
      ...cable,
      target: targetId,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      targetPort: portForHandle(target, handles.targetHandle, others),
      waypoints: [],
      looseEnd: undefined,
    };
    set(
      persist(library, {
        ...project,
        cables: project.cables.map((item) => (item.id === id ? next : item)),
      }),
    );
  },

  slideLanding: (id, end, point) => {
    const { library, project } = get();
    const cable = project.cables.find((item) => item.id === id);
    if (!cable) return;
    const locationId = end === "source" ? cable.source : cable.target;
    const location = project.locations.find((item) => item.id === locationId);
    if (!location) return;
    const role = end === "source" ? "source" : "target";
    const handle =
      location.kind === "panel"
        ? nearestBreakerHandle(location, role, point)
        : (() => {
            const landing = projectToPerimeter(locationRect(location), point);
            return formatHandle(role, landing.side, landing.t);
          })();
    const next: Cable = {
      ...cable,
      sourceHandle: end === "source" ? handle : cable.sourceHandle,
      targetHandle: end === "target" ? handle : cable.targetHandle,
      waypoints: [],
      lockLandings: true,
    };
    set(
      persist(library, {
        ...project,
        cables: project.cables.map((item) => (item.id === id ? next : item)),
      }),
    );
  },

  dropCableEnd: (id, end, point) => {
    const { library, project } = get();
    const cable = project.cables.find((item) => item.id === id);
    if (!cable) return;
    const hit = nearestLocation(project.locations, point);
    const others = project.cables.filter((item) => item.id !== id);

    if (!hit) {
      if (end === "target" || !cable.target) {
        set(
          persist(library, {
            ...project,
            cables: project.cables.map((item) =>
              item.id === id
                ? {
                    ...item,
                    target: "",
                    targetHandle: "t-loose",
                    waypoints: [],
                    looseEnd: snapToGrid(point),
                    lockLandings: true,
                  }
                : item,
            ),
          }),
        );
        return;
      }
      const remaining = project.locations.find((item) => item.id === cable.target);
      if (!remaining) return;
      const next: Cable = {
        ...cable,
        source: remaining.id,
        sourceHandle: cable.targetHandle.startsWith("t-")
          ? `s-${cable.targetHandle.slice(2)}`
          : cable.targetHandle,
        sourcePort: cable.targetPort,
        target: "",
        targetHandle: "t-loose",
        waypoints: [],
        looseEnd: snapToGrid(point),
        lockLandings: true,
      };
      set(
        persist(library, {
          ...project,
          cables: project.cables.map((item) => (item.id === id ? next : item)),
        }),
      );
      return;
    }

    if (end === "source" && hit.id === cable.target) return;
    if (end === "target" && hit.id === cable.source) return;

    const role = end === "source" ? "source" : "target";
    const landing = projectToPerimeter(locationRect(hit), point);
    const handle =
      hit.kind === "panel"
        ? nearestBreakerHandle(hit, role, point)
        : uniqueBoxHandle(role, landing.side, landing.t, hit.id, others);

    const next: Cable = {
      ...cable,
      source: end === "source" ? hit.id : cable.source,
      target: end === "target" ? hit.id : cable.target,
      sourceHandle: end === "source" ? handle : cable.sourceHandle,
      targetHandle: end === "target" ? handle : cable.targetHandle,
      sourcePort:
        end === "source" && hit.id !== cable.source
          ? portForHandle(hit, handle, others)
          : cable.sourcePort,
      targetPort:
        end === "target" && hit.id !== cable.target
          ? portForHandle(hit, handle, others)
          : cable.targetPort,
      waypoints: [],
      lockLandings: true,
      looseEnd: undefined,
    };
    set(
      persist(library, {
        ...project,
        cables: project.cables.map((item) => (item.id === id ? next : item)),
      }),
    );
  },

  cancelConnect: () => set({ connectType: null, connectFrom: null, draggingCableEnd: null }),

  setDraggingCableEnd: (value) => set({ draggingCableEnd: value }),

  updateCable: (id, patch) => {
    const { library, project } = get();
    set(
      persist(library, {
        ...project,
        cables: project.cables.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      }),
    );
  },

  setWaypoints: (id, waypoints) => {
    const { library, project } = get();
    set(
      persist(library, {
        ...project,
        cables: project.cables.map((item) => (item.id === id ? { ...item, waypoints } : item)),
      }),
    );
  },

  resetRoute: (id) => {
    const { library, project } = get();
    const cable = project.cables.find((item) => item.id === id);
    if (!cable) return;
    const source = project.locations.find((item) => item.id === cable.source);
    const target = project.locations.find((item) => item.id === cable.target);
    if (!source) return;
    if (!target) {
      set(
        persist(library, {
          ...project,
          cables: project.cables.map((item) =>
            item.id === id ? { ...item, waypoints: [], lockLandings: false } : item,
          ),
        }),
      );
      return;
    }
    const others = project.cables.filter((item) => item.id !== id);
    const handles = pickConnection(
      source,
      target,
      others,
      source.kind === "panel" ? cable.sourceHandle : null,
      target.kind === "panel" ? cable.targetHandle : null,
    );
    set(
      persist(library, {
        ...project,
        cables: project.cables.map((item) =>
          item.id === id
            ? {
                ...item,
                sourceHandle: handles.sourceHandle,
                targetHandle: handles.targetHandle,
                waypoints: [],
                lockLandings: false,
              }
            : item,
        ),
      }),
    );
  },

  deleteCable: (id) => {
    const { library, project, selection } = get();
    set({
      ...persist(library, {
        ...project,
        cables: project.cables.filter((item) => item.id !== id),
      }),
      selection: selection?.kind === "cable" && selection.id === id ? null : selection,
    });
  },

  setSelection: (selection) => {
    const current = get().selection;
    if (current === selection) return;
    if (
      current &&
      selection &&
      current.kind === selection.kind &&
      current.id === selection.id
    ) {
      return;
    }
    if (!current && !selection) return;
    set({ selection });
  },

  deleteSelection: () => {
    const { selection } = get();
    if (!selection) return;
    if (selection.kind === "location") get().deleteLocation(selection.id);
    if (selection.kind === "cable") get().deleteCable(selection.id);
    if (selection.kind === "note") get().deleteNote(selection.id);
  },

  importProject: (incoming) => {
    const { library } = get();
    const project = { ...incoming, id: createId("dwg") };
    set({
      ...persist(library, project),
      selection: null,
      connectType: null,
      connectFrom: null,
    });
  },

  connectCloud: async (auth) => {
    cloud = auth;
    try {
      const remote = await listDrawings(auth.getToken);
      const local = listCachedProjects();
      if (remote.length === 0 && local.length > 0) {
        set({ saveStatus: "saved", pendingMigration: local.length });
        return;
      }
      if (remote.length === 0) {
        const { library, project } = get();
        set({ ...persist(library, project), saveStatus: "saving", pendingMigration: null });
        return;
      }
      const activeId = remote[0]!.id;
      const project = (await fetchDrawing(auth.getToken, activeId)) ?? readDrawing(activeId);
      if (!project) {
        set({ saveStatus: "error" });
        return;
      }
      const library = { activeId, drawings: remote };
      saveWorkspace(library, project);
      set({
        library,
        project,
        selection: null,
        connectType: null,
        connectFrom: null,
        saveStatus: "saved",
        pendingMigration: null,
      });
    } catch {
      set({ saveStatus: "offline" });
    }
  },

  disconnectCloud: () => {
    cloud = null;
    pendingProject = null;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    set({ saveStatus: "local", pendingMigration: null });
  },

  acceptMigration: async () => {
    const session = cloud;
    if (!session) return;
    try {
      const local = listCachedProjects();
      for (const project of local) {
        await putDrawing(session.getToken, project);
      }
      const remote = await listDrawings(session.getToken);
      const activeId = remote[0]?.id ?? local[0]?.id;
      if (!activeId) {
        set({ pendingMigration: null, saveStatus: "saved" });
        return;
      }
      const project =
        (await fetchDrawing(session.getToken, activeId)) ??
        local.find((item) => item.id === activeId) ??
        local[0]!;
      const library = { activeId: project.id, drawings: remote.length ? remote : local.map((item) => ({
        id: item.id,
        name: item.name,
        updatedAt: new Date().toISOString(),
      })) };
      saveWorkspace(library, project);
      set({
        library,
        project,
        selection: null,
        pendingMigration: null,
        saveStatus: "saved",
      });
    } catch {
      set({ saveStatus: "error" });
    }
  },

  skipMigration: async () => {
    const blank = createBlankDrawing();
    set({
      ...persist({ activeId: blank.id, drawings: [] }, blank),
      pendingMigration: null,
    });
  },
}));
