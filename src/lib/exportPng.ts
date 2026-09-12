import { toPng } from "html-to-image";
import { slug } from "../domain/project";

export async function exportElementPng(selector: string, name: string): Promise<void> {
  const node = document.querySelector(selector) as HTMLElement | null;
  if (!node) {
    throw new Error("Nothing to export yet.");
  }
  const dataUrl = await toPng(node, {
    backgroundColor: "#fafafa",
    cacheBust: true,
  });
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${slug(name)}.png`;
  link.click();
}
