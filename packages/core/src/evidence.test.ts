import { readFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createProjectContext } from "./project-context.js";
import { EvidenceSession } from "./evidence.js";

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
});
