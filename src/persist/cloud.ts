import { parseProject } from "../domain/project";
import type { DrawingMeta, Project } from "../domain/types";

export type GetToken = () => Promise<string | null>;

async function authHeaders(getToken: GetToken): Promise<HeadersInit> {
  const token = await getToken();
  if (!token) {
    throw new Error("Not signed in");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export async function listDrawings(getToken: GetToken): Promise<DrawingMeta[]> {
  const body = await readJson<{ drawings: DrawingMeta[] }>(
    await fetch("/api/drawings", { headers: await authHeaders(getToken) }),
  );
  return body.drawings;
}

export async function fetchDrawing(getToken: GetToken, id: string): Promise<Project | null> {
  const response = await fetch(`/api/drawings/${id}`, { headers: await authHeaders(getToken) });
  if (response.status === 404) return null;
  const body = await readJson<{ project: unknown }>(response);
  return parseProject(body.project);
}

export async function putDrawing(getToken: GetToken, project: Project): Promise<DrawingMeta> {
  const body = await readJson<{ drawing: DrawingMeta }>(
    await fetch(`/api/drawings/${project.id}`, {
      method: "PUT",
      headers: await authHeaders(getToken),
      body: JSON.stringify(project),
    }),
  );
  return body.drawing;
}

export async function deleteRemoteDrawing(getToken: GetToken, id: string): Promise<void> {
  const response = await fetch(`/api/drawings/${id}`, {
    method: "DELETE",
    headers: await authHeaders(getToken),
  });
  if (response.status === 404) return;
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
}
