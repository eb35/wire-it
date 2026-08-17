import { describe, expect, it } from "vitest";
import { emptyProject, parseProject } from "./project";

const v1Kitchen = {
  version: 1,
  id: "dwg_old",
  name: "Legacy",
  locations: [
    {
      id: "loc_panel",
      kind: "panel",
      label: "Main panel",
      code: "P",
      device: "none",
      position: { x: 0, y: 0 },
    },
    {
      id: "loc_box",
      kind: "box",
      label: "Island",
      code: "A",
      device: "duplex-outlet",
      position: { x: 100, y: 0 },
    },
    {
      id: "loc_light",
      kind: "fixture",
      label: "Porch",
      code: "C",
      device: "light",
      position: { x: 200, y: 0 },
    },
  ],
  cables: [
    {
      id: "cab_1",
      type: "12/2",
      source: "loc_panel",
      target: "loc_box",
      sourceHandle: "s-r1",
      targetHandle: "t-l1",
      sourcePort: "1",
      targetPort: "1",
      label: "from brk 29",
      color: "sheath",
      waypoints: [{ x: 40, y: 20 }],
    },
  ],
  notes: [],
};

describe("parseProject", () => {
  it("round-trips an empty drawing", () => {
    const project = emptyProject("Test");
    expect(parseProject(JSON.parse(JSON.stringify(project)))).toEqual(project);
  });

  it("rejects the wrong version", () => {
    expect(() => parseProject({ version: 99, id: "x", name: "Nope" })).toThrow(
      /unexpected version/,
    );
  });

  it("migrates a v1 drawing to slots, gangs, and no fixture kind", () => {
    const project = parseProject(v1Kitchen);
    expect(project.version).toBe(3);
    expect(project.locations.map((item) => item.kind)).toEqual(["panel", "box", "box"]);
    expect(project.locations[1]).toMatchObject({
      capacity: 1,
      slots: [{ device: "duplex-15" }],
    });
    expect(project.locations[2]).toMatchObject({
      kind: "box",
      slots: [{ device: "light" }],
    });
    expect(project.locations[0]?.spaces).toBe(12);
    expect(project.locations[0]?.breakers).toHaveLength(12);
    expect(project.cables[0]).toMatchObject({
      sourceHandle: "s-brk-1",
      sourcePort: "1",
      waypoints: [],
    });
  });

  it("keeps a v3 dangling cable with a loose end", () => {
    const project = parseProject({
      version: 3,
      id: "dwg_loose",
      name: "Loose",
      locations: [
        {
          id: "loc_box",
          kind: "box",
          label: "Island",
          code: "A",
          position: { x: 0, y: 0 },
          capacity: 1,
          slots: [{ device: "empty" }],
        },
      ],
      cables: [
        {
          id: "cab_1",
          type: "12/2",
          source: "loc_box",
          target: "",
          sourceHandle: "s-r-50",
          targetHandle: "t-loose",
          sourcePort: "1",
          targetPort: "1",
          label: "",
          color: "sheath",
          waypoints: [],
          looseEnd: { x: 180, y: 40 },
        },
      ],
      notes: [],
    });
    expect(project.cables[0]).toMatchObject({
      target: "",
      looseEnd: { x: 180, y: 40 },
    });
  });
});
