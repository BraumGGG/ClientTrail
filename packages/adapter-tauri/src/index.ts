import type { DoctorReport, ProjectContext, SetupPlan, TestAdapter } from "@client-test/core";
import { detectTauri } from "./detect.js";
import { runTauriDoctor } from "./doctor.js";
import { createTauriSetupPlan } from "./setup-plan.js";
import { applyTauriSetupPlan } from "./apply-setup.js";
import { runTauriSuite } from "./run.js";

export const tauriAdapter: TestAdapter = {
  id: "tauri-2",
  detect: detectTauri,
  doctor: runTauriDoctor,
  planSetup: createTauriSetupPlan,
  applySetup: applyTauriSetupPlan,
  run: async (context, options) => runTauriSuite(context, options),
};
