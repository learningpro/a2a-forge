import { create } from "zustand";
import { commands, type AgentRow } from "../bindings";
import { unwrap } from "../lib/tauri-helpers";

interface AgentState {
  agents: AgentRow[];
  selectedAgentId: string | null;
  selectedSkillId: string | null;
  isLoading: boolean;
  error: string | null;
  /** agentId -> Record<headerName, headerValue> */
  defaultHeaders: Record<string, Record<string, string>>;

  loadAgents: (workspaceId: string) => Promise<void>;
  addAgent: (
    baseUrl: string,
    nickname: string | null,
    workspaceId: string
  ) => Promise<AgentRow>;
  deleteAgent: (agentId: string) => Promise<void>;
  refreshAgent: (agentId: string) => Promise<void>;
  renameAgent: (agentId: string, nickname: string) => Promise<void>;
  setSelectedAgentId: (id: string | null) => void;
  setSelectedSkillId: (id: string | null) => void;
  selectedAgent: () => AgentRow | undefined;
  setDefaultHeaders: (agentId: string, headers: Record<string, string>) => Promise<void>;
  loadDefaultHeaders: (agentId: string) => Promise<void>;
}

export const useAgentStore = create<AgentState>()((set, get) => ({
  agents: [],
  selectedAgentId: null,
  selectedSkillId: null,
  isLoading: false,
  error: null,
  defaultHeaders: {},

  loadAgents: async (workspaceId: string) => {
    set({ isLoading: true, error: null });
    try {
      const agents = unwrap(await commands.listAgents(workspaceId));
      set({ agents, isLoading: false });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to load agents";
      set({ error: message, isLoading: false });
    }
  },

  addAgent: async (
    baseUrl: string,
    nickname: string | null,
    workspaceId: string
  ) => {
    const row = unwrap(await commands.addAgent(baseUrl, nickname, workspaceId));
    set((state) => ({ agents: [...state.agents, row] }));
    return row;
  },

  deleteAgent: async (agentId: string) => {
    unwrap(await commands.deleteAgent(agentId));
    set((state) => ({
      agents: state.agents.filter((a) => a.id !== agentId),
      selectedAgentId:
        state.selectedAgentId === agentId ? null : state.selectedAgentId,
      selectedSkillId:
        state.selectedAgentId === agentId ? null : state.selectedSkillId,
    }));
  },

  refreshAgent: async (agentId: string) => {
    const updated = unwrap(await commands.refreshAgent(agentId));
    set((state) => ({
      agents: state.agents.map((a) => (a.id === agentId ? updated : a)),
    }));
  },

  renameAgent: async (agentId: string, nickname: string) => {
    unwrap(await commands.renameAgent(agentId, nickname));
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId ? { ...a, nickname } : a
      ),
    }));
  },

  setSelectedAgentId: (id: string | null) => {
    set({ selectedAgentId: id, selectedSkillId: null });
    // Auto-load default headers from SQLite when selecting an agent
    if (id) {
      get().loadDefaultHeaders(id);
    }
  },

  setSelectedSkillId: (id: string | null) => set({ selectedSkillId: id }),

  selectedAgent: () => {
    const { agents, selectedAgentId } = get();
    return agents.find((a) => a.id === selectedAgentId);
  },

  setDefaultHeaders: async (agentId: string, headers: Record<string, string>) => {
    set((state) => ({
      defaultHeaders: { ...state.defaultHeaders, [agentId]: headers },
    }));
    // Persist via secure credential storage (keyring with AES fallback)
    try {
      if (Object.keys(headers).length > 0) {
        await commands.storeAgentHeaders(agentId, JSON.stringify(headers));
      } else {
        await commands.deleteAgentHeaders(agentId);
      }
    } catch {
      /* best-effort persistence */
    }
  },

  loadDefaultHeaders: async (agentId: string) => {
    try {
      const raw = unwrap(await commands.retrieveAgentHeaders(agentId));
      if (raw) {
        const headers = JSON.parse(raw) as Record<string, string>;
        set((state) => ({
          defaultHeaders: { ...state.defaultHeaders, [agentId]: headers },
        }));
      }
    } catch {
      // Fallback: try legacy settings storage for migration
      try {
        const settings = unwrap(await commands.getSettings());
        const legacyRaw = (settings as Record<string, unknown>)[`card:${agentId}:headers`];
        if (legacyRaw) {
          const headers = (typeof legacyRaw === "string" ? JSON.parse(legacyRaw) : legacyRaw) as Record<string, string>;
          set((state) => ({
            defaultHeaders: { ...state.defaultHeaders, [agentId]: headers },
          }));
          // Migrate to secure storage
          await commands.storeAgentHeaders(agentId, JSON.stringify(headers)).catch(() => {});
        }
      } catch {
        /* ignore */
      }
    }
  },
}));
