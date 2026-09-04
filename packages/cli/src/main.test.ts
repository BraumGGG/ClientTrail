import { describe, expect, it } from "vitest";
import { createCli } from "./main.js";

describe("client-test CLI", () => {
  it("registers the stable command surface", () => {
    expect(createCli().commands.map((command) => command.name())).toEqual([
      "doctor", "inspect", "setup", "run", "generate", "diagnose", "evidence", "mcp",
    ]);
  });
});
