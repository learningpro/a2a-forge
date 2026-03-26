import { invoke } from "@tauri-apps/api/core";

export interface CommunityAgent {
  id: string;
  name: string;
  description: string;
  url: string;
  cardJson: string;
  tags: string;
  author: string;
  stars: number;
  lastChecked: string;
  createdAt: string;
}

export interface Favorite {
  id: string;
  agentId: string;
  folder: string;
  notes: string;
  createdAt: string;
}

export interface HealthCheck {
  id: string;
  agentId: string;
  status: string;
  latencyMs: number | null;
  error: string | null;
  checkedAt: string;
}

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  return invoke<T>(cmd, args);
}

export const communityCommands = {
  listCommunityAgents: (search: string | null, tag: string | null) =>
    call<CommunityAgent[]>("list_community_agents", { search, tag }),
  submitToCommunity: (agentId: string) =>
    call<CommunityAgent>("submit_to_community", { agentId }),
  toggleFavorite: (agentId: string, folder: string | null) =>
    call<boolean>("toggle_favorite", { agentId, folder }),
  listFavorites: (folder: string | null) =>
    call<Favorite[]>("list_favorites", { folder }),
  updateFavorite: (id: string, folder: string | null, notes: string | null) =>
    call<void>("update_favorite", { id, folder, notes }),
  checkAgentHealth: (agentId: string) =>
    call<HealthCheck>("check_agent_health", { agentId }),
  checkAllHealth: (workspaceId: string) =>
    call<HealthCheck[]>("check_all_health", { workspaceId }),
  listHealthChecks: (agentId: string, limit: number | null) =>
    call<HealthCheck[]>("list_health_checks", { agentId, limit }),
  exportTestSuite: (suiteId: string) =>
    call<string>("export_test_suite", { suiteId }),
  importTestSuite: (jsonData: string, agentId: string, workspaceId: string) =>
    call<string>("import_test_suite", { jsonData, agentId, workspaceId }),
};
