import { describe, expect, it } from "vitest";
import { parseCommand } from "./command.js";

describe("command parsing", () => {
  it("preserves Windows paths and quoted arguments", () => {
    const result = parseCommand('"D:\\tools\\node.exe" -e "setInterval(() => {}, 1000)"', "C:\\project");
    expect(result).toEqual({ executable: "D:\\tools\\node.exe", args: ["-e", "setInterval(() => {}, 1000)"], cwd: "C:\\project" });
  });

  it("accepts structured commands without shell parsing", () => {
    expect(parseCommand({ executable: "pnpm", args: ["test", "--run"] }, "/tmp/project")).toEqual({ executable: "pnpm", args: ["test", "--run"], cwd: "/tmp/project" });
  });
});
