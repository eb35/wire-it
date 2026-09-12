import { describe, expect, it } from "vitest";
import { conductorPath, jacketExits, laneXs, nutApproach, verticalLaneOf } from "./internalsRoute";

describe("internalsRoute", () => {
  it("spreads jacket exits instead of stacking them 8px apart", () => {
    const exits = jacketExits({ x: 24, y: 56, width: 92, height: 40 }, 3);
    expect(exits).toHaveLength(3);
    expect(exits[1]!.y - exits[0]!.y).toBe(12);
    expect(exits[0]!.x).toBe(116);
  });

  it("gives two grounds to one nut different vertical lanes", () => {
    const lanes = laneXs(2, 140);
    const nut = { x: 380, y: 340 };
    const first = conductorPath({ x: 116, y: 70 }, nutApproach(nut, 0, 2), lanes[0]!);
    const second = conductorPath({ x: 116, y: 158 }, nutApproach(nut, 1, 2), lanes[1]!);
    expect(verticalLaneOf(first)).toBe(140);
    expect(verticalLaneOf(second)).toBe(158);
    expect(verticalLaneOf(first)).not.toBe(verticalLaneOf(second));
  });
});
