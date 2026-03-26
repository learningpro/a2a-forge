import { invoke } from "@tauri-apps/api/core";

export interface EnvVariable {
  id: string;
  workspaceId: string;
  name: string;
  value: string;
  isSecret: boolean;
  createdAt: string;
}

export interface RequestChain {
  id: string;
  name: string;
  description: string;
  workspaceId: string;
  createdAt: string;
}

export interface ChainStep {
  id: string;
  chainId: string;
  sortOrder: number;
  name: string;
  agentId: string;
  skillName: string;
  requestJson: string;
  extractJson: string;
  timeoutMs: number;
}

export interface ChainRunResult {
  chainId: string;
  status: string;
  steps: ChainStepResult[];
  variables: Record<string, string>;
  durationMs: number;
}

export interface ChainStepResult {
  stepName: string;
  status: string;
  responseJson: string | null;
  extracted: Record<string, string>;
  durationMs: number;
  error: string | null;
}

export interface DiffResult {
  identical: boolean;
  added: string[];
  removed: string[];
  changed: DiffChange[];
}

export interface DiffChange {
  path: string;
  oldValue: string;
  newValue: string;
}

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  return invoke<T>(cmd, args);
}

export const workspaceCommands = {
  listEnvVars: (workspaceId: string) => call<EnvVariable[]>("list_env_vars", { workspaceId }),
  setEnvVar: (workspaceId: string, name: string, value: string, isSecret?: boolean) =>
    call<EnvVariable>("set_env_var", { workspaceId, name, value, isSecret: isSecret ?? null }),
  deleteEnvVar: (id: string) => call<void>("delete_env_var", { id }),

  createChain: (name: string, description: string | null, workspaceId: string) =>
    call<RequestChain>("create_chain", { name, description, workspaceId }),
  updateChain: (id: string, name: string | null, description: string | null) =>
    call<void>("update_chain", { id, name, description }),
  deleteChain: (id: string) => call<void>("delete_chain", { id }),
  listChains: (workspaceId: string) => call<RequestChain[]>("list_chains", { workspaceId }),

  addChainStep: (chainId: string, name: string, agentId: string, skillName: string, requestJson: string, extractJson?: string, timeoutMs?: number) =>
    call<ChainStep>("add_chain_step", { chainId, name, agentId, skillName, requestJson, extractJson: extractJson ?? null, timeoutMs: timeoutMs ?? null }),
  updateChainStep: (id: string, name?: string, requestJson?: string, extractJson?: string, timeoutMs?: number) =>
    call<void>("update_chain_step", { id, name: name ?? null, requestJson: requestJson ?? null, extractJson: extractJson ?? null, timeoutMs: timeoutMs ?? null }),
  deleteChainStep: (id: string) => call<void>("delete_chain_step", { id }),
  listChainSteps: (chainId: string) => call<ChainStep[]>("list_chain_steps", { chainId }),

  runChain: (chainId: string) => call<ChainRunResult>("run_chain", { chainId }),
  exportWorkspace: (workspaceId: string) => call<string>("export_workspace", { workspaceId }),
  importWorkspace: (jsonData: string) => call<string>("import_workspace", { jsonData }),
  diffResponses: (responseA: string, responseB: string) => call<DiffResult>("diff_responses", { responseA, responseB }),
};
