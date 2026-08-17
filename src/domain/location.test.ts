import { describe, expect, it } from "vitest";
import { sideFromHandle } from "./ortho";
import { migrateLegacyDevice, migrateLegacyKind } from "./location";
import { nearestLocation } from "./layout";
import { emptySlots, defaultBreakers } from "./location";
import type { Location } from "./types";

describe("legacy mapping", () => {
  it("maps old devices and fixture kind", () => {
    expect(migrateLegacyDevice("duplex-outlet")).toBe("duplex-15");
    expect(migrateLegacyDevice("gfci-outlet")).toBe("gfci-15");
    expect(migrateLegacyDevice("none")).toBe("empty");
    expect(migrateLegacyKind("fixture")).toBe("box");
    expect(migrateLegacyKind("external")).toBe("external");
  });
});

describe("panel handles", () => {
  it("treats odd breakers as left and even as right", () => {
    expect(sideFromHandle("s-brk-5")).toBe("left");
    expect(sideFromHandle("t-brk-6")).toBe("right");
    expect(sideFromHandle("s-r1")).toBe("right");
  });
});

describe("cable snap", () => {
  it("finds the nearest box within range", () => {
    const box: Location = {
      id: "a",
      kind: "box",
      label: "A",
      code: "A",
      position: { x: 0, y: 0 },
      capacity: 1,
      slots: emptySlots(1),
      spaces: 12,
      breakers: defaultBreakers(12),
      externalRef: "",
    };
    expect(nearestLocation([box], { x: 40, y: 40 })?.id).toBe("a");
    expect(nearestLocation([box], { x: 400, y: 400 })).toBeNull();
  });
});
