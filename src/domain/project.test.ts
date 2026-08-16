import { describe, expect, it } from "vitest";
import { emptyProject, parseProject } from "./project";

describe("parseProject", () => {
  it("round-trips an empty drawing", () => {
    const project = emptyProject("Test");
    expect(parseProject(JSON.parse(JSON.stringify(project)))).toEqual(project);
  });

  it("rejects the wrong version", () => {
    expect(() => parseProject({ version: 99, id: "x", name: "Nope" })).toThrow(
      /unexpected version/,
    );
  });
});
