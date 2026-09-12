import { describe, expect, it } from "vitest";
import { landingPoint, landingsForLocation, pickConnection, uniqueBoxHandle } from "./handles";
import { emptySlots, defaultBreakers } from "./location";
import type { Cable, Location } from "./types";

function box(id: string, x: number, y: number): Location {
  return {
    id,
    kind: "box",
    label: id,
    code: id,
    position: { x, y },
    capacity: 1,
    slots: emptySlots(1),
    spaces: 12,
    breakers: defaultBreakers(12),
    externalRef: "",
  };
}

function cable(id: string, source: string, target: string, sourceHandle: string, targetHandle: string): Cable {
  return {
    id,
    type: "12/2",
    source,
    target,
    sourceHandle,
    targetHandle,
    sourcePort: "1",
    targetPort: "1",
    label: "",
    color: "sheath",
    waypoints: [],
  };
}

describe("landingsForLocation", () => {
  it("keeps a unique key per cable even when two runs share a handle id", () => {
    const cables = [
      cable("cab_a", "box", "other", "s-r-50", "t-l-50"),
      cable("cab_b", "box", "third", "s-r-50", "t-l-50"),
    ];
    const landings = landingsForLocation("box", cables);
    const keys = landings.map((landing) => `${landing.cableId}-${landing.role}`);
    expect(keys).toEqual(["cab_a-source", "cab_b-source"]);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("landingPoint", () => {
  it("puts a panel breaker on that row, not the box midline", () => {
    const panel: Location = {
      ...box("panel", 40, 80),
      kind: "panel",
      spaces: 12,
      breakers: defaultBreakers(12),
    };
    const first = landingPoint(panel, "s-brk-1");
    const fifth = landingPoint(panel, "s-brk-5");
    expect(first.x).toBe(40);
    expect(fifth.x).toBe(40);
    expect(fifth.y).toBeGreaterThan(first.y);
  });
});

describe("uniqueBoxHandle", () => {
  it("nudges off a handle that is already used on that box", () => {
    const existing = [cable("cab_a", "box", "other", "s-r-50", "t-l-50")];
    expect(uniqueBoxHandle("source", "right", 0.5, "box", existing)).not.toBe("s-r-50");
  });
});

describe("pickConnection", () => {
  it("does not reuse a source handle already leaving the same box", () => {
    const source = box("a", 0, 0);
    const firstTarget = box("b", 400, 0);
    const secondTarget = box("c", 520, 0);
    const first = pickConnection(source, firstTarget, []);
    const existing = [cable("cab_a", "a", "b", first.sourceHandle, first.targetHandle)];
    const second = pickConnection(source, secondTarget, existing);
    expect(second.sourceHandle).not.toBe(first.sourceHandle);
  });
});
