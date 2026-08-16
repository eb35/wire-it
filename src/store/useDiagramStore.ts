import { create } from "zustand";
import {
  countCablesBetween,
  createId,
  initialWaypoints,
  KIND_DEFAULTS,
  nextLocationCode,
  nextPort,
  pickHandles,
} from "../domain";
import type {
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
  createBlankDrawing,
  loadWorkspace,
  readDrawing,
  removeDrawing,
  saveWorkspace,
} from "../persist/storage";

export type Selection =
  | { kind: "location"; id: string }
  | { kind: "cable"; id: string }
  | { kind: "note"; id: string };

type DiagramState = {
  library: Library;
  project: Project;
  selection: Selection | null;
  connectType: CableTypeId | null;
  connectFrom: string | null;
  setProjectName: (name: string) => void;
  newDrawing: () => void;
  switchDrawing: (id: string) => void;
  deleteDrawing: (id: string) => void;
  addLocation: (kind: LocationKind, position: Point) => void;
  updateLocation: (
    id: string,
    patch: { label?: string; device?: DeviceType; code?: string },
  ) => void;
  moveNode: (id: string, position: Point) => void;
  deleteLocation: (id: string) => void;
  addNote: (position: Point) => void;
  updateNote: (id: string, text: string) => void;
  deleteNote: (id: string) => void;
  beginConnect: (type: CableTypeId) => void;
  clickLocationForConnect: (locationId: string) => void;
  connectByHandles: (input: {
    sourceId: string;
    targetId: string;
    sourceHandle: string;
    targetHandle: string;
  }) => void;
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
  const existing = countCablesBetween(project.cables, source.id, target.id);
  return {
    id: createId("cab"),
    type,
    source: source.id,
    target: target.id,
    sourceHandle,
    targetHandle,
    sourcePort: nextPort(source.id, project.cables),
    targetPort: nextPort(target.id, project.cables),
    label: "",
    color: "sheath",
    waypoints: initialWaypoints(source, target, existing),
  };
}

const loaded = loadWorkspace();

function persist(library: Library, project: Project): { library: Library; project: Project } {
  saveWorkspace(library, project);
  const nextLibrary = JSON.parse(localStorage.getItem("wire-it:library") ?? "null") as Library;
  return { library: nextLibrary, project };
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  library: loaded.library,
  project: loaded.project,
  selection: null,
  connectType: null,
  connectFrom: null,

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
    const next = readDrawing(id);
    if (!next) return;
    set({
      library: { ...library, activeId: id },
      project: next,
      selection: null,
      connectType: null,
      connectFrom: null,
    });
    saveWorkspace({ ...library, activeId: id }, next);
  },

  deleteDrawing: (id) => {
    const { library, project } = get();
    removeDrawing(id);
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
    if (!nextProject) return;
    const nextLibrary = { activeId: nextActive, drawings: remaining };
    set({
      ...persist(nextLibrary, nextProject),
      selection: null,
    });
  },

  addLocation: (kind, position) => {
    const { library, project } = get();
    const defaults = KIND_DEFAULTS[kind];
    const location = {
      id: createId("loc"),
      kind,
      label: defaults.label,
      code: nextLocationCode(project.locations),
      device: defaults.device,
      position,
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
          item.id === id ? { ...item, ...patch } : item,
        ),
      }),
    );
  },

  moveNode: (id, position) => {
    const { library, project } = get();
    if (project.locations.some((item) => item.id === id)) {
      set(
        persist(library, {
          ...project,
          locations: project.locations.map((item) =>
            item.id === id ? { ...item, position } : item,
          ),
        }),
      );
      return;
    }
    set(
      persist(library, {
        ...project,
        notes: project.notes.map((item) => (item.id === id ? { ...item, position } : item)),
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

  beginConnect: (type) => {
    set({ connectType: type, connectFrom: null, selection: null });
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
    const handles = pickHandles(source, target, project.cables);
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
    const cable = makeCable(
      project,
      source,
      target,
      sourceHandle,
      targetHandle,
      connectType ?? "12/2",
    );
    set({
      ...persist(library, { ...project, cables: [...project.cables, cable] }),
      selection: { kind: "cable", id: cable.id },
    });
  },

  cancelConnect: () => set({ connectType: null, connectFrom: null }),

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
    const { project } = get();
    const cable = project.cables.find((item) => item.id === id);
    if (!cable) return;
    const source = project.locations.find((item) => item.id === cable.source);
    const target = project.locations.find((item) => item.id === cable.target);
    if (!source || !target) return;
    const existing = countCablesBetween(project.cables, source.id, target.id);
    get().setWaypoints(id, initialWaypoints(source, target, Math.max(0, existing - 1)));
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
}));
