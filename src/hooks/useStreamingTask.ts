import { Channel } from "@tauri-apps/api/core";
import { commands, unwrap, type TaskEvent, type JsonValue } from "../bindings";
import { useTestStore, type TaskChunk } from "../stores/testStore";

/**
 * Hook that runs a streaming A2A task via Tauri Channel.
 *
 * Wires SSE events from the Rust backend into testStore:
 *  - startTask(taskId) at invocation
 *  - appendChunk(event) for each SSE event
 *  - finishTask(lastChunk) when the stream ends
 */
export function useStreamingTask() {
  const { startTask, appendChunk, finishTask } = useTestStore.getState();

  const run = async (
    agentUrl: string,
    payload: JsonValue,
    authHeader?: string,
    extraHeaders?: Record<string, string>,
  ) => {
    const channel = new Channel<TaskEvent>();

    let lastChunk: TaskChunk | null = null;

    channel.onmessage = (event: TaskEvent) => {
      const chunk: TaskChunk = {
        raw: event.raw,
        status: event.status
          ? { state: event.status.state, message: event.status.message ?? undefined }
          : undefined,
        artifact: event.artifact ?? undefined,
      };
      lastChunk = chunk;
      appendChunk(chunk);
    };

    const taskId = unwrap(await commands.streamTask(
      agentUrl,
      payload,
      authHeader ?? null,
      extraHeaders ?? null,
      channel,
    ));

    startTask(taskId);

    // Stream has ended when streamTask resolves
    const finalStatus = (lastChunk as TaskChunk | null)?.status?.state;
    const taskStatus =
      finalStatus === "failed" ? ("failed" as const) : ("completed" as const);
    finishTask(lastChunk, taskStatus);
  };

  return { run };
}
