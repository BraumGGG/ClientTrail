import { describe, expect, it } from "vitest";
import { AdapterRegistry } from "./registry.js";
import type { ProjectContext, TestAdapter } from "./contracts.js";

const context = {} as ProjectContext;
const adapter = (id: string): TestAdapter => ({
  id,
  detect: async () => ({ adapterId: id, detected: true, confidence: 1, evidence: [], capabilities: [] }),
  doctor: async () => ({ schemaVersion: 1, projectRoot: ".", platform: "win32", checks: [], recommendedAdapters: [] }),
  planSetup: async () => ({ projectRoot: ".", dependencies: [], filesToCreate: [], filesToModify: [], commands: [], productionRisk: "none" }),
  applySetup: async () => ({ changedFiles: [] }),
  run: async () => ({ status: "passed" }),
});

describe("adapter registry", () => {
  it("detects registered adapters and rejects duplicates", async () => {
    const registry = new AdapterRegistry().register(adapter("one"));
    expect((await registry.detectAll(context))[0]?.adapterId).toBe("one");
    expect(() => registry.register(adapter("one"))).toThrow("Adapter already registered");
  });
});
