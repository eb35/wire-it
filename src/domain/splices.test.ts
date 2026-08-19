import { describe, expect, it } from "vitest";
import { emptyProject } from "./project";
import { addNutAndLand, landConductor, pruneInternals, suggestNutLabel } from "./splices";
import type { Location, Project } from "./types";

function box(id: string, device: Location["slots"][0]["device"]): Location {
  return {
    id,
    kind: "box",
    label: id,
    code: "B",
    position: { x: 0, y: 0 },
    capacity: 1,
    slots: [{ device }],
    spaces: 12,
    breakers: [],
    externalRef: "",
  };
}

function drawing(): Project {
  const project = emptyProject("Splices");
  return {
    ...project,
    locations: [box("loc_b", "three-way"), box("loc_a", "duplex-15")],
    cables: [
      {
        id: "cab_1",
        type: "12/2",
        source: "loc_a",
        target: "loc_b",
        sourceHandle: "s-r-50",
        targetHandle: "t-l-50",
        sourcePort: "1",
        targetPort: "1",
        label: "",
        color: "sheath",
        waypoints: [],
      },
      {
        id: "cab_2",
        type: "12/3",
        source: "loc_b",
        target: "loc_a",
        sourceHandle: "s-b-50",
        targetHandle: "t-t-50",
        sourcePort: "2",
        targetPort: "2",
        label: "",
        color: "sheath",
        waypoints: [],
      },
    ],
  };
}

describe("landConductor", () => {
  it("lands a free conductor on an empty screw", () => {
    const next = landConductor(drawing(), "loc_b", "cab_1", "black", {
      kind: "terminal",
      slotIndex: 0,
      terminalId: "common",
    });
    expect(next.splices).toEqual([
      {
        locationId: "loc_b",
        cableId: "cab_1",
        conductor: "black",
        target: { kind: "terminal", slotIndex: 0, terminalId: "common" },
      },
    ]);
  });

  it("displaces the occupant when landing on a taken screw", () => {
    const first = landConductor(drawing(), "loc_b", "cab_1", "black", {
      kind: "terminal",
      slotIndex: 0,
      terminalId: "common",
    });
    const next = landConductor(first, "loc_b", "cab_2", "black", {
      kind: "terminal",
      slotIndex: 0,
      terminalId: "common",
    });
    expect(next.splices).toEqual([
      {
        locationId: "loc_b",
        cableId: "cab_2",
        conductor: "black",
        target: { kind: "terminal", slotIndex: 0, terminalId: "common" },
      },
    ]);
  });

  it("lets a nut hold many conductors", () => {
    const withNut = addNutAndLand(drawing(), "loc_b", "cab_1", "white");
    const nutId = withNut.nuts[0]!.id;
    const next = landConductor(withNut, "loc_b", "cab_2", "white", { kind: "nut", nutId });
    expect(next.nuts).toHaveLength(1);
    expect(next.splices).toHaveLength(2);
    expect(next.splices.every((item) => item.target.kind === "nut" && item.target.nutId === nutId)).toBe(
      true,
    );
  });

  it("disconnects by landing on null and drops empty nuts", () => {
    const withNut = addNutAndLand(drawing(), "loc_b", "cab_1", "white");
    const next = landConductor(withNut, "loc_b", "cab_1", "white", null);
    expect(next.splices).toEqual([]);
    expect(next.nuts).toEqual([]);
  });
});

describe("pruneInternals", () => {
  it("drops a red splice when the cable becomes 12/2", () => {
    const project = landConductor(drawing(), "loc_b", "cab_2", "red", {
      kind: "terminal",
      slotIndex: 0,
      terminalId: "trav-1",
    });
    const next = pruneInternals({
      ...project,
      cables: project.cables.map((item) => (item.id === "cab_2" ? { ...item, type: "12/2" } : item)),
    });
    expect(next.splices).toEqual([]);
  });

  it("drops terminal splices when the device is removed", () => {
    const project = landConductor(drawing(), "loc_b", "cab_1", "black", {
      kind: "terminal",
      slotIndex: 0,
      terminalId: "common",
    });
    const next = pruneInternals({
      ...project,
      locations: project.locations.map((item) =>
        item.id === "loc_b" ? { ...item, slots: [{ device: "empty" }] } : item,
      ),
    });
    expect(next.splices).toEqual([]);
  });
});

describe("suggestNutLabel", () => {
  it("prefers N for white and G for bare", () => {
    expect(suggestNutLabel([], "loc_b", "white")).toBe("N");
    expect(suggestNutLabel([], "loc_b", "bare")).toBe("G");
    expect(suggestNutLabel([{ id: "n1", locationId: "loc_b", label: "N" }], "loc_b", "white")).toBe(
      "G",
    );
  });
});
