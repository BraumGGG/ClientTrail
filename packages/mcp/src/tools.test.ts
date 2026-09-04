import { describe, expect, it } from "vitest";
import { unsupported, textResult } from "./tools.js";

describe("MCP tools", () => {
  it("returns structured capability errors", () => {
    const result = unsupported("ui_snapshot");
    expect(result.error.code).toBe("capability-unavailable");
    expect(JSON.parse(textResult(result).content[0].text).error.operation).toBe("ui_snapshot");
  });
});
