import { useState, useCallback, useEffect, useMemo } from "react";
import { useAgentStore } from "../../stores/agentStore";
import { useTestStore } from "../../stores/testStore";
import { useStreamingTask } from "../../hooks/useStreamingTask";
import {
  buildTaskSendPayload,
  buildTaskSubscribePayload,
  generateTaskId,
} from "../../lib/a2a";
import { generateCurlCommand } from "../../lib/curl";
import { commands, type AgentSkill, type JsonValue } from "../../bindings";
import { unwrap, type HistoryEntry } from "../../lib/tauri-helpers";
import { SkillMetadata } from "./SkillMetadata";
import { InputForm } from "./InputForm";
import { ResponseViewer } from "./ResponseViewer";
import { HistoryList } from "./HistoryList";
import { SavedTestsList } from "./SavedTestsList";

export function TestPanel() {
  const agents = useAgentStore((s) => s.agents);
  const selectedAgentId = useAgentStore((s) => s.selectedAgentId);
  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId),
    [agents, selectedAgentId],
  );
  const selectedSkillId = useAgentStore((s) => s.selectedSkillId);
  const defaultHeaders = useAgentStore((s) => s.defaultHeaders);
  const agentDefaultHeaders = useMemo(
    () => (selectedAgentId ? defaultHeaders[selectedAgentId] : undefined) ?? {},
    [defaultHeaders, selectedAgentId],
  );

  const executions = useTestStore((s) => s.executions);
  const inputText = useTestStore((s) => s.inputText);
  const customHeaders = useTestStore((s) => s.customHeaders);
  const { run: runStreaming } = useStreamingTask();

  const [curlCopied, setCurlCopied] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  // Find selected skill
  const skill: AgentSkill | null =
    selectedAgent && selectedSkillId
      ? selectedAgent.card.skills.find((s) => s.id === selectedSkillId) ?? null
      : null;

  const agentId = selectedAgent?.id ?? "";
  const skillId = skill?.id ?? "";

  const exec = useMemo(
    () => useTestStore.getState().getExecution(agentId, skillId),
    [agentId, skillId, executions],
  );

  const isRunning = exec.status === "running";

  const handleCopyCurl = useCallback(() => {
    if (!selectedAgent || !skill) return;

    const taskId = generateTaskId();
    const payload = buildTaskSendPayload(skill.id, inputText, taskId);
    const merged = { ...agentDefaultHeaders, ...customHeaders };
    const authHeader = merged["Authorization"]
      ? `Authorization: ${merged["Authorization"]}`
      : undefined;
    const { Authorization: _, ...rest } = merged;

    const curl = generateCurlCommand(
      selectedAgent.url,
      payload,
      authHeader,
      Object.keys(rest).length > 0 ? rest : undefined,
    );

    navigator.clipboard.writeText(curl).then(() => {
      setCurlCopied(true);
      setTimeout(() => setCurlCopied(false), 1500);
    });
  }, [selectedAgent, skill, inputText, agentDefaultHeaders, customHeaders]);

  const handleRun = useCallback(async () => {
    if (!selectedAgent || !skill || isRunning) return;

    const taskId = generateTaskId();
    const hasStreaming = selectedAgent.card.capabilities.streaming === true;
    // Merge agent-level default headers with per-request custom headers (per-request wins)
    const merged = { ...agentDefaultHeaders, ...customHeaders };
    const authHeader = merged["Authorization"] || undefined;
    // Remove Authorization from extra headers since it's passed separately
    const { Authorization: _, ...rest } = merged;
    const extraHeaders =
      Object.keys(rest).length > 0 ? rest : undefined;
    const { startTask, finishTask } = useTestStore.getState();

    if (hasStreaming) {
      const payload = buildTaskSubscribePayload(skill.id, inputText, taskId);
      try {
        await runStreaming(
          selectedAgent.url,
          payload as unknown as JsonValue,
          selectedAgent.id,
          skill.id,
          authHeader,
          extraHeaders,
        );
      } catch (err) {
        finishTask(
          selectedAgent.id,
          skill.id,
          { error: err instanceof Error ? err.message : String(err) },
          "failed",
        );
      }
    } else {
      const payload = buildTaskSendPayload(skill.id, inputText, taskId);
      startTask(selectedAgent.id, skill.id, taskId);
      try {
        const result = unwrap(await commands.sendTask(
          selectedAgent.url,
          payload as unknown as JsonValue,
          authHeader ?? null,
          extraHeaders ?? null,
          null,
        ));
        finishTask(selectedAgent.id, skill.id, result, "completed");
      } catch (err) {
        finishTask(
          selectedAgent.id,
          skill.id,
          { error: err instanceof Error ? err.message : String(err) },
          "failed",
        );
      }
    }

    // Save history fire-and-forget
    const finalExec = useTestStore.getState().getExecution(selectedAgent.id, skill.id);
    commands
      .saveHistory(
        selectedAgent.id,
        taskId,
        JSON.stringify({ skill: skill.id, text: inputText }),
        finalExec.result != null ? JSON.stringify(finalExec.result) : null,
        finalExec.status,
        finalExec.latencyMs,
      )
      .then(() => {
        // Refresh history list after saving
        setHistoryRefreshKey((k) => k + 1);
      })
      .catch(() => {
        /* fire-and-forget */
      });
  }, [
    selectedAgent,
    skill,
    isRunning,
    inputText,
    agentDefaultHeaders,
    customHeaders,
    runStreaming,
  ]);


  // Listen for global keyboard shortcut event
  useEffect(() => {
    const handler = () => {
      handleRun();
    };
    document.addEventListener("a2a:run-test", handler);
    return () => document.removeEventListener("a2a:run-test", handler);
  }, [handleRun]);

  const handleHistorySelect = useCallback((entry: HistoryEntry) => {
    if (!selectedAgent || !skill) return;
    // Load the request into the input form
    try {
      const req = JSON.parse(entry.requestJson);
      if (req && typeof req === "object" && "text" in req) {
        useTestStore.getState().setInputText(String(req.text));
      }
    } catch { /* ignore parse error */ }
    // Show the response in the viewer
    if (entry.responseJson != null) {
      try {
        const resp = JSON.parse(entry.responseJson);
        useTestStore.getState().finishTask(
          selectedAgent.id,
          skill.id,
          resp,
          entry.status as "completed" | "failed",
        );
      } catch { /* ignore */ }
    }
  }, [selectedAgent, skill]);

  const handleRerun = useCallback(
    (payload: unknown) => {
      // Populate input from saved test payload and trigger run
      const p = payload as Record<string, unknown> | null;
      if (p && typeof p === "object") {
        const text = typeof p.text === "string" ? p.text : JSON.stringify(p, null, 2);
        useTestStore.getState().setInputText(text);
        useTestStore.getState().setInputTab("message");
      }
      // Auto-run after a tick so state is updated
      setTimeout(() => {
        handleRun();
      }, 50);
    },
    [handleRun],
  );

  // Build the current payload for the saved tests "save current" button
  const currentPayload =
    selectedAgent && skill && inputText
      ? { skill: skill.id, text: inputText }
      : undefined;

  // No skill selected -- empty state
  if (!skill || !selectedAgent) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-primary)",
          minWidth: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "12px 16px 10px",
            borderBottom: "0.5px solid var(--border-subtle)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            }}
          >
            No skill selected
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div
            style={{
              width: "50%",
              borderRight: "0.5px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                textAlign: "center",
                lineHeight: 1.6,
              }}
            >
              Select a skill to begin testing
            </div>
          </div>
          <div
            style={{
              width: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                textAlign: "center",
                lineHeight: 1.6,
              }}
            >
              Select a skill and run a test to see results here
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-primary)",
        minWidth: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px 10px",
          borderBottom: "0.5px solid var(--border-subtle)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <SkillMetadata skill={skill} />

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            onClick={handleCopyCurl}
            title="Copy as curl (Cmd+Shift+C)"
            style={{
              padding: "4px 8px",
              fontSize: 11,
              background: "transparent",
              border: "0.5px solid var(--border-subtle)",
              borderRadius: "var(--radius-md, 6px)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            }}
          >
            {curlCopied ? "Copied!" : "curl"}
          </button>
          <button
            onClick={handleRun}
            disabled={isRunning}
            style={{
              padding: "5px 14px",
              fontSize: 11,
              fontWeight: 500,
              background: "var(--bg-primary)",
              border: "0.5px solid var(--border-strong)",
              borderRadius: "var(--radius-md, 6px)",
              color: "var(--text-primary)",
              cursor: isRunning ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontFamily: "inherit",
              opacity: isRunning ? 0.7 : 1,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isRunning ? "var(--dot-warning)" : "var(--dot-online)",
                flexShrink: 0,
              }}
            />
            {isRunning ? "Running\u2026" : "Run"}
          </button>
        </div>
      </div>

      {/* Body: input + output columns */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Input column */}
        <div
          className="input-col"
          style={{
            width: "50%",
            borderRight: "0.5px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <InputForm
            skill={skill}
            card={selectedAgent.card}
          />

          {/* Saved tests */}
          <div
            style={{
              padding: "8px 14px 10px",
              borderTop: "0.5px solid var(--border-subtle)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 6,
              }}
            >
              Saved Tests
            </div>
            <SavedTestsList
              agentId={selectedAgent.id}
              skillName={skill.id}
              onRerun={handleRerun}
              currentPayload={currentPayload}
            />
          </div>
        </div>

        {/* Output column */}
        <div
          className="output-col"
          style={{
            width: "50%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <ResponseViewer agentId={selectedAgent.id} skillId={skill.id} />

          {/* History */}
          <div
            style={{
              borderTop: "0.5px solid var(--border-subtle)",
              height: 200,
              minHeight: 120,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                padding: "8px 12px 0",
              }}
            >
              History
            </div>
            <HistoryList
              key={historyRefreshKey}
              agentId={selectedAgent.id}
              onSelectHistory={handleHistorySelect}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
