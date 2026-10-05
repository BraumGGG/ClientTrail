import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createProjectContext } from "@client-test/core";
import { createRequestRunId, writeAggregateResult } from "./run-request.js";

describe("run request evidence", () => {
  it("creates a stable request id", () => {
    const id = createRequestRunId(new Date("2026-10-06T01:02:03.004Z"), () => "12345678-rest");
    expect(id).toBe("request-2026-10-06T01-02-03-004Z-12345678");
  });

  it("atomically writes the aggregate result with selection and suite links", async () => {
    const root = await mkdtemp(join(tmpdir(), "client-test-request-"));
    const context = await createProjectContext(root);
    const result = await writeAggregateResult({
      context,
      requestRunId: "request-fixed",
      startedAt: "2026-10-06T01:00:00.000Z",
      aggregate: {
        status: "blocked",
        failureKinds: ["capability_not_configured"],
        suites: [
          { status: "passed", adapterId: "cargo-test", runId: "cargo-run", artifactDirectory: "cargo-dir" },
          { status: "blocked", adapterId: "tauri-2", runId: "tauri-run", artifactDirectory: "tauri-dir", failureKind: "capability_not_configured" },
        ],
      },
      selection: {
        mode: "full",
        selected: [{ adapterId: "tauri-2", reason: "Tauri project detected" }, { adapterId: "cargo-test", reason: "--all selected detected backend" }],
        notSelected: [],
      },
    });

    expect(result.finalized).toBe(true);
    expect(result.producerVersion).toBe("0.1.0");
    const saved = JSON.parse(await readFile(result.aggregateResultPath, "utf8"));
    expect(saved.requestRunId).toBe("request-fixed");
    expect(saved.status).toBe("blocked");
    expect(saved.suites.map((suite: { runId: string }) => suite.runId)).toEqual(["cargo-run", "tauri-run"]);
    expect(saved.selection.mode).toBe("full");
  });
});
