#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const { dirname, join } = require("node:path");

const root = dirname(__dirname);
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(pnpm, ["exec", "tsx", join(root, "packages", "cli", "src", "main.ts"), ...process.argv.slice(2)], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
  windowsHide: true,
});
if (result.error) {
  console.error(`Unable to start ClientTrail CLI: ${result.error.message}`);
  process.exitCode = 2;
} else {
  process.exitCode = result.status ?? 4;
}
