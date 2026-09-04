import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("skill contract", () => {
  const skill = readFileSync(new URL("../skill/SKILL.md", import.meta.url), "utf8");

  it("separates exploration from deterministic regression", () => {
    expect(skill).toContain("回归测试不调用 MCP");
    expect(skill).toContain("client-test run");
    expect(skill).toContain("client-test setup");
  });

  it("requires setup confirmation and evidence-first diagnosis", () => {
    expect(skill).toContain("dry-run");
    expect(skill).toContain("artifactDirectory");
    expect(skill).toContain("不得把 `failed` 改成 `passed`");
  });
});
