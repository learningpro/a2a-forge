/**
 * A2A JSON-RPC request builders.
 *
 * Produces payloads matching the A2A protocol:
 *   - tasks/send (one-shot)
 *   - tasks/sendSubscribe (streaming via SSE)
 *
 * The AIGC service expects skill_id at params level and
 * input object with skill-specific parameters (e.g. {prompt: "..."}).
 * The message field carries the A2A-standard user message.
 */

export interface TaskSendPayload {
  jsonrpc: "2.0";
  method: "tasks/send" | "tasks/sendSubscribe";
  params: {
    id: string;
    skill_id: string;
    message: {
      role: "user";
      parts: Array<{ type: "text"; text: string }>;
    };
    input: Record<string, unknown>;
  };
  id: number;
}

export function buildTaskSendPayload(
  skillId: string,
  text: string,
  taskId: string,
  contextData?: string,
  fileData?: { name: string; data: string } | null,
): TaskSendPayload {
  const input: Record<string, unknown> = { prompt: text };
  if (contextData) {
    try { input.context = JSON.parse(contextData); } catch { console.warn("Invalid context JSON, skipping context data"); }
  }
  if (fileData) {
    input.file = { name: fileData.name, data: fileData.data };
  }
  return {
    jsonrpc: "2.0",
    method: "tasks/send",
    params: {
      id: taskId,
      skill_id: skillId,
      message: {
        role: "user",
        parts: [{ type: "text", text }],
      },
      input,
    },
    id: 1,
  };
}

export function buildTaskSubscribePayload(
  skillId: string,
  text: string,
  taskId: string,
  contextData?: string,
  fileData?: { name: string; data: string } | null,
): TaskSendPayload {
  const input: Record<string, unknown> = { prompt: text };
  if (contextData) {
    try { input.context = JSON.parse(contextData); } catch { console.warn("Invalid context JSON, skipping context data"); }
  }
  if (fileData) {
    input.file = { name: fileData.name, data: fileData.data };
  }
  return {
    jsonrpc: "2.0",
    method: "tasks/sendSubscribe",
    params: {
      id: taskId,
      skill_id: skillId,
      message: {
        role: "user",
        parts: [{ type: "text", text }],
      },
      input,
    },
    id: 1,
  };
}

export function generateTaskId(): string {
  return crypto.randomUUID();
}
