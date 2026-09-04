import type { DoctorReport } from "@client-test/core";

export function printDoctor(report: DoctorReport, json: boolean): void {
  if (json) {
    process.stdout.write(`${JSON.stringify(report)}\n`);
    return;
  }
  console.log(`Project: ${report.projectRoot}`);
  console.log(`Platform: ${report.platform}`);
  for (const check of report.checks) console.log(`[${check.status.toUpperCase()}] ${check.id}: ${check.message}`);
  console.log(`Recommended adapters: ${report.recommendedAdapters.join(", ") || "none"}`);
}
