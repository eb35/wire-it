import { describe, expect, it } from "vitest";
import {
  jacketExits,
  laneXs,
  nutApproach,
  pathFromPoints,
  routeToHandle,
  terminalHandle,
  verticalLaneOf,
} from "./internalsRoute";

const device = { x: 380, y: 64, width: 120, height: 200 };

describe("internalsRoute", () => {
  it("spreads jacket exits instead of stacking them 8px apart", () => {
    const exits = jacketExits({ x: 24, y: 56, width: 92, height: 40 }, 3);
    expect(exits).toHaveLength(3);
    expect(exits[1]!.y - exits[0]!.y).toBe(12);
    expect(exits[0]!.x).toBe(116);
  });

  it("keeps many lanes in the gutter left of the device", () => {
    const lanes = laneXs(12, 148, 356);
    expect(Math.max(...lanes)).toBeLessThanOrEqual(356);
    expect(Math.min(...lanes)).toBeGreaterThanOrEqual(148);
  });

  it("gives two grounds to one nut different vertical lanes", () => {
    const lanes = laneXs(2, 140, 220);
    const nut = { x: 380, y: 340 };
    const first = pathFromPoints(routeToHandle({ x: 116, y: 70 }, nutApproach(nut, 0, 2), lanes[0]!, "nut"));
    const second = pathFromPoints(routeToHandle({ x: 116, y: 158 }, nutApproach(nut, 1, 2), lanes[1]!, "nut"));
    expect(verticalLaneOf(first)).not.toBe(verticalLaneOf(second));
    expect(verticalLaneOf(first)).toBeLessThan(380);
    expect(verticalLaneOf(second)).toBeLessThan(380);
  });

  it("approaches a left terminal without going past the tip", () => {
    const handle = terminalHandle({ x: 380, y: 140 }, "left");
    const points = routeToHandle({ x: 116, y: 80 }, handle, 400, "left", device);
    expect(handle.x).toBeLessThan(380);
    expect(points.every((point) => point.x <= handle.x + 0.1)).toBe(true);
  });

  it("routes a top ground over the device instead of along its side", () => {
    const handle = terminalHandle({ x: 440, y: 64 }, "top");
    const points = routeToHandle({ x: 116, y: 120 }, handle, 200, "top", device);
    const alongEdge = points.some(
      (point) => Math.abs(point.x - device.x) < 8 && point.y >= device.y && point.y <= device.y + device.height,
    );
    expect(alongEdge).toBe(false);
    expect(points.some((point) => point.y < device.y)).toBe(true);
  });
});
