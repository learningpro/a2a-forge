import { create } from "zustand";

export type TaskStatus = "idle" | "running" | "completed" | "failed" | "canceled";

export type TaskChunk = {
  raw: unknown;
  status?: { state: string; message?: string };
  artifact?: unknown;
};

interface TestState {
  taskId: string | null;
  status: TaskStatus;
  chunks: TaskChunk[];
  result: unknown | null;
  latencyMs: number | null;
  startedAt: number | null;
  inputText: string;
  inputTab: "message" | "context" | "headers";
  responseTab: "rendered" | "raw";
  customHeaders: Record<string, string>;

  startTask: (taskId: string) => void;
  appendChunk: (chunk: TaskChunk) => void;
  finishTask: (result: unknown, status?: TaskStatus) => void;
  reset: () => void;
  setInputText: (text: string) => void;
  setInputTab: (tab: "message" | "context" | "headers") => void;
  setResponseTab: (tab: "rendered" | "raw") => void;
  setCustomHeaders: (headers: Record<string, string>) => void;
}

const initialState = {
  taskId: null,
  status: "idle" as TaskStatus,
  chunks: [] as TaskChunk[],
  result: null,
  latencyMs: null,
  startedAt: null,
  inputText: "",
  inputTab: "message" as const,
  responseTab: "rendered" as const,
  customHeaders: {} as Record<string, string>,
};

export const useTestStore = create<TestState>()((set, get) => ({
  ...initialState,

  startTask: (taskId: string) =>
    set({
      taskId,
      status: "running",
      startedAt: Date.now(),
      chunks: [],
      result: null,
      latencyMs: null,
    }),

  appendChunk: (chunk: TaskChunk) =>
    set((state) => ({ chunks: [...state.chunks, chunk] })),

  finishTask: (result: unknown, status: TaskStatus = "completed") => {
    const { startedAt } = get();
    const latencyMs = startedAt != null ? Date.now() - startedAt : null;
    set({ result, status, latencyMs });
  },

  reset: () => set(initialState),

  setInputText: (text: string) => set({ inputText: text }),
  setInputTab: (tab) => set({ inputTab: tab }),
  setResponseTab: (tab) => set({ responseTab: tab }),
  setCustomHeaders: (headers) => set({ customHeaders: headers }),
}));
