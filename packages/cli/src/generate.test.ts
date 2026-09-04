import { describe, expect, it } from "vitest";
import { createCli } from "./main.js";

describe("generate command", () => {
  it("registers a command that accepts recorded action input", () => {
    const command = createCli().commands.find((item) => item.name() === "generate");
    expect(command?.options.some((option) => option.long === "--actions")).toBe(true);
    expect(command?.options.some((option) => option.long === "--output")).toBe(true);
  });
});
