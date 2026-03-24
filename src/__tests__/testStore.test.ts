import { describe, it, expect, beforeEach } from "vitest";
import { useTestStore } from "../stores/testStore";

describe("testStore", () => {
  beforeEach(() => {
    useTestStore.setState(useTestStore.getInitialState());
  });

  it("has initial status idle and taskId null", () => {
    const state = useTestStore.getState();
    expect(state.status).toBe("idle");
    expect(state.taskId).toBeNull();
    expect(state.chunks).toEqual([]);
    expect(state.latencyMs).toBeNull();
  });

  it("startTask sets status=running, taskId, and startedAt", () => {
    useTestStore.getState().startTask("t1");
    const state = useTestStore.getState();

    expect(state.status).toBe("running");
    expect(state.taskId).toBe("t1");
    expect(state.startedAt).toBeTypeOf("number");
  });

  it("appendChunk adds to chunks array", () => {
    const chunk = { raw: { data: "hello" } };
    useTestStore.getState().appendChunk(chunk);
    useTestStore.getState().appendChunk({ raw: { data: "world" } });

    const state = useTestStore.getState();
    expect(state.chunks).toHaveLength(2);
    expect(state.chunks[0]).toEqual(chunk);
  });

  it("finishTask sets status and computes latencyMs as non-null number", () => {
    useTestStore.getState().startTask("t1");

    // Small delay to ensure latency > 0
    const result = { final: true };
    useTestStore.getState().finishTask(result);

    const state = useTestStore.getState();
    expect(state.status).toBe("completed");
    expect(state.result).toEqual(result);
    expect(state.latencyMs).toBeTypeOf("number");
    expect(state.latencyMs).not.toBeNull();
  });

  it("finishTask accepts custom status", () => {
    useTestStore.getState().startTask("t1");
    useTestStore.getState().finishTask(null, "failed");

    expect(useTestStore.getState().status).toBe("failed");
  });

  it("reset returns to initial state", () => {
    useTestStore.getState().startTask("t1");
    useTestStore.getState().appendChunk({ raw: {} });
    useTestStore.getState().finishTask({ done: true });

    useTestStore.getState().reset();

    const state = useTestStore.getState();
    expect(state.status).toBe("idle");
    expect(state.taskId).toBeNull();
    expect(state.chunks).toEqual([]);
    expect(state.result).toBeNull();
    expect(state.latencyMs).toBeNull();
  });

  it("setInputText updates inputText", () => {
    useTestStore.getState().setInputText("hello world");
    expect(useTestStore.getState().inputText).toBe("hello world");
  });

  it("setInputTab updates inputTab", () => {
    useTestStore.getState().setInputTab("headers");
    expect(useTestStore.getState().inputTab).toBe("headers");
  });

  it("setResponseTab updates responseTab", () => {
    useTestStore.getState().setResponseTab("raw");
    expect(useTestStore.getState().responseTab).toBe("raw");
  });
});
