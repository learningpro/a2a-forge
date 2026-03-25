import { create } from "zustand";

export type TaskStatus = "idle" | "running" | "completed" | "failed" | "canceled";

export type TaskChunk = {
  raw: unknown;
  status?: { state: string; message?: string };
  artifact?: unknown;
};

/** Per-skill execution state */
export interface SkillExecution {
  taskId: string | null;
  status: TaskStatus;
  chunks: TaskChunk[];
  result: unknown | null;
  latencyMs: number | null;
  startedAt: number | null;
}

const emptyExecution: SkillExecution = {
  taskId: null,
  status: "idle",
  chunks: [],
  result: null,
  latencyMs: null,
  startedAt: null,
};

interface TestState {
  /** Map of "agentId:skillId" -> execution state */
  executions: Record<string, SkillExecution>;

  /** Global input state (shared across skills) */
  inputText: string;
  inputTab: "message" | "context" | "headers";
  responseTab: "rendered" | "raw";
  customHeaders: Record<string, string>;

  /** Get execution state for a skill (returns idle defaults if none) */
  getExecution: (agentId: string, skillId: string) => SkillExecution;

  startTask: (agentId: string, skillId: string, taskId: string) => void;
  appendChunk: (agentId: string, skillId: string, chunk: TaskChunk) => void;
  finishTask: (agentId: string, skillId: string, result: unknown, status?: TaskStatus) => void;
  reset: (agentId: string, skillId: string) => void;
  setInputText: (text: string) => void;
  setInputTab: (tab: "message" | "context" | "headers") => void;
  setResponseTab: (tab: "rendered" | "raw") => void;
  setCustomHeaders: (headers: Record<string, string>) => void;
}

function key(agentId: string, skillId: string) {
  return `${agentId}:${skillId}`;
}

export const useTestStore = create<TestState>()((set, get) => ({
  executions: {},
  inputText: "",
  inputTab: "message" as const,
  responseTab: "rendered" as const,
  customHeaders: {} as Record<string, string>,

  getExecution: (agentId: string, skillId: string): SkillExecution => {
    return get().executions[key(agentId, skillId)] ?? emptyExecution;
  },

  startTask: (agentId: string, skillId: string, taskId: string) =>
    set((state) => ({
      executions: {
        ...state.executions,
        [key(agentId, skillId)]: {
          taskId,
          status: "running" as TaskStatus,
          startedAt: Date.now(),
          chunks: [],
          result: null,
          latencyMs: null,
        },
      },
    })),

  appendChunk: (agentId: string, skillId: string, chunk: TaskChunk) =>
    set((state) => {
      const k = key(agentId, skillId);
      const prev = state.executions[k] ?? emptyExecution;
      return {
        executions: {
          ...state.executions,
          [k]: { ...prev, chunks: [...prev.chunks, chunk] },
        },
      };
    }),

  finishTask: (agentId: string, skillId: string, result: unknown, status: TaskStatus = "completed") =>
    set((state) => {
      const k = key(agentId, skillId);
      const prev = state.executions[k] ?? emptyExecution;
      const latencyMs = prev.startedAt != null ? Date.now() - prev.startedAt : null;
      return {
        executions: {
          ...state.executions,
          [k]: { ...prev, result, status, latencyMs },
        },
      };
    }),

  reset: (agentId: string, skillId: string) =>
    set((state) => {
      const k = key(agentId, skillId);
      const next = { ...state.executions };
      delete next[k];
      return { executions: next };
    }),

  setInputText: (text: string) => set({ inputText: text }),
  setInputTab: (tab) => set({ inputTab: tab }),
  setResponseTab: (tab) => set({ responseTab: tab }),
  setCustomHeaders: (headers) => set({ customHeaders: headers }),
}));
