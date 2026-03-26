import { useState, useCallback } from "react";
import { useSuiteStore } from "../../stores/suiteStore";
import { useAgentStore } from "../../stores/agentStore";
import { StepEditor } from "./StepEditor";
import type { TestStep } from "../../lib/suite-commands";

interface SuiteEditorProps {
  suiteId: string;
}

export function SuiteEditor({ suiteId }: SuiteEditorProps) {
  const suites = useSuiteStore((s) => s.suites);
  const suite = suites.find((s) => s.id === suiteId);
  const steps = useSuiteStore((s) => s.steps);
  const isRunning = useSuiteStore((s) => s.isRunning);
  const agents = useAgentStore((s) => s.agents);

  const [showStepEditor, setShowStepEditor] = useState(false);
  const [editingStep, setEditingStep] = useState<TestStep | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  const handleRun = useCallback(async () => {
    if (isRunning) return;
    await useSuiteStore.getState().runSuite(suiteId);
  }, [suiteId, isRunning]);

  const handleDeleteStep = useCallback(async (stepId: string) => {
    await useSuiteStore.getState().deleteStep(stepId);
  }, []);

  const handleMoveStep = useCallback(async (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const ids = steps.map((s) => s.id);
    [ids[index], ids[newIndex]] = [ids[newIndex], ids[index]];
    await useSuiteStore.getState().reorderSteps(suiteId, ids);
  }, [steps, suiteId]);

  const handleEditStep = useCallback((step: TestStep) => {
    setEditingStep(step);
    setShowStepEditor(true);
  }, []);

  const handleStartRename = useCallback(() => {
    if (!suite) return;
    setNameValue(suite.name);
    setEditingName(true);
  }, [suite]);

  const handleFinishRename = useCallback(async () => {
    if (nameValue.trim() && suite) {
      await useSuiteStore.getState().updateSuite(suite.id, nameValue.trim());
    }
    setEditingName(false);
  }, [nameValue, suite]);

  const handleRunModeChange = useCallback(async (mode: string) => {
    if (!suite) return;
    await useSuiteStore.getState().updateSuite(suite.id, undefined, undefined, mode);
  }, [suite]);

  if (!suite) {
    return (
      <div style={{ padding: 20, color: "var(--text-muted)", fontSize: 11, textAlign: "center" }}>
        Select a suite to edit
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Suite header */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "0.5px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {editingName ? (
            <input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleFinishRename}
              onKeyDown={(e) => { if (e.key === "Enter") handleFinishRename(); if (e.key === "Escape") setEditingName(false); }}
              style={{
                fontSize: 13, fontWeight: 600, color: "var(--text-primary)",
                background: "var(--bg-secondary)", border: "0.5px solid var(--border-strong)",
                borderRadius: "var(--radius-md, 6px)", padding: "2px 6px", width: "100%", outline: "none",
              }}
            />
          ) : (
            <div
              onClick={handleStartRename}
              style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", cursor: "pointer" }}
              title="Click to rename"
            >
              {suite.name}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
            <select
              value={suite.runMode}
              onChange={(e) => handleRunModeChange(e.target.value)}
              style={{
                fontSize: 10, padding: "1px 4px",
                background: "var(--bg-secondary)", border: "0.5px solid var(--border-subtle)",
                borderRadius: "var(--radius-md, 6px)", color: "var(--text-secondary)",
              }}
            >
              <option value="sequential">Sequential</option>
              <option value="parallel">Parallel</option>
            </select>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
              {steps.length} step{steps.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <button
          onClick={handleRun}
          disabled={isRunning || steps.length === 0}
          style={{
            padding: "5px 14px", fontSize: 11, fontWeight: 500,
            background: "var(--bg-primary)", border: "0.5px solid var(--border-strong)",
            borderRadius: "var(--radius-md, 6px)", color: "var(--text-primary)",
            cursor: isRunning || steps.length === 0 ? "default" : "pointer",
            display: "flex", alignItems: "center", gap: 5,
            opacity: isRunning || steps.length === 0 ? 0.5 : 1,
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: isRunning ? "var(--dot-warning)" : "var(--dot-online)", flexShrink: 0,
          }} />
          {isRunning ? "Running\u2026" : "Run Suite"}
        </button>
      </div>

      {/* Steps list */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{
          padding: "8px 14px 4px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 10, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Steps
          </span>
          <button
            onClick={() => { setEditingStep(null); setShowStepEditor(true); }}
            style={{
              padding: "2px 8px", fontSize: 10, background: "transparent",
              border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-md, 6px)",
              color: "var(--text-secondary)", cursor: "pointer",
            }}
          >
            + Add
          </button>
        </div>

        {steps.length === 0 && (
          <div style={{ padding: "20px 14px", textAlign: "center", color: "var(--text-muted)", fontSize: 11 }}>
            No steps yet. Add a step to define what to test.
          </div>
        )}

        {steps.map((step, index) => {
          const agent = agents.find((a) => a.id === step.agentId);
          const assertionCount = (() => { try { return JSON.parse(step.assertionsJson).length; } catch { return 0; } })();
          return (
            <div
              key={step.id}
              style={{
                padding: "8px 14px",
                borderBottom: "0.5px solid var(--border-subtle)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-primary)" }}>
                  {index + 1}. {step.name}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                  {agent?.nickname || agent?.card.name || "Unknown"} · {step.skillName}
                  {assertionCount > 0 && ` · ${assertionCount} assertion${assertionCount > 1 ? "s" : ""}`}
                </div>
              </div>
              <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                <button onClick={() => handleMoveStep(index, -1)} disabled={index === 0}
                  style={{ padding: "2px 4px", fontSize: 9, background: "transparent", border: "none", color: "var(--text-muted)", cursor: index === 0 ? "default" : "pointer", opacity: index === 0 ? 0.3 : 0.7 }}>
                  ▲
                </button>
                <button onClick={() => handleMoveStep(index, 1)} disabled={index === steps.length - 1}
                  style={{ padding: "2px 4px", fontSize: 9, background: "transparent", border: "none", color: "var(--text-muted)", cursor: index === steps.length - 1 ? "default" : "pointer", opacity: index === steps.length - 1 ? 0.3 : 0.7 }}>
                  ▼
                </button>
                <button onClick={() => handleEditStep(step)}
                  style={{ padding: "2px 6px", fontSize: 9, background: "transparent", border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-md, 6px)", color: "var(--text-secondary)", cursor: "pointer" }}>
                  Edit
                </button>
                <button onClick={() => handleDeleteStep(step.id)}
                  style={{ padding: "2px 4px", fontSize: 9, background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step editor dialog */}
      {showStepEditor && (
        <StepEditor
          suiteId={suiteId}
          editingStep={editingStep}
          onClose={() => { setShowStepEditor(false); setEditingStep(null); }}
        />
      )}
    </div>
  );
}
