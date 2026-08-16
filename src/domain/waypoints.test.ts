import { describe, expect, it } from "vitest";
import { insertWaypoint, removeWaypoint, updateWaypoint } from "./waypoints";

describe("waypoints", () => {
  it("inserts on the nearest segment", () => {
    const next = insertWaypoint(
      [{ x: 50, y: 0 }],
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 80, y: 4 },
    );
    expect(next).toEqual([
      { x: 50, y: 0 },
      { x: 80, y: 4 },
    ]);
  });

  it("updates and removes a bend", () => {
    const points = [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ];
    expect(updateWaypoint(points, 1, { x: 21, y: 22 })).toEqual([
      { x: 10, y: 10 },
      { x: 21, y: 22 },
    ]);
    expect(removeWaypoint(points, 0)).toEqual([{ x: 20, y: 20 }]);
  });
});
