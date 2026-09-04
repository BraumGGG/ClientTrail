import { describe, expect, it } from "vitest";
import { ApplicationManager } from "./application.js";

describe("application manager", () => {
  it("launches and stops a child process", async () => {
    const manager = new ApplicationManager();
    const command = process.platform === "win32" ? `${process.execPath} -e "setInterval(()=>{}, 10000)"` : `${process.execPath} -e "setInterval(()=>{}, 10000)"`;
    expect(manager.launch(command, process.cwd()).running).toBe(true);
    expect(manager.stop().running).toBe(false);
  });
});
