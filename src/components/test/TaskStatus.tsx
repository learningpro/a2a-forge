import type { TaskStatus as TaskStatusType } from "../../stores/testStore";

interface TaskStatusProps {
  status: TaskStatusType;
  latencyMs: number | null;
}

const statusColors: Record<TaskStatusType, string> = {
  idle: "#1D9E75",
  completed: "#1D9E75",
  running: "#EF9F27",
  failed: "#E24B4A",
  canceled: "#9a9992",
};

export function TaskStatus({ status, latencyMs }: TaskStatusProps) {
  const dotColor = statusColors[status];

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: dotColor,
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 }}>
        {status}
      </span>
      {latencyMs != null && (
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
          {latencyMs}ms
        </span>
      )}
    </span>
  );
}
