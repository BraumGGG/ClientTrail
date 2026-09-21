import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createProjectContext } from "./project-context.js";
import { EvidenceSession } from "./evidence.js";
import { validateTestContract } from "./test-contract.js";

describe("evidence session", () => {
  it("creates a run directory and final result", async () => {
    const root = await mkdtemp(join(tmpdir(), "evidence-"));
    const context = await createProjectContext(root);
    const session = await EvidenceSession.create(context);
    await session.write("stdout.log", "token=hidden");
    await session.finalize("passed");
    expect(JSON.parse(await readFile(join(session.directory, "result.json"), "utf8")).status).toBe("passed");
    expect(await readFile(join(session.directory, "stdout.log"), "utf8")).toContain("[REDACTED]");
  });

  it("exposes one child environment for the whole evidence session", async () => {
    const root = await mkdtemp(join(tmpdir(), "evidence-env-"));
    const session = await EvidenceSession.create(await createProjectContext(root));
    expect(session.childEnvironment()).toEqual({
      CLIENT_TEST_RUN_ID: session.runId,
      CLIENT_TEST_ARTIFACT_DIR: session.directory,
    });
  });

  it("blocks a nominally passing run when a required objective has no terminal event", async () => {
    const root = await mkdtemp(join(tmpdir(), "evidence-objective-"));
    const context = await createProjectContext(root);
    const contract = validateTestContract({
      contractVersion: 1,
      objectives: [
        { id: "launch", description: "launch", required: true },
        { id: "share", description: "share", required: true },
      ],
      preconditions: [],
      requiredCapabilities: [],
      optionalDegradations: [],
      passCriteria: [],
      failCriteria: [],
      blockedCriteria: [],
    });
    const session = await EvidenceSession.create(context, contract);
    await session.recordObjective({ objectiveId: "launch", state: "passed" });
    await session.write("stdout.log", "");
    await session.write("stderr.log", "");
    session.markNotProduced("video.mp4", "recorder disabled");
    const finalized = await session.finalize("passed", { exitCode: 0 });

    expect(finalized.status).toBe("blocked");
    expect(finalized.failureKind).toBe("evidence_incomplete");
    expect(finalized.objectiveSummary?.counts.notExecuted).toBe(1);
    expect(finalized.evidenceWarnings).toContain("stdout.log is empty");
    expect(finalized.evidenceWarnings).toContain("video.mp4 was not produced: recorder disabled");

    const manifest = JSON.parse(await readFile(join(session.directory, "manifest.json"), "utf8"));
    expect(manifest.files["stdout.log"].status).toBe("empty");
    expect(manifest.files["video.mp4"].status).toBe("not-produced");
  });

  it("records runtime instance facts in the final result", async () => {
    const root = await mkdtemp(join(tmpdir(), "evidence-runtime-"));
    const session = await EvidenceSession.create(await createProjectContext(root));
    await session.recordRuntimeInstance({ instanceId: "runner", pid: 1234, binaryPath: "node" });
    const finalized = await session.finalize("passed", { exitCode: 0 });
    expect(finalized.runtimeInstances).toEqual([{ instanceId: "runner", pid: 1234, binaryPath: "node" }]);
  });

  it("ingests objective events written by a child process", async () => {
    const root = await mkdtemp(join(tmpdir(), "evidence-child-events-"));
    const context = await createProjectContext(root);
    const contract = validateTestContract({
      contractVersion: 1,
      objectives: [{ id: "launch", description: "launch", required: true }],
      preconditions: [],
      requiredCapabilities: [],
      optionalDegradations: [],
      passCriteria: [],
      failCriteria: [],
      blockedCriteria: [],
    });
    const session = await EvidenceSession.create(context, contract);
    await writeFile(join(session.directory, "objective-events.json"), JSON.stringify([{
      runId: session.runId,
      objectiveId: "launch",
      state: "passed",
      at: "2026-09-20T00:00:00.000Z",
    }]), "utf8");

    const finalized = await session.finalize("passed", { exitCode: 0 });
    expect(finalized.status).toBe("passed");
    expect(finalized.objectiveSummary?.allRequiredPassed).toBe(true);
  });

  it("reconciles unproven objective assertions after a runner timeout", async () => {
    const root = await mkdtemp(join(tmpdir(), "evidence-timeout-objectives-"));
    const context = await createProjectContext(root);
    const contract = validateTestContract({
      contractVersion: 1,
      objectives: [
        { id: "launch", description: "launch", required: true },
        { id: "share", description: "share", required: true },
      ],
      preconditions: [],
      requiredCapabilities: [],
      optionalDegradations: [],
      passCriteria: [],
      failCriteria: [],
      blockedCriteria: [],
    });
    const session = await EvidenceSession.create(context, contract);
    await writeFile(join(session.directory, "objective-events.json"), JSON.stringify([
      { runId: session.runId, objectiveId: "launch", state: "failed", failureKind: "assertion", message: "业务断言失败", at: "2026-09-21T00:00:01.000Z" },
      { runId: session.runId, objectiveId: "share", state: "failed", failureKind: "assertion", message: "业务断言失败", at: "2026-09-21T00:00:02.000Z" },
    ]), "utf8");

    const finalized = await session.finalize("failed", { failureKind: "timeout", timedOut: true, signal: "SIGTERM" });

    expect(finalized.objectiveSummary?.objectives).toEqual([
      expect.objectContaining({ id: "launch", state: "failed", failureKind: "timeout" }),
      expect.objectContaining({ id: "share", state: "blocked", blockedBy: "launch" }),
    ]);
    expect(finalized.evidenceWarnings).toContain("objective failure classifications were corrected from unproven assertions using run-level timeout");
  });
});
