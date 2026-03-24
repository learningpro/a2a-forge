import { create } from "zustand";
import { commands, type AgentRow } from "../bindings";

interface AgentState {
  agents: AgentRow[];
  selectedAgentId: string | null;
  selectedSkillId: string | null;
  isLoading: boolean;
  error: string | null;

  loadAgents: (workspaceId: string) => Promise<void>;
  addAgent: (
    baseUrl: string,
    nickname: string | null,
    workspaceId: string
  ) => Promise<AgentRow>;
  deleteAgent: (agentId: string) => Promise<void>;
  refreshAgent: (agentId: string) => Promise<void>;
  setSelectedAgentId: (id: string | null) => void;
  setSelectedSkillId: (id: string | null) => void;
  selectedAgent: () => AgentRow | undefined;
}

export const useAgentStore = create<AgentState>()((set, get) => ({
  agents: [],
  selectedAgentId: null,
  selectedSkillId: null,
  isLoading: false,
  error: null,

  loadAgents: async (workspaceId: string) => {
    set({ isLoading: true, error: null });
    try {
      const agents = await commands.listAgents(workspaceId);
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
    const row = await commands.addAgent(baseUrl, nickname, workspaceId);
    set((state) => ({ agents: [...state.agents, row] }));
    return row;
  },

  deleteAgent: async (agentId: string) => {
    await commands.deleteAgent(agentId);
    set((state) => ({
      agents: state.agents.filter((a) => a.id !== agentId),
      selectedAgentId:
        state.selectedAgentId === agentId ? null : state.selectedAgentId,
      selectedSkillId:
        state.selectedAgentId === agentId ? null : state.selectedSkillId,
    }));
  },

  refreshAgent: async (agentId: string) => {
    const updated = await commands.refreshAgent(agentId);
    set((state) => ({
      agents: state.agents.map((a) => (a.id === agentId ? updated : a)),
    }));
  },

  setSelectedAgentId: (id: string | null) =>
    set({ selectedAgentId: id, selectedSkillId: null }),

  setSelectedSkillId: (id: string | null) => set({ selectedSkillId: id }),

  selectedAgent: () => {
    const { agents, selectedAgentId } = get();
    return agents.find((a) => a.id === selectedAgentId);
  },
}));
