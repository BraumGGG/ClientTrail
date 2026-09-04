import { describe, expect, it } from "vitest";
import { runProcess } from "./process-runner.js";

describe("process runner", () => {
  it("runs argument arrays without a shell", async () => {
    const result = await runProcess({ executable: process.execPath, args: ["-e", "console.log('ok')"], cwd: process.cwd() });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("ok");
  });

  it("times out and terminates a child", async () => {
    const result = await runProcess({ executable: process.execPath, args: ["-e", "setTimeout(()=>{}, 10000)"], cwd: process.cwd() }, { timeoutMs: 20 });
    expect(result.timedOut).toBe(true);
  });
});
