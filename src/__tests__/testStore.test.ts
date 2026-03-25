import { describe, it, expect, beforeEach } from "vitest";
import { useTestStore } from "../stores/testStore";

const AGENT = "agent-1";
const SKILL = "skill-1";

describe("testStore", () => {
  beforeEach(() => {
    useTestStore.setState(useTestStore.getInitialState());
  });

  it("has initial execution with status idle and taskId null", () => {
    const exec = useTestStore.getState().getExecution(AGENT, SKILL);
    expect(exec.status).toBe("idle");
    expect(exec.taskId).toBeNull();
    expect(exec.chunks).toEqual([]);
    expect(exec.latencyMs).toBeNull();
  });

  it("startTask sets status=running, taskId, and startedAt", () => {
    useTestStore.getState().startTask(AGENT, SKILL, "t1");
    const exec = useTestStore.getState().getExecution(AGENT, SKILL);

    expect(exec.status).toBe("running");
    expect(exec.taskId).toBe("t1");
    expect(exec.startedAt).toBeTypeOf("number");
  });

  it("appendChunk adds to chunks array", () => {
    const chunk = { raw: { data: "hello" } };
    useTestStore.getState().appendChunk(AGENT, SKILL, chunk);
    useTestStore.getState().appendChunk(AGENT, SKILL, { raw: { data: "world" } });

    const exec = useTestStore.getState().getExecution(AGENT, SKILL);
    expect(exec.chunks).toHaveLength(2);
    expect(exec.chunks[0]).toEqual(chunk);
  });

  it("finishTask sets status and computes latencyMs as non-null number", () => {
    useTestStore.getState().startTask(AGENT, SKILL, "t1");

    // Small delay to ensure latency > 0
    const result = { final: true };
    useTestStore.getState().finishTask(AGENT, SKILL, result);

    const exec = useTestStore.getState().getExecution(AGENT, SKILL);
    expect(exec.status).toBe("completed");
    expect(exec.result).toEqual(result);
    expect(exec.latencyMs).toBeTypeOf("number");
    expect(exec.latencyMs).not.toBeNull();
  });

  it("finishTask accepts custom status", () => {
    useTestStore.getState().startTask(AGENT, SKILL, "t1");
    useTestStore.getState().finishTask(AGENT, SKILL, null, "failed");

    expect(useTestStore.getState().getExecution(AGENT, SKILL).status).toBe("failed");
  });

  it("reset returns execution to initial state", () => {
    useTestStore.getState().startTask(AGENT, SKILL, "t1");
    useTestStore.getState().appendChunk(AGENT, SKILL, { raw: {} });
    useTestStore.getState().finishTask(AGENT, SKILL, { done: true });

    useTestStore.getState().reset(AGENT, SKILL);

    const exec = useTestStore.getState().getExecution(AGENT, SKILL);
    expect(exec.status).toBe("idle");
    expect(exec.taskId).toBeNull();
    expect(exec.chunks).toEqual([]);
    expect(exec.result).toBeNull();
    expect(exec.latencyMs).toBeNull();
  });

  it("executions are independent per skill", () => {
    useTestStore.getState().startTask("a1", "s1", "t1");
    useTestStore.getState().startTask("a1", "s2", "t2");

    const exec1 = useTestStore.getState().getExecution("a1", "s1");
    const exec2 = useTestStore.getState().getExecution("a1", "s2");
    expect(exec1.taskId).toBe("t1");
    expect(exec2.taskId).toBe("t2");

    useTestStore.getState().finishTask("a1", "s1", { r: 1 }, "completed");
    expect(useTestStore.getState().getExecution("a1", "s1").status).toBe("completed");
    expect(useTestStore.getState().getExecution("a1", "s2").status).toBe("running");
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
