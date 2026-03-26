import { invoke } from "@tauri-apps/api/core";

export interface ProxyStatus {
  running: boolean;
  port: number;
  requestCount: number;
}

export interface InterceptRule {
  id: string;
  name: string;
  enabled: boolean;
  matchType: string;
  matchValue: string;
  actionType: string;
  actionJson: string;
  priority: number;
  workspaceId: string;
  createdAt: string;
}

export interface RecordingSession {
  name: string;
  count: number;
}

export interface TrafficRecord {
  id: string;
  sessionName: string;
  agentId: string | null;
  skillName: string | null;
  requestJson: string;
  responseJson: string | null;
  statusCode: number | null;
  durationMs: number | null;
  timestamp: string;
  workspaceId: string;
}

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  return invoke<T>(cmd, args);
}

export const proxyCommands = {
  startProxy: (port: number | null, workspaceId: string) =>
    call<ProxyStatus>("start_proxy", { port, workspaceId }),
  stopProxy: () => call<void>("stop_proxy"),
  getProxyStatus: () => call<ProxyStatus>("get_proxy_status"),

  createRule: (name: string, matchType: string, matchValue: string, actionType: string, actionJson: string, priority: number | null, workspaceId: string) =>
    call<InterceptRule>("create_rule", { name, matchType, matchValue, actionType, actionJson, priority, workspaceId }),
  updateRule: (id: string, name: string | null, matchType: string | null, matchValue: string | null, actionType: string | null, actionJson: string | null, priority: number | null) =>
    call<void>("update_rule", { id, name, matchType, matchValue, actionType, actionJson, priority }),
  deleteRule: (id: string) => call<void>("delete_rule", { id }),
  listRules: (workspaceId: string) => call<InterceptRule[]>("list_rules", { workspaceId }),
  toggleRule: (id: string, enabled: boolean) => call<void>("toggle_rule", { id, enabled }),

  startRecording: (sessionName: string) => call<void>("start_recording", { sessionName }),
  stopRecording: () => call<void>("stop_recording"),
  listRecordings: (workspaceId: string) => call<RecordingSession[]>("list_recordings", { workspaceId }),
  getRecording: (sessionName: string, workspaceId: string) => call<TrafficRecord[]>("get_recording", { sessionName, workspaceId }),
  deleteRecording: (sessionName: string, workspaceId: string) => call<void>("delete_recording", { sessionName, workspaceId }),
  replayRecording: (sessionName: string, workspaceId: string) => call<TrafficRecord[]>("replay_recording", { sessionName, workspaceId }),
};
