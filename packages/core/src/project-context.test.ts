import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createProjectContext, isPathInside } from "./project-context.js";

describe("project context", () => {
  it("detects pnpm and rejects paths outside the project", async () => {
    const root = await mkdtemp(join(tmpdir(), "client-test-"));
    await writeFile(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    const context = await createProjectContext(root);
    expect(context.packageManager).toBe("pnpm");
    expect(isPathInside(root, join(root, "client-test.config.yaml"))).toBe(true);
    expect(isPathInside(root, tmpdir())).toBe(false);
  });
});
