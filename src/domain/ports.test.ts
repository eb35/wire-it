import { describe, expect, it } from "vitest";
import { nextLocationCode, nextPort, wireEndCopy, wireTag } from "./ports";
import type { Cable, Location } from "./types";

const box = (id: string, code: string): Location => ({
  id,
  kind: "box",
  label: id,
  code,
  device: "none",
  position: { x: 0, y: 0 },
});

describe("ports", () => {
  it("assigns the next unused box letter", () => {
    expect(nextLocationCode([])).toBe("A");
    expect(nextLocationCode([box("1", "A"), box("2", "C")])).toBe("B");
  });

  it("assigns the next unused port on a box", () => {
    const cables: Cable[] = [
      {
        id: "c1",
        type: "12/2",
        source: "a",
        target: "b",
        sourceHandle: "s-r1",
        targetHandle: "t-l1",
        sourcePort: "1",
        targetPort: "2",
        label: "",
        color: "sheath",
        waypoints: [],
      },
    ];
    expect(nextPort("a", cables)).toBe("2");
    expect(nextPort("b", cables)).toBe("1");
  });

  it("formats end labels as A1 / To B2", () => {
    expect(wireTag("A", "1")).toBe("A1");
    expect(wireEndCopy("A", "1", "B", "2")).toEqual({
      title: "A1",
      subtitle: "To B2",
    });
  });
});
