import { create } from "zustand";
import {
  communityCommands,
  type CommunityAgent,
  type Favorite,
  type HealthCheck,
} from "../lib/community-commands";

interface CommunityState {
  communityAgents: CommunityAgent[];
  favorites: Favorite[];
  healthChecks: Record<string, HealthCheck[]>;
  latestHealth: Record<string, HealthCheck>;
  isChecking: boolean;
  error: string | null;

  searchCommunity: (search?: string, tag?: string) => Promise<void>;
  submitAgent: (agentId: string) => Promise<void>;

  toggleFavorite: (agentId: string, folder?: string) => Promise<boolean>;
  loadFavorites: (folder?: string) => Promise<void>;
  updateFavorite: (id: string, folder?: string, notes?: string) => Promise<void>;

  checkHealth: (agentId: string) => Promise<void>;
  checkAllHealth: (workspaceId: string) => Promise<void>;
  loadHealthHistory: (agentId: string) => Promise<void>;

  exportSuite: (suiteId: string) => Promise<string>;
  importSuite: (jsonData: string, agentId: string, workspaceId: string) => Promise<string>;
}

export const useCommunityStore = create<CommunityState>()((set, _get) => ({
  communityAgents: [],
  favorites: [],
  healthChecks: {},
  latestHealth: {},
  isChecking: false,
  error: null,

  searchCommunity: async (search, tag) => {
    try {
      const agents = await communityCommands.listCommunityAgents(search ?? null, tag ?? null);
      set({ communityAgents: agents, error: null });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  submitAgent: async (agentId) => {
    try {
      const agent = await communityCommands.submitToCommunity(agentId);
      set((s) => ({ communityAgents: [agent, ...s.communityAgents] }));
    } catch (err) {
      set({ error: String(err) });
    }
  },

  toggleFavorite: async (agentId, folder) => {
    try {
      const isFav = await communityCommands.toggleFavorite(agentId, folder ?? null);
      // Reload favorites
      const favorites = await communityCommands.listFavorites(null);
      set({ favorites });
      return isFav;
    } catch (err) {
      set({ error: String(err) });
      return false;
    }
  },

  loadFavorites: async (folder) => {
    try {
      const favorites = await communityCommands.listFavorites(folder ?? null);
      set({ favorites });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  updateFavorite: async (id, folder, notes) => {
    try {
      await communityCommands.updateFavorite(id, folder ?? null, notes ?? null);
      const favorites = await communityCommands.listFavorites(null);
      set({ favorites });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  checkHealth: async (agentId) => {
    set({ isChecking: true });
    try {
      const hc = await communityCommands.checkAgentHealth(agentId);
      set((s) => ({
        latestHealth: { ...s.latestHealth, [agentId]: hc },
        isChecking: false,
      }));
    } catch (err) {
      set({ error: String(err), isChecking: false });
    }
  },

  checkAllHealth: async (workspaceId) => {
    set({ isChecking: true });
    try {
      const checks = await communityCommands.checkAllHealth(workspaceId);
      const latest: Record<string, HealthCheck> = {};
      for (const hc of checks) {
        latest[hc.agentId] = hc;
      }
      set({ latestHealth: latest, isChecking: false });
    } catch (err) {
      set({ error: String(err), isChecking: false });
    }
  },

  loadHealthHistory: async (agentId) => {
    try {
      const checks = await communityCommands.listHealthChecks(agentId, 20);
      set((s) => ({ healthChecks: { ...s.healthChecks, [agentId]: checks } }));
    } catch (err) {
      set({ error: String(err) });
    }
  },

  exportSuite: async (suiteId) => {
    return communityCommands.exportTestSuite(suiteId);
  },

  importSuite: async (jsonData, agentId, workspaceId) => {
    return communityCommands.importTestSuite(jsonData, agentId, workspaceId);
  },
}));
