import { existsSync } from "node:fs";
import { join } from "node:path";
import type { FailureKind, RunResult } from "./contracts.js";

export interface Diagnosis { kind: FailureKind; evidence: string[]; remediation: string; }

export function diagnoseResult(result: RunResult, artifactDirectory?: string): Diagnosis {
  const kind: FailureKind = result.failureKind ?? (result.status === "passed" ? "unknown" : "unknown");
  const candidates: Record<FailureKind, string[]> = {
    environment: ["manifest.json", "stderr.log"],
    build: ["build.stdout.log", "build.stderr.log"],
    launch: ["stderr.log", "manifest.json"],
    locator: ["frontend-console.jsonl", "accessibility-tree.json", "screenshot.png"],
    timeout: ["stdout.log", "stderr.log", "screenshot.png"],
    assertion: ["result.json", "stdout.log", "screenshot.png"],
    backend: ["backend.log", "event-journal.jsonl", "database-snapshot.sqlite"],
    network: ["network.har", "frontend-console.jsonl", "stderr.log"],
    crash: ["stderr.log", "backend.log", "manifest.json"],
    security: ["manifest.json", "result.json"],
    adapter: ["manifest.json", "stderr.log", "result.json"],
    evidence_incomplete: ["manifest.json", "result.json", "state-timeline.json"],
    unknown: ["result.json", "manifest.json"],
  };
  const evidence = candidates[kind].map((name) => artifactDirectory ? join(artifactDirectory, name) : name).filter((path) => !artifactDirectory || existsSync(path));
  const remediation: Record<FailureKind, string> = {
    environment: "检查运行时、依赖、权限和项目配置。",
    build: "先单独运行构建命令并查看 build stderr。",
    launch: "检查应用启动命令、工作目录和端口。",
    locator: "优先使用 role、label、test id 或稳定 AutomationId。",
    timeout: "检查等待条件、应用日志和网络响应，避免固定 sleep。",
    assertion: "核对期望值与真实业务状态，并查看截图和结果日志。",
    backend: "对照事件日志、数据库快照和后端日志检查事务边界。",
    network: "检查请求、SSE、超时和服务端错误。",
    crash: "检查进程退出码、stderr 和系统事件日志。",
    security: "移除生产构建中的测试端点、调试端口或测试插件。",
    adapter: "检查适配器、驱动、session 建立阶段和启动参数，不要归因于业务断言。",
    evidence_incomplete: "补齐契约要求的证据闭包、状态时间线和可定位引用。",
    unknown: "读取完整 evidence 后再进行人工或 AI 分析。",
  };
  return { kind, evidence, remediation: remediation[kind] };
}
