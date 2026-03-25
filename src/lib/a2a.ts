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
): TaskSendPayload {
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
      input: { prompt: text },
    },
    id: 1,
  };
}

export function buildTaskSubscribePayload(
  skillId: string,
  text: string,
  taskId: string,
): TaskSendPayload {
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
      input: { prompt: text },
    },
    id: 1,
  };
}

export function generateTaskId(): string {
  return crypto.randomUUID();
}
