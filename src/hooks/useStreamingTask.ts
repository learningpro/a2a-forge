import { useCallback } from "react";
import { Channel } from "@tauri-apps/api/core";
import { commands, type TaskEvent, type JsonValue } from "../bindings";
import { unwrap } from "../lib/tauri-helpers";
import { useTestStore, type TaskChunk } from "../stores/testStore";
import { STREAM_TIMEOUT_MS } from "../lib/constants";

const TERMINAL_STATES = new Set(["completed", "failed", "canceled"]);

/**
 * Hook that runs a streaming A2A task via Tauri Channel.
 * Waits for a terminal SSE event before calling finishTask.
 */
export function useStreamingTask() {
  const run = useCallback(async (
    agentUrl: string,
    payload: JsonValue,
    agentId: string,
    skillId: string,
    authHeader?: string,
    extraHeaders?: Record<string, string>,
  ) => {
    const { startTask, appendChunk, finishTask } = useTestStore.getState();
    const channel = new Channel<TaskEvent>();

    let lastChunk: TaskChunk | null = null;

    // Register channel handler BEFORE calling streamTask to avoid losing early events
    const streamDone = new Promise<void>((resolve) => {
      channel.onmessage = (event: TaskEvent) => {
        const chunk: TaskChunk = {
          raw: event.raw,
          status: event.status
            ? { state: event.status.state, message: event.status.message ?? undefined }
            : undefined,
          artifact: event.artifact ?? undefined,
        };
        lastChunk = chunk;
        appendChunk(agentId, skillId, chunk);

        if (chunk.status?.state && TERMINAL_STATES.has(chunk.status.state)) {
          resolve();
        }
      };
    });

    // Now start the stream — handler is already registered
    const taskId = unwrap(await commands.streamTask(
      agentUrl,
      payload,
      authHeader ?? null,
      extraHeaders ?? null,
      channel,
    ));

    // Initialize execution state (after handler is set, before awaiting streamDone)
    startTask(agentId, skillId, taskId);

    // Wait for the stream to finish (with a safety timeout)
    let timedOut = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      streamDone.then(() => { if (timeoutId) clearTimeout(timeoutId); }),
      new Promise<void>((resolve) => {
        timeoutId = setTimeout(() => { timedOut = true; resolve(); }, STREAM_TIMEOUT_MS);
      }),
    ]);

    const finalStatus = (lastChunk as TaskChunk | null)?.status?.state;
    let taskStatus: "completed" | "failed";
    if (timedOut && !finalStatus) {
      taskStatus = "failed";
      lastChunk = { raw: '{"error":"Stream timed out after 5 minutes"}' };
      // Cancel the backend SSE task to free resources
      commands.cancelTask(taskId).catch(() => {});
    } else if (finalStatus === "failed" || finalStatus === "canceled") {
      taskStatus = "failed";
    } else {
      taskStatus = "completed";
    }
    finishTask(agentId, skillId, lastChunk, taskStatus);
  }, []);

  return { run };
}
