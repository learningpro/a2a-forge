import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the suite commands
vi.mock("../lib/suite-commands", () => ({
  suiteCommands: {
    listSuites: vi.fn().mockResolvedValue([]),
    createSuite: vi.fn().mockImplementation((name, desc, agentId, workspaceId, runMode) =>
      Promise.resolve({ id: "suite-1", name, description: desc ?? "", agentId, workspaceId, runMode: runMode ?? "sequential", createdAt: "2026-01-01", updatedAt: "2026-01-01" })
    ),
    deleteSuite: vi.fn().mockResolvedValue(undefined),
    updateSuite: vi.fn().mockResolvedValue(undefined),
    getSuite: vi.fn().mockResolvedValue({ id: "suite-1", name: "Test Suite", description: "", agentId: null, workspaceId: "default", runMode: "sequential", createdAt: "2026-01-01", updatedAt: "2026-01-01" }),
    listSteps: vi.fn().mockResolvedValue([]),
    addStep: vi.fn().mockImplementation((suiteId, name, agentId, skillName, requestJson, assertionsJson, timeoutMs) =>
      Promise.resolve({ id: "step-1", suiteId, sortOrder: 0, name, agentId, skillName, requestJson, assertionsJson: assertionsJson ?? "[]", timeoutMs: timeoutMs ?? 60000 })
    ),
    deleteStep: vi.fn().mockResolvedValue(undefined),
    updateStep: vi.fn().mockResolvedValue(undefined),
    reorderSteps: vi.fn().mockResolvedValue(undefined),
    runTestSuite: vi.fn().mockResolvedValue("run-1"),
    getSuiteRun: vi.fn().mockResolvedValue({
      run: { id: "run-1", suiteId: "suite-1", status: "passed", totalSteps: 1, passedSteps: 1, failedSteps: 0, durationMs: 1000, startedAt: "2026-01-01", finishedAt: "2026-01-01" },
      stepResults: [{ id: "sr-1", runId: "run-1", stepId: "step-1", status: "passed", responseJson: "{}", assertionResultsJson: "[]", errorMessage: null, durationMs: 500 }],
    }),
    listSuiteRuns: vi.fn().mockResolvedValue([]),
    exportReport: vi.fn().mockResolvedValue('{"suite":"Test"}'),
  },
}));

import { useSuiteStore } from "../stores/suiteStore";

describe("suiteStore", () => {
  beforeEach(() => {
    useSuiteStore.setState({
      suites: [],
      selectedSuiteId: null,
      steps: [],
      currentRunDetail: null,
      runHistory: [],
      isRunning: false,
      isLoading: false,
      error: null,
    });
  });

  it("starts with empty state", () => {
    const state = useSuiteStore.getState();
    expect(state.suites).toEqual([]);
    expect(state.selectedSuiteId).toBeNull();
    expect(state.steps).toEqual([]);
    expect(state.isRunning).toBe(false);
  });

  it("creates a suite and adds to list", async () => {
    const suite = await useSuiteStore.getState().createSuite("My Suite", "desc", null, "default", "sequential");
    expect(suite.name).toBe("My Suite");
    expect(suite.id).toBe("suite-1");
    expect(useSuiteStore.getState().suites).toHaveLength(1);
  });

  it("deletes a suite", async () => {
    await useSuiteStore.getState().createSuite("Suite A", "", null, "default", "sequential");
    expect(useSuiteStore.getState().suites).toHaveLength(1);
    await useSuiteStore.getState().deleteSuite("suite-1");
    expect(useSuiteStore.getState().suites).toHaveLength(0);
  });

  it("clears selectedSuiteId when deleting selected suite", async () => {
    await useSuiteStore.getState().createSuite("Suite A", "", null, "default", "sequential");
    useSuiteStore.getState().selectSuite("suite-1");
    expect(useSuiteStore.getState().selectedSuiteId).toBe("suite-1");
    await useSuiteStore.getState().deleteSuite("suite-1");
    expect(useSuiteStore.getState().selectedSuiteId).toBeNull();
  });

  it("adds a step", async () => {
    const step = await useSuiteStore.getState().addStep("suite-1", "Step 1", "agent-1", "image_gen", '{"prompt":"test"}');
    expect(step.name).toBe("Step 1");
    expect(step.skillName).toBe("image_gen");
    expect(useSuiteStore.getState().steps).toHaveLength(1);
  });

  it("deletes a step", async () => {
    await useSuiteStore.getState().addStep("suite-1", "Step 1", "agent-1", "image_gen", '{}');
    expect(useSuiteStore.getState().steps).toHaveLength(1);
    await useSuiteStore.getState().deleteStep("step-1");
    expect(useSuiteStore.getState().steps).toHaveLength(0);
  });

  it("runs a suite and stores result", async () => {
    await useSuiteStore.getState().runSuite("suite-1");
    const detail = useSuiteStore.getState().currentRunDetail;
    expect(detail).not.toBeNull();
    expect(detail!.run.status).toBe("passed");
    expect(detail!.stepResults).toHaveLength(1);
    expect(useSuiteStore.getState().isRunning).toBe(false);
  });

  it("exports report", async () => {
    const report = await useSuiteStore.getState().exportReport("run-1", "json");
    expect(report).toContain("Test");
  });

  it("updates suite properties", async () => {
    await useSuiteStore.getState().createSuite("Old Name", "", null, "default", "sequential");
    await useSuiteStore.getState().updateSuite("suite-1", "New Name", undefined, "parallel");
    const suite = useSuiteStore.getState().suites.find((s) => s.id === "suite-1");
    expect(suite?.name).toBe("New Name");
    expect(suite?.runMode).toBe("parallel");
  });

  it("reorders steps", async () => {
    useSuiteStore.setState({
      steps: [
        { id: "a", suiteId: "s1", sortOrder: 0, name: "A", agentId: "ag1", skillName: "sk1", requestJson: "{}", assertionsJson: "[]", timeoutMs: 60000 },
        { id: "b", suiteId: "s1", sortOrder: 1, name: "B", agentId: "ag1", skillName: "sk1", requestJson: "{}", assertionsJson: "[]", timeoutMs: 60000 },
      ],
    });
    await useSuiteStore.getState().reorderSteps("s1", ["b", "a"]);
    const steps = useSuiteStore.getState().steps;
    expect(steps[0].id).toBe("b");
    expect(steps[1].id).toBe("a");
  });
});
