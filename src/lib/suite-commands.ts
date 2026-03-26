import { invoke } from "@tauri-apps/api/core";

// Manual command wrappers for suite-related Tauri commands.
// These will be replaced by auto-generated bindings after `cargo run`.

export interface Suite {
  id: string;
  name: string;
  description: string;
  agentId: string | null;
  workspaceId: string;
  runMode: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestStep {
  id: string;
  suiteId: string;
  sortOrder: number;
  name: string;
  agentId: string;
  skillName: string;
  requestJson: string;
  assertionsJson: string;
  timeoutMs: number;
}

export interface SuiteRun {
  id: string;
  suiteId: string;
  status: string;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  durationMs: number;
  startedAt: string;
  finishedAt: string | null;
}

export interface StepResult {
  id: string;
  runId: string;
  stepId: string;
  status: string;
  responseJson: string | null;
  assertionResultsJson: string | null;
  errorMessage: string | null;
  durationMs: number;
}

export interface SuiteRunDetail {
  run: SuiteRun;
  stepResults: StepResult[];
}

export type AssertionType =
  | "status_equals"
  | "json_path_equals"
  | "json_path_exists"
  | "json_path_contains"
  | "json_path_matches"
  | "response_time_lt"
  | "contains_media";

export interface Assertion {
  id: string;
  type: AssertionType;
  path?: string;
  expected?: string;
  description?: string;
}

export interface AssertionResult {
  assertionId: string;
  passed: boolean;
  actual?: string;
  message: string;
}

// Wrap invoke calls to match the Result pattern used by bindings.ts
async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  return invoke<T>(cmd, args);
}

export const suiteCommands = {
  createSuite: (name: string, description: string | null, agentId: string | null, workspaceId: string, runMode: string | null) =>
    call<Suite>("create_suite", { name, description, agentId, workspaceId, runMode }),

  updateSuite: (id: string, name: string | null, description: string | null, runMode: string | null) =>
    call<void>("update_suite", { id, name, description, runMode }),

  deleteSuite: (id: string) =>
    call<void>("delete_suite", { id }),

  listSuites: (workspaceId: string, agentId: string | null) =>
    call<Suite[]>("list_suites", { workspaceId, agentId }),

  getSuite: (id: string) =>
    call<Suite>("get_suite", { id }),

  addStep: (suiteId: string, name: string, agentId: string, skillName: string, requestJson: string, assertionsJson: string | null, timeoutMs: number | null) =>
    call<TestStep>("add_step", { suiteId, name, agentId, skillName, requestJson, assertionsJson, timeoutMs }),

  updateStep: (id: string, name: string | null, requestJson: string | null, assertionsJson: string | null, timeoutMs: number | null) =>
    call<void>("update_step", { id, name, requestJson, assertionsJson, timeoutMs }),

  deleteStep: (id: string) =>
    call<void>("delete_step", { id }),

  reorderSteps: (suiteId: string, stepIds: string[]) =>
    call<void>("reorder_steps", { suiteId, stepIds }),

  listSteps: (suiteId: string) =>
    call<TestStep[]>("list_steps", { suiteId }),

  runTestSuite: (suiteId: string) =>
    call<string>("run_test_suite", { suiteId }),

  getSuiteRun: (runId: string) =>
    call<SuiteRunDetail>("get_suite_run", { runId }),

  listSuiteRuns: (suiteId: string, limit: number | null) =>
    call<SuiteRun[]>("list_suite_runs", { suiteId, limit }),

  exportReport: (runId: string, format: string) =>
    call<string>("export_report", { runId, format }),
};
