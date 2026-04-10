import { useState, useCallback, useRef, useEffect } from "react";
import { useSuiteStore } from "../../stores/suiteStore";
import { useAgentStore } from "../../stores/agentStore";
import { useT } from "../../lib/i18n";
import type { Assertion, AssertionType } from "../../lib/suite-commands";
import { fadeBackdrop, slideInRight } from "../../lib/animations";

interface AssertionEditorProps {
  assertions: Assertion[];
  onChange: (assertions: Assertion[]) => void;
}

const ASSERTION_TYPES: { value: AssertionType; labelKey: string; needsPath: boolean; needsExpected: boolean }[] = [
  { value: "status_equals", labelKey: "suite.assertionStatusEquals", needsPath: false, needsExpected: true },
  { value: "json_path_equals", labelKey: "suite.assertionJsonPathEquals", needsPath: true, needsExpected: true },
  { value: "json_path_exists", labelKey: "suite.assertionJsonPathExists", needsPath: true, needsExpected: false },
  { value: "json_path_contains", labelKey: "suite.assertionJsonPathContains", needsPath: true, needsExpected: true },
  { value: "json_path_matches", labelKey: "suite.assertionJsonPathMatches", needsPath: true, needsExpected: true },
  { value: "response_time_lt", labelKey: "suite.assertionResponseTimeLt", needsPath: false, needsExpected: true },
  { value: "contains_media", labelKey: "suite.assertionContainsMedia", needsPath: false, needsExpected: false },
];

export function AssertionEditor({ assertions, onChange }: AssertionEditorProps) {
  const { t } = useT();
  const handleAdd = useCallback(() => {
    const id = crypto.randomUUID().slice(0, 8);
    onChange([...assertions, { id, type: "status_equals", expected: "completed" }]);
  }, [assertions, onChange]);

  const handleRemove = useCallback((id: string) => {
    onChange(assertions.filter((a) => a.id !== id));
  }, [assertions, onChange]);

  const handleUpdate = useCallback((id: string, updates: Partial<Assertion>) => {
    onChange(assertions.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  }, [assertions, onChange]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          {t("suite.assertions")}
        </span>
        <button
          onClick={handleAdd}
          style={{
            padding: "2px 8px", fontSize: 11, background: "transparent",
            border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-md, 6px)",
            color: "var(--text-secondary)", cursor: "pointer",
          }}
        >
          {t("suite.addStep")}
        </button>
      </div>
      {assertions.length === 0 && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", padding: "4px 0" }}>
          {t("suite.noAssertions")}
        </div>
      )}
      {assertions.map((a) => {
        const typeDef = ASSERTION_TYPES.find((t) => t.value === a.type) ?? ASSERTION_TYPES[0];
        return (
          <div key={a.id} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
            <select
              value={a.type}
              onChange={(e) => handleUpdate(a.id, { type: e.target.value as AssertionType })}
              style={{
                flex: "0 0 140px", padding: "3px 4px", fontSize: 11,
                background: "var(--bg-secondary)", border: "0.5px solid var(--border-subtle)",
                borderRadius: "var(--radius-md, 6px)", color: "var(--text-primary)",
              }}
            >
              {ASSERTION_TYPES.map((at) => (
                <option key={at.value} value={at.value}>{t(at.labelKey)}</option>
              ))}
            </select>
            {typeDef.needsPath && (
              <input
                value={a.path ?? ""}
                onChange={(e) => handleUpdate(a.id, { path: e.target.value })}
                placeholder="$.result.status"
                style={{
                  flex: 1, padding: "3px 6px", fontSize: 11,
                  background: "var(--bg-secondary)", border: "0.5px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md, 6px)", color: "var(--text-primary)",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              />
            )}
            {typeDef.needsExpected && (
              <input
                value={a.expected ?? ""}
                onChange={(e) => handleUpdate(a.id, { expected: e.target.value })}
                placeholder={a.type === "response_time_lt" ? "30000" : t("suite.expectedValue")}
                style={{
                  flex: 1, padding: "3px 6px", fontSize: 11,
                  background: "var(--bg-secondary)", border: "0.5px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md, 6px)", color: "var(--text-primary)",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              />
            )}
            <button
              onClick={() => handleRemove(a.id)}
              style={{
                padding: "2px 4px", fontSize: 11, background: "transparent",
                border: "none", color: "var(--text-muted)", cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

interface StepEditorProps {
  suiteId: string;
  editingStep?: { id: string; name: string; agentId: string; skillName: string; requestJson: string; assertionsJson: string; timeoutMs: number } | null;
  onClose: () => void;
}

export function StepEditor({ suiteId, editingStep, onClose }: StepEditorProps) {
  const agents = useAgentStore((s) => s.agents);
  const { t } = useT();
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fadeBackdrop(backdropRef.current);
    slideInRight(dialogRef.current);
  }, []);
  const [name, setName] = useState(editingStep?.name ?? "");
  const [agentId, setAgentId] = useState(editingStep?.agentId ?? agents[0]?.id ?? "");
  const [skillName, setSkillName] = useState(editingStep?.skillName ?? "");
  const [requestJson, setRequestJson] = useState(editingStep?.requestJson ?? '{\n  "prompt": ""\n}');
  const [timeoutMs, setTimeoutMs] = useState(editingStep?.timeoutMs ?? 60000);
  const [assertions, setAssertions] = useState<Assertion[]>(() => {
    try {
      return editingStep?.assertionsJson ? JSON.parse(editingStep.assertionsJson) : [];
    } catch { return []; }
  });

  const selectedAgent = agents.find((a) => a.id === agentId);
  const skills = selectedAgent?.card.skills ?? [];

  const handleSave = useCallback(async () => {
    if (!name.trim() || !agentId || !skillName) return;
    const assertionsStr = JSON.stringify(assertions);
    const { addStep, updateStep } = useSuiteStore.getState();

    if (editingStep) {
      await updateStep(editingStep.id, name, requestJson, assertionsStr, timeoutMs);
    } else {
      await addStep(suiteId, name, agentId, skillName, requestJson, assertionsStr, timeoutMs);
    }
    onClose();
  }, [name, agentId, skillName, requestJson, assertions, timeoutMs, suiteId, editingStep, onClose]);

  const inputStyle = {
    width: "100%", padding: "4px 8px", fontSize: 11,
    background: "var(--bg-secondary)", border: "0.5px solid var(--border-subtle)",
    borderRadius: "var(--radius-md, 6px)", color: "var(--text-primary)", outline: "none",
  };

  const labelStyle = {
    fontSize: 11, fontWeight: 500 as const, color: "var(--text-muted)",
    marginBottom: 3, display: "block" as const,
  };

  return (
    <div
      ref={backdropRef}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        visibility: "hidden",
      }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="step-editor-dialog-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-primary)", borderRadius: "var(--radius-lg, 12px)",
          border: "0.5px solid var(--border-default)", padding: 20,
          width: 480, maxHeight: "80vh", overflow: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          visibility: "hidden",
        }}
      >
        <div id="step-editor-dialog-title" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
          {editingStep ? t("suite.editStep") : t("suite.addStepTitle")}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={labelStyle}>{t("suite.stepName")}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("suite.stepNamePlaceholder")} style={inputStyle} autoFocus />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t("suite.agent")}</label>
              <select value={agentId} onChange={(e) => { setAgentId(e.target.value); setSkillName(""); }} style={inputStyle}>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.nickname || a.card.name}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t("suite.skill")}</label>
              <select value={skillName} onChange={(e) => setSkillName(e.target.value)} style={inputStyle}>
                <option value="">{t("suite.selectSkill")}</option>
                {skills.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>{t("suite.timeout")}</label>
            <input type="number" value={timeoutMs} onChange={(e) => setTimeoutMs(Number(e.target.value))} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>{t("suite.requestJson")}</label>
            <textarea
              value={requestJson}
              onChange={(e) => setRequestJson(e.target.value)}
              rows={5}
              style={{
                ...inputStyle,
                fontFamily: "var(--font-mono, monospace)",
                resize: "vertical",
              }}
            />
          </div>

          <AssertionEditor assertions={assertions} onChange={setAssertions} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button
            onClick={onClose}
            style={{
              padding: "5px 14px", fontSize: 11, background: "transparent",
              border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-md, 6px)",
              color: "var(--text-secondary)", cursor: "pointer",
            }}
          >
            {t("action.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !agentId || !skillName}
            style={{
              padding: "5px 14px", fontSize: 11, fontWeight: 500,
              background: "var(--bg-primary)", border: "0.5px solid var(--border-strong)",
              borderRadius: "var(--radius-md, 6px)", color: "var(--text-primary)",
              cursor: !name.trim() || !agentId || !skillName ? "default" : "pointer",
              opacity: !name.trim() || !agentId || !skillName ? 0.5 : 1,
            }}
          >
            {editingStep ? t("suite.update") : t("action.add")}
          </button>
        </div>
      </div>
    </div>
  );
}
