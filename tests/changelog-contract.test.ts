import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("changelog contract", () => {
  const changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
  const contributing = readFileSync(new URL("../CONTRIBUTING.md", import.meta.url), "utf8");
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

  it("keeps a dated repository-level update record", () => {
    expect(changelog).toContain("## 2026-09-21");
    expect(changelog).toContain("### 新增");
    expect(changelog).toContain("### 修改");
    expect(changelog).toContain("### 修复");
    expect(changelog).toContain("### 验证");
  });

  it("requires future contribution batches to update the changelog", () => {
    expect(contributing).toContain("必须同步更新根目录 `CHANGELOG.md`");
    expect(contributing).toContain("还必须同步更新 `skill/CHANGELOG.md`");
    expect(readme).toContain("[CHANGELOG.md](CHANGELOG.md)");
  });
});

