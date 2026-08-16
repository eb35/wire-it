import { emptyProject, parseProject } from "../domain/project";
import { sampleKitchen } from "../domain/sample";
import type { DrawingMeta, Library, Project } from "../domain/types";

const LIBRARY_KEY = "wire-it:library";
const drawingKey = (id: string) => `wire-it:drawing:${id}`;

function metaFrom(project: Project): DrawingMeta {
  return { id: project.id, name: project.name, updatedAt: new Date().toISOString() };
}

export function loadWorkspace(): { library: Library; project: Project } {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) {
      return seed();
    }
    const library = JSON.parse(raw) as Library;
    const stored = localStorage.getItem(drawingKey(library.activeId));
    if (!stored) {
      return seed();
    }
    return { library, project: parseProject(JSON.parse(stored)) };
  } catch {
    return seed();
  }
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
  const nextLibrary: Library = {
    activeId: project.id,
    drawings: library.drawings.map((item) =>
      item.id === project.id ? metaFrom(project) : item,
    ),
  };
  if (!nextLibrary.drawings.some((item) => item.id === project.id)) {
    nextLibrary.drawings = [metaFrom(project), ...nextLibrary.drawings];
  }
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
