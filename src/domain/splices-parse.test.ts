import { describe, expect, it } from "vitest";
import { parseProject } from "./project";

describe("v4 internals parse", () => {
  it("round-trips splices and nuts", () => {
  const raw = {
    version: 4,
    id: "dwg_v4",
    name: "Internals",
    locations: [
      {
        id: "loc_box",
        kind: "box",
        label: "Hall",
        code: "B",
        position: { x: 0, y: 0 },
        capacity: 1,
        slots: [{ device: "three-way" }],
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
        looseEnd: { x: 80, y: 0 },
      },
    ],
    notes: [],
    nuts: [{ id: "nut_1", locationId: "loc_box", label: "N" }],
    splices: [
      {
        locationId: "loc_box",
        cableId: "cab_1",
        conductor: "white",
        target: { kind: "nut", nutId: "nut_1" },
      },
      {
        locationId: "loc_box",
        cableId: "cab_1",
        conductor: "black",
        target: { kind: "terminal", slotIndex: 0, terminalId: "common" },
      },
    ],
  };
  const project = parseProject(raw);
  expect(project.nuts).toEqual([{ id: "nut_1", locationId: "loc_box", label: "N" }]);
  expect(project.splices).toHaveLength(2);
  });
});
