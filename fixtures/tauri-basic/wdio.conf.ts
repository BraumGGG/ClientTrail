import type { Options } from "@wdio/types";
import { join } from "node:path";

export const config: Options.Testrunner = {
  runner: "local",
  framework: "mocha",
  specs: ["./tests/e2e/**/*.e2e.ts"],
  reporters: ["spec"],
  maxInstances: 1,
  hostname: "localhost",
  port: 4445,
  capabilities: [{}],
  services: [["@wdio/tauri-service", {
    driverProvider: "embedded",
    appBinaryPath: join(process.cwd(), "src-tauri", "target", "debug", process.platform === "win32" ? "client-test-fixture.exe" : "client-test-fixture"),
    pluginConfig: { start: true, build: false },
  }]],
  mochaOpts: { timeout: 120000 },
};
