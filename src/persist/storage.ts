import { emptyProject, parseProject } from "../domain/project";
import { sampleKitchen } from "../domain/sample";
import type { DrawingMeta, Library, Project } from "../domain/types";

const LIBRARY_KEY = "wire-it:library";
export const drawingKey = (id: string) => `wire-it:drawing:${id}`;

export function metaFrom(project: Project): DrawingMeta {
  return { id: project.id, name: project.name, updatedAt: new Date().toISOString() };
}

export function withProjectMeta(library: Library, project: Project): Library {
  const meta = metaFrom(project);
  const drawings = library.drawings.some((item) => item.id === project.id)
    ? library.drawings.map((item) => (item.id === project.id ? meta : item))
    : [meta, ...library.drawings];
  return { activeId: project.id, drawings };
}

export function loadWorkspace(): { library: Library; project: Project } {
  const fromIndex = loadFromLibraryIndex();
  if (fromIndex) return fromIndex;

  const recovered = listCachedProjects();
  if (recovered.length > 0) {
    const project = recovered[0]!;
    const library: Library = {
      activeId: project.id,
      drawings: recovered.map(metaFrom),
    };
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
    return { library, project };
  }

  return seed();
}

function loadFromLibraryIndex(): { library: Library; project: Project } | null {
  const raw = localStorage.getItem(LIBRARY_KEY);
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const library = asLibrary(parsed);
  if (!library) return null;

  const active = readDrawing(library.activeId);
  if (active) {
    return { library: { ...library, activeId: active.id }, project: active };
  }

  for (const item of library.drawings) {
    const project = readDrawing(item.id);
    if (project) {
      const next = { ...library, activeId: project.id };
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
      return { library: next, project };
    }
  }

  return null;
}

function asLibrary(raw: unknown): Library | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as { activeId?: unknown; drawings?: unknown };
  if (typeof record.activeId !== "string" || !Array.isArray(record.drawings)) return null;
  const drawings: DrawingMeta[] = [];
  for (const item of record.drawings) {
    if (!item || typeof item !== "object") continue;
    const row = item as { id?: unknown; name?: unknown; updatedAt?: unknown };
    if (typeof row.id !== "string" || typeof row.name !== "string") continue;
    drawings.push({
      id: row.id,
      name: row.name,
      updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : new Date().toISOString(),
    });
  }
  if (drawings.length === 0) return null;
  return { activeId: record.activeId, drawings };
}

function seed(): { library: Library; project: Project } {
  const project = sampleKitchen();
  const library: Library = {
    activeId: project.id,
    drawings: [metaFrom(project)],
  };
  saveWorkspace(library, project);
  return { library, project };
}

export function saveWorkspace(library: Library, project: Project): void {
  const nextLibrary = withProjectMeta(library, project);
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(nextLibrary));
  localStorage.setItem(drawingKey(project.id), JSON.stringify(project));
}

export function readDrawing(id: string): Project | null {
  const stored = localStorage.getItem(drawingKey(id));
  if (!stored) return null;
  try {
    return parseProject(JSON.parse(stored));
  } catch {
    return null;
  }
}

export function removeDrawing(id: string): void {
  localStorage.removeItem(drawingKey(id));
}

export function createBlankDrawing(): Project {
  return emptyProject("Untitled");
}

export function listCachedProjects(): Project[] {
  const seen = new Set<string>();
  const projects: Project[] = [];

  const indexed = asLibrary(safeParse(localStorage.getItem(LIBRARY_KEY)));
  if (indexed) {
    for (const item of indexed.drawings) {
      const project = readDrawing(item.id);
      if (project && !seen.has(project.id)) {
        seen.add(project.id);
        projects.push(project);
      }
    }
  }

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith("wire-it:drawing:")) continue;
    const id = key.slice("wire-it:drawing:".length);
    if (seen.has(id)) continue;
    const project = readDrawing(id);
    if (project) {
      seen.add(project.id);
      projects.push(project);
    }
  }

  return projects;
}

function safeParse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
