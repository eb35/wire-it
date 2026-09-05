import { projectExportBounds, rasterScale, renderProjectSvg, type ExportTheme } from "../domain/exportSvg";
import { slug } from "../domain/project";
import type { Project } from "../domain/types";

export type { ExportTheme };

export function exportDiagramSvg(project: Project, theme: ExportTheme): void {
  const svg = renderProjectSvg(project, theme);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, `${slug(project.name)}-${theme}.svg`);
}

export async function exportDiagramPng(project: Project, theme: ExportTheme): Promise<void> {
  const svg = renderProjectSvg(project, theme);
  const bounds = projectExportBounds(project);
  const scale = rasterScale(bounds.width, bounds.height);
  const dataUrl = await rasterizeSvg(svg, bounds.width, bounds.height, scale);
  downloadDataUrl(dataUrl, `${slug(project.name)}-${theme}.png`);
}

function rasterizeSvg(svg: string, width: number, height: number, scale: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Could not create an export canvas.");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      } catch (cause) {
        reject(cause);
      }
    };
    image.onerror = () => {
      reject(new Error("Could not rasterize that drawing."));
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadDataUrl(href: string, filename: string): void {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
}
