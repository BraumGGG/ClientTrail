import type { ChildProcess } from "node:child_process";
import crossSpawn from "cross-spawn";
import { parseCommand } from "./command.js";

export interface AppStatus { running: boolean; pid?: number; command?: string; }

export class ApplicationManager {
  private child?: ChildProcess;
  private command?: string;

  launch(command: string, cwd: string): AppStatus {
    if (this.child && !this.child.killed) return this.status();
    const parsed = parseCommand(command, cwd);
    const executableName = process.platform === "win32" && ["pnpm", "npm", "yarn", "bun"].includes(parsed.executable) ? `${parsed.executable}.cmd` : parsed.executable;
    this.child = crossSpawn(executableName, parsed.args, { cwd, shell: false, windowsHide: true, stdio: "ignore" });
    this.child.once("error", () => { this.child = undefined; });
    this.command = command;
    return this.status();
  }

  stop(): AppStatus {
    if (this.child && !this.child.killed) {
      try { this.child.kill(); } catch { /* process may have failed before a PID was assigned */ }
    }
    this.child = undefined;
    return { running: false };
  }

  status(): AppStatus {
    return this.child && !this.child.killed ? { running: true, pid: this.child.pid, command: this.command } : { running: false };
  }
}
