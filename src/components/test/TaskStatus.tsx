import type { TaskStatus as TaskStatusType } from "../../stores/testStore";

interface TaskStatusProps {
  status: TaskStatusType;
  latencyMs: number | null;
}

const pillStyles: Record<TaskStatusType, { bg: string; color: string }> = {
  idle: { bg: "var(--bg-secondary)", color: "var(--text-muted)" },
  completed: { bg: "var(--bg-success)", color: "var(--text-success)" },
  running: { bg: "var(--bg-warning)", color: "var(--text-warning)" },
  failed: { bg: "var(--bg-error)", color: "var(--dot-error)" },
  canceled: { bg: "var(--bg-secondary)", color: "var(--text-muted)" },
};

function formatLatency(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(3)}s`;
  }
  return `${ms}ms`;
}

export function TaskStatus({ status, latencyMs }: TaskStatusProps) {
  const pill = pillStyles[status];

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 11,
          padding: "2px 8px",
          borderRadius: 10,
          fontWeight: 500,
          fontFamily: "var(--font-mono)",
          background: pill.bg,
          color: pill.color,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "currentColor",
            flexShrink: 0,
          }}
        />
        {status}
      </span>
      {latencyMs != null && (
        <span
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {formatLatency(latencyMs)}
        </span>
      )}
    </span>
  );
}
