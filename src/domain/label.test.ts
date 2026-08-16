import { describe, expect, it } from "vitest";
import { cableOnWireText } from "./label";

describe("cableOnWireText", () => {
  it("shows only the type when the label is empty", () => {
    expect(cableOnWireText({ type: "12/2", label: "" })).toBe("12/2");
    expect(cableOnWireText({ type: "14/3", label: "   " })).toBe("14/3");
  });

  it("joins type and the user label", () => {
    expect(cableOnWireText({ type: "12/2", label: "from brk 29" })).toBe(
      "12/2  from brk 29",
    );
  });
});
