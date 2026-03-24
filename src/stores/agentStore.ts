import { create } from "zustand";
import { commands, type AgentRow } from "../bindings";
import { unwrap } from "../lib/tauri-helpers";
import Database from "@tauri-apps/plugin-sql";

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
    const db = await Database.load("sqlite:workbench.db");
    await db.execute("UPDATE agents SET nickname = ? WHERE id = ?", [
      nickname,
      agentId,
    ]);
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId ? { ...a, nickname } : a
      ),
    }));
  },

  setSelectedAgentId: (id: string | null) =>
    set({ selectedAgentId: id, selectedSkillId: null }),

  setSelectedSkillId: (id: string | null) => set({ selectedSkillId: id }),

  selectedAgent: () => {
    const { agents, selectedAgentId } = get();
    return agents.find((a) => a.id === selectedAgentId);
  },

  setDefaultHeaders: async (agentId: string, headers: Record<string, string>) => {
    set((state) => ({
      defaultHeaders: { ...state.defaultHeaders, [agentId]: headers },
    }));
    // Persist to SQLite
    try {
      await commands.saveSetting(
        `card:${agentId}:headers`,
        JSON.stringify(headers),
      );
    } catch {
      /* best-effort persistence */
    }
  },

  loadDefaultHeaders: async (agentId: string) => {
    try {
      const settings = unwrap(await commands.getSettings());
      const raw = (settings as Record<string, string>)[`card:${agentId}:headers`];
      if (raw) {
        const headers = JSON.parse(raw) as Record<string, string>;
        set((state) => ({
          defaultHeaders: { ...state.defaultHeaders, [agentId]: headers },
        }));
      }
    } catch {
      /* ignore */
    }
  },
}));
