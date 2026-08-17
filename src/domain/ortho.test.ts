import { describe, expect, it } from "vitest";
import { buildOrthoPath, collapseColinear, insertBendOnSegment, moveOrthoSegment } from "./ortho";

describe("ortho", () => {
  it("never produces a diagonal segment", () => {
    const path = buildOrthoPath(
      { x: 0, y: 0 },
      "right",
      [{ x: 40, y: 80 }],
      { x: 120, y: 40 },
      "left",
    );
    for (let i = 0; i < path.length - 1; i += 1) {
      const a = path[i]!;
      const b = path[i + 1]!;
      expect(a.x === b.x || a.y === b.y).toBe(true);
    }
  });

  it("collapses points that sit on a straight run", () => {
    expect(
      collapseColinear([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 5 },
      ]),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 5 },
    ]);
  });

  it("turns a straight run into a 90 degree jog", () => {
    const next = insertBendOnSegment(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      0,
      20,
    );
    expect(next).toEqual([
      { x: 0, y: 20 },
      { x: 100, y: 20 },
    ]);
  });

  it("keeps a dragged segment on a 90 degree path", () => {
    const next = moveOrthoSegment(
      { x: 0, y: 0 },
      "right",
      [
        { x: 50, y: 0 },
        { x: 50, y: 40 },
      ],
      { x: 100, y: 40 },
      "left",
      1,
      { x: 70, y: 10 },
    );
    const path = buildOrthoPath(
      { x: 0, y: 0 },
      "right",
      next,
      { x: 100, y: 40 },
      "left",
    );
    for (let i = 0; i < path.length - 1; i += 1) {
      const a = path[i]!;
      const b = path[i + 1]!;
      expect(a.x === b.x || a.y === b.y).toBe(true);
    }
  });
});
