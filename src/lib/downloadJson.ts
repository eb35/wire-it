import { slug } from "../domain/project";
import type { Project } from "../domain/types";

export function downloadJson(project: Project): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug(project.name)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
