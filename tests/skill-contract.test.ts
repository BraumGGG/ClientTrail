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

  it("requires one run id and a minimal evidence closure", () => {
    expect(skill).toContain("每次运行只能有一个");
    expect(skill).toContain("required objective");
    expect(skill).toContain("evidence_incomplete");
    expect(skill).toContain("不得用配置中的期望值冒充实际值");
  });

  it("requires warning visibility and lightweight multi-instance consistency checks", () => {
    expect(skill).toContain("cleanupWarning");
    expect(skill).toContain("evidence_warning");
    expect(skill).toContain("预期事实");
    expect(skill).toContain("实际事实");
    expect(skill).toContain("required objective 计数");
    expect(skill).toContain("业务结论：");
    expect(skill).toContain("事实一致性：");
  });

  it("selects incremental tests and permits only one full regression escalation", () => {
    expect(skill).toContain("直接目标");
    expect(skill).toContain("共享边界补测");
    expect(skill).toContain("每个用户测试请求最多发生一次 `incremental -> full`");
    expect(skill).toContain("不自动重跑完整回归");
    expect(skill).toContain("不得计入本次 passed");
  });

  it("reports corrected infrastructure failures and missing instance provenance", () => {
    expect(skill).toContain("缺少业务阶段和可定位业务证据引用的 `assertion` 不可信");
    expect(skill).toContain("通用文件名不算业务断言证据");
    expect(skill).toContain("首个致命信号");
    expect(skill).toContain("实例级 provenance 未产生，双实例 PID/端口/session 未验证");
  });
});
