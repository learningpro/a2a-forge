import { create } from "zustand";
import {
  suiteCommands,
  type Suite,
  type TestStep,
  type SuiteRun,
  type SuiteRunDetail,
} from "../lib/suite-commands";

interface SuiteState {
  suites: Suite[];
  selectedSuiteId: string | null;
  steps: TestStep[];
  currentRunDetail: SuiteRunDetail | null;
  runHistory: SuiteRun[];
  isRunning: boolean;
  isLoading: boolean;
  error: string | null;

  loadSuites: (workspaceId: string, agentId?: string | null) => Promise<void>;
  createSuite: (name: string, description: string, agentId: string | null, workspaceId: string, runMode: string) => Promise<Suite>;
  updateSuite: (id: string, name?: string, description?: string, runMode?: string) => Promise<void>;
  deleteSuite: (id: string) => Promise<void>;
  selectSuite: (id: string | null) => void;

  loadSteps: (suiteId: string) => Promise<void>;
  addStep: (suiteId: string, name: string, agentId: string, skillName: string, requestJson: string, assertionsJson?: string, timeoutMs?: number) => Promise<TestStep>;
  updateStep: (id: string, name?: string, requestJson?: string, assertionsJson?: string, timeoutMs?: number) => Promise<void>;
  deleteStep: (id: string) => Promise<void>;
  reorderSteps: (suiteId: string, stepIds: string[]) => Promise<void>;

  runSuite: (suiteId: string) => Promise<void>;
  loadRunDetail: (runId: string) => Promise<void>;
  loadRunHistory: (suiteId: string) => Promise<void>;
  exportReport: (runId: string, format: string) => Promise<string>;
}

export const useSuiteStore = create<SuiteState>()((set, get) => ({
  suites: [],
  selectedSuiteId: null,
  steps: [],
  currentRunDetail: null,
  runHistory: [],
  isRunning: false,
  isLoading: false,
  error: null,

  loadSuites: async (workspaceId, agentId) => {
    set({ isLoading: true, error: null });
    try {
      const suites = await suiteCommands.listSuites(workspaceId, agentId ?? null);
      set({ suites, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  createSuite: async (name, description, agentId, workspaceId, runMode) => {
    const suite = await suiteCommands.createSuite(name, description, agentId, workspaceId, runMode);
    set((s) => ({ suites: [suite, ...s.suites] }));
    return suite;
  },

  updateSuite: async (id, name, description, runMode) => {
    await suiteCommands.updateSuite(id, name ?? null, description ?? null, runMode ?? null);
    set((s) => ({
      suites: s.suites.map((suite) =>
        suite.id === id
          ? { ...suite, ...(name !== undefined && { name }), ...(description !== undefined && { description }), ...(runMode !== undefined && { runMode }) }
          : suite
      ),
    }));
  },

  deleteSuite: async (id) => {
    await suiteCommands.deleteSuite(id);
    set((s) => ({
      suites: s.suites.filter((suite) => suite.id !== id),
      selectedSuiteId: s.selectedSuiteId === id ? null : s.selectedSuiteId,
    }));
  },

  selectSuite: (id) => {
    set({ selectedSuiteId: id, currentRunDetail: null });
    if (id) {
      get().loadSteps(id);
      get().loadRunHistory(id);
    }
  },

  loadSteps: async (suiteId) => {
    try {
      const steps = await suiteCommands.listSteps(suiteId);
      set({ steps });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  addStep: async (suiteId, name, agentId, skillName, requestJson, assertionsJson, timeoutMs) => {
    const step = await suiteCommands.addStep(suiteId, name, agentId, skillName, requestJson, assertionsJson ?? null, timeoutMs ?? null);
    set((s) => ({ steps: [...s.steps, step] }));
    return step;
  },

  updateStep: async (id, name, requestJson, assertionsJson, timeoutMs) => {
    await suiteCommands.updateStep(id, name ?? null, requestJson ?? null, assertionsJson ?? null, timeoutMs ?? null);
    set((s) => ({
      steps: s.steps.map((step) =>
        step.id === id
          ? { ...step, ...(name !== undefined && { name }), ...(requestJson !== undefined && { requestJson }), ...(assertionsJson !== undefined && { assertionsJson }), ...(timeoutMs !== undefined && { timeoutMs }) }
          : step
      ),
    }));
  },

  deleteStep: async (id) => {
    await suiteCommands.deleteStep(id);
    set((s) => ({ steps: s.steps.filter((step) => step.id !== id) }));
  },

  reorderSteps: async (suiteId, stepIds) => {
    await suiteCommands.reorderSteps(suiteId, stepIds);
    // Re-sort local steps
    set((s) => {
      const ordered = stepIds.map((id, i) => {
        const step = s.steps.find((st) => st.id === id);
        return step ? { ...step, sortOrder: i } : null;
      }).filter(Boolean) as TestStep[];
      return { steps: ordered };
    });
  },

  runSuite: async (suiteId) => {
    set({ isRunning: true, error: null });
    try {
      const runId = await suiteCommands.runTestSuite(suiteId);
      const detail = await suiteCommands.getSuiteRun(runId);
      set({ currentRunDetail: detail, isRunning: false });
      // Refresh run history
      get().loadRunHistory(suiteId);
    } catch (err) {
      set({ error: String(err), isRunning: false });
    }
  },

  loadRunDetail: async (runId) => {
    try {
      const detail = await suiteCommands.getSuiteRun(runId);
      set({ currentRunDetail: detail });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  loadRunHistory: async (suiteId) => {
    try {
      const runs = await suiteCommands.listSuiteRuns(suiteId, 20);
      set({ runHistory: runs });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  exportReport: async (runId, format) => {
    return suiteCommands.exportReport(runId, format);
  },
}));
