import { describe, expect, it } from "vitest";
import { createCli } from "./main.js";

describe("client-test CLI", () => {
  it("registers the stable command surface", () => {
    expect(createCli().commands.map((command) => command.name())).toEqual([
      "doctor", "inspect", "setup", "run", "generate", "diagnose", "evidence", "mcp",
    ]);
  });

  it("does not add a separate workflow or replay command", () => {
    const names = createCli().commands.map((command) => command.name());
    expect(names).not.toContain("workflow");
    expect(names).not.toContain("replay");
    expect(names).not.toContain("fault-matrix");
  });
});
