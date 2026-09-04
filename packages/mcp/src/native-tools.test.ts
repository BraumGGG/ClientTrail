import { describe, expect, it } from "vitest";
import { nativeInput } from "./tools.js";

describe("MCP native tools", () => {
  it("requires an application name and rejects unknown fields", () => {
    expect(() => nativeInput.parse({ app: "notepad", selector: "Save" })).not.toThrow();
    expect(() => nativeInput.parse({ app: "notepad", unknown: true })).toThrow();
  });
});
