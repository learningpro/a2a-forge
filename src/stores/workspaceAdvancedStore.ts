import { create } from "zustand";
import {
  workspaceCommands,
  type EnvVariable,
  type RequestChain,
  type ChainStep,
  type ChainRunResult,
  type DiffResult,
} from "../lib/workspace-commands";

interface WorkspaceAdvancedState {
  envVars: EnvVariable[];
  chains: RequestChain[];
  selectedChainId: string | null;
  chainSteps: ChainStep[];
  chainRunResult: ChainRunResult | null;
  diffResult: DiffResult | null;
  isRunningChain: boolean;
  error: string | null;

  loadEnvVars: (workspaceId: string) => Promise<void>;
  setEnvVar: (workspaceId: string, name: string, value: string, isSecret?: boolean) => Promise<void>;
  deleteEnvVar: (id: string) => Promise<void>;

  loadChains: (workspaceId: string) => Promise<void>;
  createChain: (name: string, description: string, workspaceId: string) => Promise<RequestChain>;
  deleteChain: (id: string) => Promise<void>;
  selectChain: (id: string | null) => void;

  loadChainSteps: (chainId: string) => Promise<void>;
  addChainStep: (chainId: string, name: string, agentId: string, skillName: string, requestJson: string, extractJson?: string) => Promise<void>;
  deleteChainStep: (id: string) => Promise<void>;

  runChain: (chainId: string) => Promise<void>;
  diffResponses: (a: string, b: string) => Promise<void>;
  exportWorkspace: (workspaceId: string) => Promise<string>;
  importWorkspace: (jsonData: string) => Promise<string>;
}

export const useWorkspaceAdvancedStore = create<WorkspaceAdvancedState>()((set, _get) => ({
  envVars: [],
  chains: [],
  selectedChainId: null,
  chainSteps: [],
  chainRunResult: null,
  diffResult: null,
  isRunningChain: false,
  error: null,

  loadEnvVars: async (workspaceId) => {
    try {
      const envVars = await workspaceCommands.listEnvVars(workspaceId);
      set({ envVars, error: null });
    } catch (err) { set({ error: String(err) }); }
  },

  setEnvVar: async (workspaceId, name, value, isSecret) => {
    try {
      await workspaceCommands.setEnvVar(workspaceId, name, value, isSecret);
      const envVars = await workspaceCommands.listEnvVars(workspaceId);
      set({ envVars });
    } catch (err) { set({ error: String(err) }); }
  },

  deleteEnvVar: async (id) => {
    try {
      await workspaceCommands.deleteEnvVar(id);
      set((s) => ({ envVars: s.envVars.filter((v) => v.id !== id) }));
    } catch (err) { set({ error: String(err) }); }
  },

  loadChains: async (workspaceId) => {
    try {
      const chains = await workspaceCommands.listChains(workspaceId);
      set({ chains, error: null });
    } catch (err) { set({ error: String(err) }); }
  },

  createChain: async (name, description, workspaceId) => {
    const chain = await workspaceCommands.createChain(name, description, workspaceId);
    set((s) => ({ chains: [chain, ...s.chains] }));
    return chain;
  },

  deleteChain: async (id) => {
    await workspaceCommands.deleteChain(id);
    set((s) => ({
      chains: s.chains.filter((c) => c.id !== id),
      selectedChainId: s.selectedChainId === id ? null : s.selectedChainId,
    }));
  },

  selectChain: (id) => {
    set({ selectedChainId: id, chainRunResult: null });
    if (id) {
      workspaceCommands.listChainSteps(id).then((steps) => set({ chainSteps: steps }));
    }
  },

  loadChainSteps: async (chainId) => {
    const steps = await workspaceCommands.listChainSteps(chainId);
    set({ chainSteps: steps });
  },

  addChainStep: async (chainId, name, agentId, skillName, requestJson, extractJson) => {
    const step = await workspaceCommands.addChainStep(chainId, name, agentId, skillName, requestJson, extractJson);
    set((s) => ({ chainSteps: [...s.chainSteps, step] }));
  },

  deleteChainStep: async (id) => {
    await workspaceCommands.deleteChainStep(id);
    set((s) => ({ chainSteps: s.chainSteps.filter((st) => st.id !== id) }));
  },

  runChain: async (chainId) => {
    set({ isRunningChain: true, error: null });
    try {
      const result = await workspaceCommands.runChain(chainId);
      set({ chainRunResult: result, isRunningChain: false });
    } catch (err) { set({ error: String(err), isRunningChain: false }); }
  },

  diffResponses: async (a, b) => {
    try {
      const result = await workspaceCommands.diffResponses(a, b);
      set({ diffResult: result });
    } catch (err) { set({ error: String(err) }); }
  },

  exportWorkspace: async (workspaceId) => {
    return workspaceCommands.exportWorkspace(workspaceId);
  },

  importWorkspace: async (jsonData) => {
    return workspaceCommands.importWorkspace(jsonData);
  },
}));
