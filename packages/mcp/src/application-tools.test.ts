import { describe, expect, it } from "vitest";
import { applicationStatus, launchApplication, stopApplication } from "./tools.js";

describe("MCP application tools", () => {
  it("returns a configuration error when no app command is configured", async () => {
    const result = await launchApplication({ project: process.cwd() });
    expect("error" in result && result.error.code).toBe("configuration");
    expect(stopApplication().running).toBe(false);
    expect(applicationStatus().running).toBe(false);
  });
});
