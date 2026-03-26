import { useState, useMemo } from "react";
import { useAgentStore } from "../../stores/agentStore";
import { useTestStore } from "../../stores/testStore";
import type { AgentSkill } from "../../bindings";
import { AgentHeadersDialog } from "../agent/AgentHeadersDialog";

interface SkillPanelProps {
  width: number;
}

type ModeFilter = "all" | "text" | "file" | "data";

function getModeStyle(mode: string): React.CSSProperties {
  const m = mode.toLowerCase();
  if (m.includes("text"))
    return { background: "var(--bg-success)", color: "var(--text-success)" };
  if (m.includes("file"))
    return { background: "var(--bg-info)", color: "var(--text-info)" };
  if (m.includes("data"))
    return { background: "var(--bg-warning)", color: "var(--text-warning)" };
  return { background: "var(--bg-secondary)", color: "var(--text-secondary)" };
}

function getHostFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function ModeTag({ mode }: { mode: string }) {
  return (
    <span
      style={{
        fontSize: 9,
        padding: "1px 5px",
        borderRadius: 4,
        fontWeight: 500,
        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
        ...getModeStyle(mode),
      }}
    >
      {mode}
    </span>
  );
}

function NoExamplesBadge() {
  return (
    <span
      style={{
        fontSize: 9,
        padding: "1px 5px",
        borderRadius: 4,
        background: "var(--bg-secondary)",
        color: "var(--text-muted)",
        border: "0.5px solid var(--border-subtle)",
      }}
    >
      No examples
    </span>
  );
}

function SkillItem({
  skill,
  isSelected,
  onSelect,
  taskStatus,
}: {
  skill: AgentSkill;
  isSelected: boolean;
  onSelect: () => void;
  taskStatus?: "running" | "completed" | "failed" | null;
}) {
  return (
    <div
      onClick={onSelect}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.background = "var(--bg-secondary)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.background = "transparent";
      }}
      style={{
        padding: "8px 10px",
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        border: `0.5px solid ${isSelected ? "var(--border-default)" : "transparent"}`,
        background: isSelected ? "var(--bg-secondary)" : "transparent",
        transition: "all 0.1s",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: "var(--text-primary)",
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
          marginBottom: 2,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {skill.name}
        {taskStatus === "running" && (
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "var(--text-info, #185fa5)",
            display: "inline-block", flexShrink: 0,
            animation: "pulse 1.5s ease-in-out infinite",
          }} />
        )}
        {taskStatus === "completed" && (
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "var(--dot-online, #1D9E75)",
            display: "inline-block", flexShrink: 0,
          }} />
        )}
        {taskStatus === "failed" && (
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "var(--dot-error, #E24B4A)",
            display: "inline-block", flexShrink: 0,
          }} />
        )}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "var(--text-muted)",
          lineHeight: 1.4,
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as const,
          overflow: "hidden",
          display: "-webkit-box",
        }}
      >
        {skill.description ?? "No description"}
      </div>
      <div style={{ marginTop: 5, display: "flex", gap: 3, flexWrap: "wrap" }}>
        {(skill.inputModes ?? []).map((mode) => (
          <ModeTag key={`in-${mode}`} mode={mode} />
        ))}
        {(!skill.examples || skill.examples.length === 0) && (
          <NoExamplesBadge />
        )}
      </div>
    </div>
  );
}

const FILTER_LABELS: { label: string; value: ModeFilter }[] = [
  { label: "All", value: "all" },
  { label: "text", value: "text" },
  { label: "file", value: "file" },
  { label: "data", value: "data" },
];

export function SkillPanel({ width }: SkillPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ModeFilter>("all");
  const [headersOpen, setHeadersOpen] = useState(false);

  const agents = useAgentStore((s) => s.agents);
  const selectedAgentId = useAgentStore((s) => s.selectedAgentId);
  const selectedSkillId = useAgentStore((s) => s.selectedSkillId);
  const setSelectedSkillId = useAgentStore((s) => s.setSelectedSkillId);

  const executions = useTestStore((s) => s.executions);

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId),
    [agents, selectedAgentId],
  );

  const filteredSkills = useMemo(() => {
    const skills = selectedAgent?.card.skills ?? [];
    let result = skills;

    if (activeFilter !== "all") {
      result = result.filter(
        (skill) =>
          (skill.inputModes ?? []).some((m) =>
            m.toLowerCase().includes(activeFilter),
          ) ||
          (skill.outputModes ?? []).some((m) =>
            m.toLowerCase().includes(activeFilter),
          ),
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (skill) =>
          skill.name.toLowerCase().includes(q) ||
          (skill.description ?? "").toLowerCase().includes(q),
      );
    }

    return result;
  }, [selectedAgent, activeFilter, searchQuery]);

  return (
    <div
      style={{
        width,
        minWidth: 160,
        maxWidth: 480,
        background: "var(--bg-primary)",
        borderRight: "0.5px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 14px 8px",
          borderBottom: "0.5px solid var(--border-subtle)",
        }}
      >
        {selectedAgent ? (
          <>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {selectedAgent.nickname ?? selectedAgent.card.name}
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 6px",
                  borderRadius: 10,
                  fontWeight: 500,
                  background: "var(--bg-success)",
                  color: "var(--text-success)",
                }}
              >
                online
              </span>
              <button
                onClick={() => setHeadersOpen(true)}
                title="Default headers for this agent"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  fontSize: 12,
                  padding: "0 2px",
                  lineHeight: 1,
                  marginLeft: "auto",
                }}
              >
                {"\u2699"}
              </button>
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                marginTop: 2,
              }}
            >
              {getHostFromUrl(selectedAgent.url)}
            </div>
          </>
        ) : (
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            No agent selected
          </div>
        )}
        <input
          placeholder="Search skills..."
          disabled={!selectedAgent}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            display: "block",
            marginTop: 8,
            padding: "5px 8px",
            fontSize: 11,
            background: "var(--bg-secondary)",
            border: "0.5px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-primary)",
            width: "100%",
            fontFamily: "inherit",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Filter chips */}
      <div style={{ padding: "6px 14px 8px", display: "flex", gap: 4 }}>
        {FILTER_LABELS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setActiveFilter(value)}
            style={{
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 10,
              border: `0.5px solid ${activeFilter === value ? "var(--border-info)" : "var(--border-subtle)"}`,
              background:
                activeFilter === value ? "var(--bg-info)" : "transparent",
              color:
                activeFilter === value
                  ? "var(--text-info)"
                  : "var(--text-secondary)",
              cursor: "pointer",
              fontFamily: "inherit",
              minHeight: 28,
              transition: "background var(--duration-normal), color var(--duration-normal), border-color var(--duration-normal)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Skill list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "6px 8px",
          display: "flex",
          flexDirection: "column",
          ...((!selectedAgent || filteredSkills.length === 0) && {
            alignItems: "center",
            justifyContent: "center",
          }),
          gap: 2,
        }}
      >
        {!selectedAgent ? (
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              textAlign: "center",
              padding: "20px 10px",
            }}
          >
            Select an agent to browse skills
          </div>
        ) : filteredSkills.length === 0 ? (
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              textAlign: "center",
              padding: "20px 10px",
            }}
          >
            No skills match your search
          </div>
        ) : (
          filteredSkills.map((skill) => {
              const execKey = selectedAgentId ? `${selectedAgentId}:${skill.id}` : "";
              const exec = execKey ? executions[execKey] : undefined;
              const taskStatus = exec?.status === "running" ? "running"
                : exec?.status === "completed" ? "completed"
                : exec?.status === "failed" ? "failed"
                : null;
              return (
                <SkillItem
                  key={skill.id}
                  skill={skill}
                  isSelected={skill.id === selectedSkillId}
                  onSelect={() => setSelectedSkillId(skill.id)}
                  taskStatus={taskStatus}
                />
              );
            })
        )}
      </div>

      {selectedAgent && (
        <AgentHeadersDialog
          open={headersOpen}
          onClose={() => setHeadersOpen(false)}
          agentId={selectedAgent.id}
          agentName={selectedAgent.nickname ?? selectedAgent.card.name}
        />
      )}
    </div>
  );
}
