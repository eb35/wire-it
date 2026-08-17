import { describe, expect, it } from "vitest";
import { emptySlots, defaultBreakers } from "./location";
import { autoRoute, locationRect, segmentHitsRect } from "./route";
import type { Location } from "./types";

function box(id: string, x: number, y: number, capacity: 1 | 2 | 3 = 1): Location {
  return {
    id,
    kind: "box",
    label: id,
    code: id,
    position: { x, y },
    capacity,
    slots: emptySlots(capacity),
    spaces: 12,
    breakers: defaultBreakers(12),
    externalRef: "",
  };
}

describe("autoRoute", () => {
  it("draws a straight run when landings already line up", () => {
    const path = autoRoute(
      { x: 96, y: 100 },
      "right",
      { x: 220, y: 100 },
      "left",
      [],
    );
    expect(path).toHaveLength(2);
  });

  it("keeps orthogonal segments", () => {
    const path = autoRoute(
      { x: 96, y: 100 },
      "right",
      { x: 220, y: 180 },
      "left",
      [],
    );
    for (let i = 0; i < path.length - 1; i += 1) {
      const a = path[i]!;
      const b = path[i + 1]!;
      expect(a.x === b.x || a.y === b.y).toBe(true);
    }
  });

  it("goes around a blocking box instead of through it", () => {
    const wall = box("wall", 140, 40, 2);
    const obstacle = locationRect(wall);
    const path = autoRoute(
      { x: 96, y: 120 },
      "right",
      { x: 400, y: 120 },
      "left",
      [obstacle],
      0,
    );
    for (let i = 1; i < path.length - 2; i += 1) {
      expect(segmentHitsRect(path[i]!, path[i + 1]!, obstacle)).toBe(false);
    }
  });

  it("walks around a connected box instead of through it", () => {
    const unit = box("a", 100, 80, 2);
    const rect = locationRect(unit);
    const start = { x: rect.x, y: rect.y + 50 };
    const end = { x: rect.x + rect.width + 60, y: rect.y - 40 };
    const path = autoRoute(start, "left", end, "bottom", [], 0, rect);
    for (let i = 1; i < path.length - 1; i += 1) {
      expect(segmentHitsRect(path[i]!, path[i + 1]!, rect)).toBe(false);
    }
  });
});
