import { toPng } from "html-to-image";
import { slug } from "../domain/project";

export type ExportTheme = "dark" | "light";

export async function exportFlowPng(name: string, theme: ExportTheme): Promise<void> {
  const flow = document.querySelector(".react-flow") as HTMLElement | null;
  if (!flow) {
    throw new Error("Nothing to export yet.");
  }
  flow.dataset.exportTheme = theme;
  try {
    const dataUrl = await toPng(flow, {
      backgroundColor: theme === "dark" ? "#09090b" : "#fafafa",
      cacheBust: true,
    });
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${slug(name)}-${theme}.png`;
    link.click();
  } finally {
    delete flow.dataset.exportTheme;
  }
}
