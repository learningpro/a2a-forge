import { create } from "zustand";
import {
  proxyCommands,
  type ProxyStatus,
  type InterceptRule,
  type RecordingSession,
  type TrafficRecord,
} from "../lib/proxy-commands";

import { DEFAULT_PROXY_PORT } from "../lib/constants";

interface ProxyState {
  status: ProxyStatus;
  rules: InterceptRule[];
  recordings: RecordingSession[];
  currentRecords: TrafficRecord[];
  isRecording: boolean;
  error: string | null;

  startProxy: (port?: number, workspaceId?: string) => Promise<void>;
  stopProxy: () => Promise<void>;
  refreshStatus: () => Promise<void>;

  loadRules: (workspaceId: string) => Promise<void>;
  createRule: (name: string, matchType: string, matchValue: string, actionType: string, actionJson: string, priority: number, workspaceId: string) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  toggleRule: (id: string, enabled: boolean) => Promise<void>;

  startRecording: (sessionName: string) => Promise<void>;
  stopRecording: () => Promise<void>;
  loadRecordings: (workspaceId: string) => Promise<void>;
  viewRecording: (sessionName: string, workspaceId: string) => Promise<void>;
  deleteRecording: (sessionName: string, workspaceId: string) => Promise<void>;
  replayRecording: (sessionName: string, workspaceId: string) => Promise<void>;
}

export const useProxyStore = create<ProxyState>()((set, _get) => ({
  status: { running: false, port: 0, requestCount: 0 },
  rules: [],
  recordings: [],
  currentRecords: [],
  isRecording: false,
  error: null,

  startProxy: async (port = DEFAULT_PROXY_PORT, workspaceId = "default") => {
    try {
      const status = await proxyCommands.startProxy(port, workspaceId);
      set({ status, error: null });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  stopProxy: async () => {
    try {
      await proxyCommands.stopProxy();
      set({ status: { running: false, port: 0, requestCount: 0 }, error: null });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  refreshStatus: async () => {
    try {
      const status = await proxyCommands.getProxyStatus();
      set({ status });
    } catch { /* ignore */ }
  },

  loadRules: async (workspaceId) => {
    try {
      const rules = await proxyCommands.listRules(workspaceId);
      set({ rules });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  createRule: async (name, matchType, matchValue, actionType, actionJson, priority, workspaceId) => {
    try {
      const rule = await proxyCommands.createRule(name, matchType, matchValue, actionType, actionJson, priority, workspaceId);
      set((s) => ({ rules: [...s.rules, rule] }));
    } catch (err) {
      set({ error: String(err) });
    }
  },

  deleteRule: async (id) => {
    try {
      await proxyCommands.deleteRule(id);
      set((s) => ({ rules: s.rules.filter((r) => r.id !== id) }));
    } catch (err) {
      set({ error: String(err) });
    }
  },

  toggleRule: async (id, enabled) => {
    try {
      await proxyCommands.toggleRule(id, enabled);
      set((s) => ({
        rules: s.rules.map((r) => (r.id === id ? { ...r, enabled } : r)),
      }));
    } catch (err) {
      set({ error: String(err) });
    }
  },

  startRecording: async (sessionName) => {
    try {
      await proxyCommands.startRecording(sessionName);
      set({ isRecording: true });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  stopRecording: async () => {
    try {
      await proxyCommands.stopRecording();
      set({ isRecording: false });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  loadRecordings: async (workspaceId) => {
    try {
      const recordings = await proxyCommands.listRecordings(workspaceId);
      set({ recordings });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  viewRecording: async (sessionName, workspaceId) => {
    try {
      const records = await proxyCommands.getRecording(sessionName, workspaceId);
      set({ currentRecords: records });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  deleteRecording: async (sessionName, workspaceId) => {
    try {
      await proxyCommands.deleteRecording(sessionName, workspaceId);
      set((s) => ({ recordings: s.recordings.filter((r) => r.name !== sessionName) }));
    } catch (err) {
      set({ error: String(err) });
    }
  },

  replayRecording: async (sessionName, workspaceId) => {
    try {
      const results = await proxyCommands.replayRecording(sessionName, workspaceId);
      set({ currentRecords: results });
    } catch (err) {
      set({ error: String(err) });
    }
  },
}));
