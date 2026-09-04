import { describe, expect, it } from "vitest";
import { webviewInput } from "./tools.js";

describe("MCP WebView tools", () => {
  it("requires selectors for actions and allows local project options", () => {
    expect(() => webviewInput.parse({ selector: "#save", project: "." })).not.toThrow();
    expect(() => webviewInput.parse({ timeout: 0 })).toThrow();
  });
});
