#!/usr/bin/env node
import { Command } from "commander";
import { fileURLToPath } from "node:url";
import { CommandNotImplementedError, classifyError } from "@client-test/core";
import { createProjectContext } from "@client-test/core";
import { tauriAdapter } from "@client-test/adapter-tauri";
import { printDoctor } from "./output.js";
import { runMcpServer } from "@client-test/mcp/server";
import { detectCargoTest, detectPytest } from "@client-test/adapter-backend";
import { runCargoTest, runPytest } from "@client-test/adapter-backend";
import { aggregateResults } from "@client-test/core";
import { detectElectron, electronRuntimeAvailable, runElectronSuite } from "@client-test/adapter-electron";
import { detectNative, runNativeSuite } from "@client-test/adapter-native";
import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { isPathInside } from "@client-test/core";
import { generateWdioDraft } from "@client-test/core";
import { runProcess } from "@client-test/core";
import { diagnoseResult } from "@client-test/core";
import { readFileSync } from "node:fs";

export function createCli(): Command {
  const cli = new Command();
  cli.name("client-test").description("AI-assisted deterministic client testing").version("0.1.0");
  for (const name of ["doctor", "inspect", "setup", "run", "generate", "diagnose", "evidence", "mcp"]) {
    const command = cli.command(name).description(`${name} project operation`);
    command.option("--project <path>", "project root", process.cwd());
    if (name === "doctor") command.option("--json", "emit machine-readable JSON");
    if (name === "setup") command.option("--dry-run", "show the setup plan without changing files").option("--yes", "apply the plan without prompting").option("--json", "emit machine-readable JSON");
    if (name === "run") command.option("--suite <name>", "WDIO suite name").option("--all", "run all detected suites").option("--json", "emit machine-readable JSON").option("--timeout <ms>", "test timeout in milliseconds", "120000");
    if (name === "generate") command.option("--actions <path>", "recorded actions JSON file").option("--output <path>", "generated test file").option("--force", "overwrite an existing output file").option("--validate", "run TypeScript validation after generation").option("--json", "emit machine-readable JSON");
    if (name === "diagnose") command.option("--result <path>", "result.json path").option("--artifacts <path>", "artifact directory").option("--json", "emit machine-readable JSON");
    if (name === "evidence") command.option("--run <id>", "evidence run id").option("--file <name>", "file inside the run directory").option("--tail <lines>", "return only the last N lines").option("--json", "emit machine-readable JSON");
    command.action(async () => {
      if (name === "doctor") {
        const options = command.opts<{ project: string; json?: boolean }>();
        const context = await createProjectContext(options.project);
        const report = await tauriAdapter.doctor(context);
        const backendDetections = [detectPytest(context), detectCargoTest(context)];
        for (const detection of backendDetections) {
          if (detection.detected) {
            report.recommendedAdapters.push(detection.adapterId);
            report.checks.push({ id: `${detection.adapterId}-project`, status: "pass", message: `${detection.adapterId} project detected`, details: detection.evidence });
          }
        }
        const electronDetection = detectElectron(context);
        if (electronDetection.detected) {
          report.recommendedAdapters.push(electronDetection.adapterId);
          report.checks.push({ id: "electron-project", status: "pass", message: "Electron project detected", details: electronDetection.evidence });
          report.checks.push({ id: "electron-runtime", status: electronRuntimeAvailable(context) ? "pass" : "fail", message: electronRuntimeAvailable(context) ? "Electron runtime available" : "Electron runtime missing; run the package postinstall" });
        }
        const nativeDetection = detectNative(context);
        if (nativeDetection.detected) {
          report.recommendedAdapters.push(nativeDetection.adapterId);
          report.checks.push({ id: `${nativeDetection.adapterId}-project`, status: "pass", message: `${nativeDetection.adapterId} automation configured`, details: nativeDetection.evidence });
        }
        printDoctor(report, Boolean(options.json));
        if (report.checks.some((check) => check.status === "fail")) process.exitCode = 2;
        return;
      }
      if (name === "setup") {
        const options = command.opts<{ project: string; dryRun?: boolean; yes?: boolean; json?: boolean }>();
        const context = await createProjectContext(options.project);
        const plan = await tauriAdapter.planSetup(context);
        if (!options.yes || options.dryRun) {
          if (options.json) console.log(JSON.stringify(plan));
          else {
            console.log(`Setup risk: ${plan.productionRisk}`);
            console.log(`Dependencies: ${plan.dependencies.join(", ") || "none"}`);
            console.log(`Create: ${plan.filesToCreate.join(", ") || "none"}`);
            console.log(`Commands: ${plan.commands.map((item) => `${item.executable} ${item.args.join(" ")}`).join(" && ") || "none"}`);
          }
          if (options.dryRun || !options.yes) return;
        }
        const result = await tauriAdapter.applySetup(context, plan);
        const commandResults = [];
        for (const command of plan.commands) {
          const executable = process.platform === "win32" && ["pnpm", "npm", "yarn", "bun"].includes(command.executable) ? `${command.executable}.cmd` : command.executable;
          const commandResult = await runProcess({ ...command, executable }, { timeoutMs: 300_000, redact: context.config.artifacts.redact });
          commandResults.push({ command: { ...command, executable }, exitCode: commandResult.exitCode, timedOut: commandResult.timedOut, stdout: commandResult.stdout, stderr: commandResult.stderr });
          if (commandResult.timedOut || commandResult.exitCode !== 0) {
            process.exitCode = 2;
            break;
          }
        }
        console.log(JSON.stringify({ ...result, plan, commandResults }));
        return;
      }
      if (name === "run") {
        const options = command.opts<{ project: string; suite?: string; all?: boolean; json?: boolean; timeout: string }>();
        const context = await createProjectContext(options.project);
        const results = [];
        const tauriDetection = await tauriAdapter.detect(context);
        if (tauriDetection.detected) results.push(await tauriAdapter.run(context, { suite: options.suite, timeoutMs: Number(options.timeout) }));
        if (options.all && detectPytest(context).detected) results.push(await runPytest(context, { timeoutMs: Number(options.timeout) }));
        if (options.all && detectCargoTest(context).detected) results.push(await runCargoTest(context, { timeoutMs: Number(options.timeout) }));
        if (options.all && detectElectron(context).detected) results.push(await runElectronSuite(context, { timeoutMs: Number(options.timeout) }));
        if (options.all && detectNative(context).detected) results.push(await runNativeSuite(context, { timeoutMs: Number(options.timeout) }));
        const aggregate = aggregateResults(results);
        if (options.json) console.log(JSON.stringify({ ...aggregate, suites: results }));
        else console.log(`${aggregate.status}: ${results.length} suite(s), failures: ${aggregate.failureKinds.join(", ") || "none"}`);
        if (aggregate.status !== "passed") process.exitCode = 3;
        return;
      }
      if (name === "generate") {
        const options = command.opts<{ project: string; actions?: string; output?: string; force?: boolean; validate?: boolean; json?: boolean }>();
        if (!options.actions || !options.output) throw new Error("generate requires --actions and --output");
        const context = await createProjectContext(options.project);
        const actionsPath = join(context.projectRoot, options.actions);
        const outputPath = join(context.projectRoot, options.output);
        if (!isPathInside(context.projectRoot, actionsPath) || !isPathInside(context.projectRoot, outputPath)) throw new Error("generate paths must remain inside the project root");
        if (existsSync(outputPath) && !options.force) throw new Error(`Refusing to overwrite existing file: ${outputPath}`);
        const actions = JSON.parse(await readFile(actionsPath, "utf8"));
        if (!Array.isArray(actions) || actions.some((action) => typeof action !== "object" || typeof action.selector !== "string" || typeof action.type !== "string")) throw new Error("Invalid recorded actions JSON");
        const draft = generateWdioDraft(actions);
        await (await import("node:fs/promises")).mkdir(dirname(outputPath), { recursive: true });
        await (await import("node:fs/promises")).writeFile(outputPath, draft, "utf8");
        let validation: { status: "passed" | "failed"; stdout?: string; stderr?: string } | undefined;
        if (options.validate) {
          const packageManager = context.packageManager ?? "pnpm";
          const executable = process.platform === "win32" ? `${packageManager}.cmd` : packageManager;
          const args = packageManager === "npm" ? ["exec", "tsc", "--", "--noEmit"] : packageManager === "yarn" ? ["tsc", "--noEmit"] : packageManager === "bun" ? ["x", "tsc", "--noEmit"] : ["exec", "tsc", "--noEmit"];
          const check = await runProcess({ executable, args, cwd: context.projectRoot }, { timeoutMs: 120_000, redact: context.config.artifacts.redact });
          validation = { status: check.exitCode === 0 && !check.timedOut ? "passed" : "failed", stdout: check.stdout, stderr: check.stderr };
          if (validation.status === "failed") process.exitCode = 3;
        }
        const result = { output: outputPath, actionCount: actions.length, requiresValidation: true, validationCommand: "client-test run", validation };
        if (options.json) console.log(JSON.stringify(result)); else console.log(`Generated ${outputPath} from ${actions.length} action(s). Validate with: ${result.validationCommand}`);
        return;
      }
      if (name === "diagnose") {
        const options = command.opts<{ project: string; result?: string; artifacts?: string; json?: boolean }>();
        if (!options.result) throw new Error("diagnose requires --result");
        const context = await createProjectContext(options.project);
        const resultPath = join(context.projectRoot, options.result);
        if (!isPathInside(context.projectRoot, resultPath)) throw new Error("result path must remain inside the project root");
        const diagnosis = diagnoseResult(JSON.parse(readFileSync(resultPath, "utf8")), options.artifacts ? join(context.projectRoot, options.artifacts) : dirname(resultPath));
        if (options.json) console.log(JSON.stringify(diagnosis)); else console.log(`${diagnosis.kind}: ${diagnosis.remediation}\nEvidence: ${diagnosis.evidence.join(", ") || "none"}`);
        return;
      }
      if (name === "evidence") {
        const options = command.opts<{ project: string; run?: string; file?: string; tail?: string; json?: boolean }>();
        const context = await createProjectContext(options.project);
        const artifactRoot = join(context.projectRoot, context.config.artifacts.directory);
        if (!isPathInside(context.projectRoot, artifactRoot)) throw new Error("artifact directory must remain inside the project root");
        const entries = await readdir(artifactRoot, { withFileTypes: true }).catch(() => []);
        const runs = [];
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const directory = join(artifactRoot, entry.name);
          const info = await stat(directory);
          runs.push({ runId: entry.name, directory, modifiedAt: info.mtime.toISOString() });
        }
        runs.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
        const selected = options.run ? runs.find((run) => run.runId === options.run) : runs[0];
        if (!selected) {
          const result = { artifactDirectory: artifactRoot, runs: [] };
          if (options.json) console.log(JSON.stringify(result)); else console.log(`No evidence runs found at ${artifactRoot}`);
          return;
        }
        if (!options.file) {
          const files = (await readdir(selected.directory, { withFileTypes: true })).filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
          const result = { runId: selected.runId, artifactDirectory: selected.directory, files };
          if (options.json) console.log(JSON.stringify(result)); else console.log(`${selected.runId}\n${files.join("\n")}`);
          return;
        }
        const filePath = join(selected.directory, options.file);
        if (!isPathInside(selected.directory, filePath)) throw new Error("evidence file must remain inside the selected run directory");
        const raw = await readFile(filePath, "utf8");
        const lineCount = options.tail ? Number(options.tail) : undefined;
        if (lineCount !== undefined && (!Number.isInteger(lineCount) || lineCount <= 0)) throw new Error("--tail must be a positive integer");
        const content = lineCount ? raw.split(/\r?\n/).slice(-lineCount).join("\n") : raw;
        const result = { runId: selected.runId, file: options.file, content };
        if (options.json) console.log(JSON.stringify(result)); else process.stdout.write(content.endsWith("\n") ? content : `${content}\n`);
        return;
      }
      if (name === "mcp") {
        await runMcpServer();
        return;
      }
      throw new CommandNotImplementedError(name);
    });
  }
  return cli;
}

if (fileURLToPath(import.meta.url).toLowerCase() === process.argv[1]?.toLowerCase()) {
  createCli().parseAsync(process.argv).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = classifyError(error) === "environment" ? 2 : classifyError(error) === "assertion" || classifyError(error) === "timeout" ? 3 : 4;
  });
}
