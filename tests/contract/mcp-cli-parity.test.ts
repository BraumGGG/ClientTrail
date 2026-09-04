import { describe, expect, it } from "vitest";
import { projectStatusInput } from "../../packages/mcp/src/tools.js";

describe("MCP and CLI contract", () => {
  it("rejects unknown project status fields", () => {
    expect(() => projectStatusInput.parse({ project: ".", extra: true })).toThrow();
  });
});
