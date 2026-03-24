import { useState, useCallback, useEffect } from "react";
import { useAgentStore } from "../../stores/agentStore";
import { useTestStore } from "../../stores/testStore";
import { useStreamingTask } from "../../hooks/useStreamingTask";
import {
  buildTaskSendPayload,
  buildTaskSubscribePayload,
  generateTaskId,
} from "../../lib/a2a";
import { generateCurlCommand } from "../../lib/curl";
import { commands, unwrap, type AgentSkill, type HistoryEntry, type JsonValue } from "../../bindings";
import { SkillMetadata } from "./SkillMetadata";
import { InputForm } from "./InputForm";
import { ResponseViewer } from "./ResponseViewer";
import { HistoryList } from "./HistoryList";
import { SavedTestsList } from "./SavedTestsList";

export function TestPanel() {
  const selectedAgent = useAgentStore((s) => s.selectedAgent());
  const selectedSkillId = useAgentStore((s) => s.selectedSkillId);

  const { status, inputText, customHeaders } =
    useTestStore();
  const { run: runStreaming } = useStreamingTask();

  const [authValue, setAuthValue] = useState("");
  const [curlCopied, setCurlCopied] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  // Find selected skill
  const skill: AgentSkill | null =
    selectedAgent && selectedSkillId
      ? selectedAgent.card.skills.find((s) => s.id === selectedSkillId) ?? null
      : null;

  const isRunning = status === "running";

  const handleCopyCurl = useCallback(() => {
    if (!selectedAgent || !skill) return;

    const taskId = generateTaskId();
    const payload = buildTaskSendPayload(skill.id, inputText, taskId);
    const authHeader = authValue ? `Authorization: ${authValue}` : undefined;

    const curl = generateCurlCommand(
      selectedAgent.url,
      payload,
      authHeader,
      Object.keys(customHeaders).length > 0 ? customHeaders : undefined,
    );

    navigator.clipboard.writeText(curl).then(() => {
      setCurlCopied(true);
      setTimeout(() => setCurlCopied(false), 1500);
    });
  }, [selectedAgent, skill, inputText, authValue, customHeaders]);

  const handleRun = useCallback(async () => {
    if (!selectedAgent || !skill || isRunning) return;

    const taskId = generateTaskId();
    const hasStreaming = selectedAgent.card.capabilities.streaming === true;
    const authHeader = authValue || undefined;
    const extraHeaders =
      Object.keys(customHeaders).length > 0 ? customHeaders : undefined;
    const { startTask, finishTask } = useTestStore.getState();

    if (hasStreaming) {
      const payload = buildTaskSubscribePayload(skill.id, inputText, taskId);
      try {
        await runStreaming(
          selectedAgent.url,
          payload as unknown as JsonValue,
          authHeader,
          extraHeaders,
        );
      } catch (err) {
        finishTask(
          { error: err instanceof Error ? err.message : String(err) },
          "failed",
        );
      }
    } else {
      const payload = buildTaskSendPayload(skill.id, inputText, taskId);
      startTask(taskId);
      try {
        const result = unwrap(await commands.sendTask(
          selectedAgent.url,
          payload as unknown as JsonValue,
          authHeader ?? null,
          extraHeaders ?? null,
          null,
        ));
        finishTask(result, "completed");
      } catch (err) {
        finishTask(
          { error: err instanceof Error ? err.message : String(err) },
          "failed",
        );
      }
    }

    // Save history fire-and-forget
    const { result, status: finalStatus, latencyMs: finalLatency } =
      useTestStore.getState();
    commands
      .saveHistory(
        selectedAgent.id,
        taskId,
        JSON.stringify({ skill: skill.id, text: inputText }),
        result != null ? JSON.stringify(result) : null,
        finalStatus,
        finalLatency,
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
    authValue,
    customHeaders,
    runStreaming,
  ]);

  const handleExampleClick = useCallback(
    (example: unknown) => {
      const text = typeof example === "string" ? example : JSON.stringify(example, null, 2);
      useTestStore.getState().setInputText(text);
      useTestStore.getState().setInputTab("message");
    },
    [],
  );

  // Listen for global keyboard shortcut event
  useEffect(() => {
    const handler = () => {
      handleRun();
    };
    document.addEventListener("a2a:run-test", handler);
    return () => document.removeEventListener("a2a:run-test", handler);
  }, [handleRun]);

  const handleHistorySelect = useCallback((entry: HistoryEntry) => {
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
          resp,
          entry.status as "completed" | "failed",
        );
      } catch { /* ignore */ }
    }
  }, []);

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
                fontSize: 12,
                color: "var(--text-muted)",
                textAlign: "center",
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
                fontSize: 12,
                color: "var(--text-muted)",
                textAlign: "center",
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
        <SkillMetadata skill={skill} onExampleClick={handleExampleClick} />

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            onClick={handleCopyCurl}
            title="Copy as curl (Cmd+Shift+C)"
            style={{
              padding: "4px 8px",
              fontSize: 10,
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
            authValue={authValue}
            onAuthChange={setAuthValue}
            onRun={handleRun}
            isRunning={isRunning}
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
                fontSize: 10,
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
          <ResponseViewer />

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
                fontSize: 10,
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
