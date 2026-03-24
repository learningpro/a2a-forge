/**
 * A2A JSON-RPC request builders.
 *
 * Produces payloads matching the A2A protocol spec:
 *   - tasks/send (one-shot)
 *   - tasks/sendSubscribe (streaming via SSE)
 */

export interface TaskSendPayload {
  jsonrpc: "2.0";
  method: "tasks/send" | "tasks/sendSubscribe";
  params: {
    id: string;
    message: {
      role: "user";
      parts: Array<{ type: "text"; text: string }>;
    };
    metadata: {
      skill_id: string;
    };
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
      message: {
        role: "user",
        parts: [{ type: "text", text }],
      },
      metadata: {
        skill_id: skillId,
      },
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
      message: {
        role: "user",
        parts: [{ type: "text", text }],
      },
      metadata: {
        skill_id: skillId,
      },
    },
    id: 1,
  };
}

export function generateTaskId(): string {
  return crypto.randomUUID();
}
