import { useState, useCallback } from "react";
import { useAgentStore } from "../../stores/agentStore";
import { useTestStore } from "../../stores/testStore";
import { useStreamingTask } from "../../hooks/useStreamingTask";
import {
  buildTaskSendPayload,
  buildTaskSubscribePayload,
  generateTaskId,
} from "../../lib/a2a";
import { generateCurlCommand } from "../../lib/curl";
import { commands, type AgentSkill } from "../../bindings";
import { SkillMetadata } from "./SkillMetadata";
import { InputForm } from "./InputForm";

export function TestPanel() {
  const selectedAgent = useAgentStore((s) => s.selectedAgent());
  const selectedSkillId = useAgentStore((s) => s.selectedSkillId);

  const { status, latencyMs, startTask, finishTask, inputText, customHeaders } =
    useTestStore();
  const { run: runStreaming } = useStreamingTask();

  const [authValue, setAuthValue] = useState("");
  const [curlCopied, setCurlCopied] = useState(false);

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

    if (hasStreaming) {
      // Streaming mode: tasks/sendSubscribe via SSE
      const payload = buildTaskSubscribePayload(skill.id, inputText, taskId);
      try {
        await runStreaming(
          selectedAgent.url,
          payload,
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
      // Sync mode: tasks/send
      const payload = buildTaskSendPayload(skill.id, inputText, taskId);
      startTask(taskId);
      try {
        const result = await commands.sendTask(
          selectedAgent.url,
          payload,
          authHeader ?? null,
          extraHeaders ?? null,
        );
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
        { skill: skill.id, text: inputText },
        result,
        finalStatus,
        finalLatency,
      )
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
    startTask,
    finishTask,
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

  // No skill selected — empty state
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
              Results will appear here
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
          <div
            style={{
              flex: 1,
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
              Run a test to see results
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
