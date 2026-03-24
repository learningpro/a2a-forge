import { create } from "zustand";

interface AgentState {
  selectedAgentId: string | null;
  setSelectedAgentId: (id: string | null) => void;
}

export const useAgentStore = create<AgentState>()((set) => ({
  selectedAgentId: null,
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),
}));
