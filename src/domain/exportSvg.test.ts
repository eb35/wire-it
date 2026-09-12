import { describe, expect, it } from "vitest";
import { defaultBreakers, emptySlots } from "./location";
import { emptyProject } from "./project";
import { projectExportBounds, rasterScale, renderProjectSvg } from "./exportSvg";
import { sampleKitchen } from "./sample";
import type { Location } from "./types";

describe("renderProjectSvg", () => {
  it("draws the sample kitchen at content size, not the viewport", () => {
    const project = sampleKitchen();
    const svg = renderProjectSvg(project, "dark");
    const bounds = projectExportBounds(project);

    expect(svg).toMatch(/width="[\d.]+" height="[\d.]+"/);
    expect(svg).toContain("viewBox=");
    expect(svg).toContain("Kitchen island");
    expect(svg).toContain("12/2");
    expect(svg).toContain("from brk 5");
    expect(svg).toContain("#09090b");
    expect(bounds.width).toBeGreaterThan(600);
    expect(bounds.height).toBeGreaterThan(400);
  });

  it("uses a light paper color for the light theme", () => {
    const svg = renderProjectSvg(sampleKitchen(), "light");
    expect(svg).toContain("#fafafa");
    expect(svg).not.toMatch(/fill="#09090b"/);
  });

  it("escapes text so a label cannot break the SVG", () => {
    const project = emptyProject("Test");
    project.notes.push({
      id: "note_x",
      text: `Use <12/2> & "romex"`,
      position: { x: 0, y: 0 },
    });
    const svg = renderProjectSvg(project, "dark");
    expect(svg).toContain("Use &lt;12/2&gt; &amp; &quot;romex&quot;");
    expect(svg).not.toContain("Use <12/2>");
  });

  it("refuses an empty drawing", () => {
    expect(() => renderProjectSvg(emptyProject("Blank"), "dark")).toThrow(/Nothing to export/);
  });

  it("sizes the file to the drawing, not a fixed viewport", () => {
    const project = emptyProject("Wide");
    project.locations.push(box("near", 0, 0), box("far", 4000, 2800));
    const bounds = projectExportBounds(project);
    expect(bounds.width).toBeGreaterThan(4000);
    expect(bounds.height).toBeGreaterThan(2800);
    expect(rasterScale(bounds.width, bounds.height) * Math.max(bounds.width, bounds.height)).toBeGreaterThanOrEqual(
      2400,
    );
  });
});

function box(id: string, x: number, y: number): Location {
  return {
    id,
    kind: "box",
    label: id,
    code: id[0]!.toUpperCase(),
    position: { x, y },
    capacity: 1,
    slots: emptySlots(1),
    spaces: 12,
    breakers: defaultBreakers(12),
    externalRef: "",
  };
}

describe("rasterScale", () => {
  it("upsamples small drawings and caps huge ones", () => {
    expect(rasterScale(400, 300)).toBeCloseTo(6);
    expect(rasterScale(3000, 2000)).toBe(2);
    expect(rasterScale(10000, 8000)).toBeCloseTo(0.8192);
  });
});
