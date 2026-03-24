import { useState } from "react";
import type { AgentRow } from "../../bindings";

interface AgentListItemProps {
  agent: AgentRow;
  isActive: boolean;
  onClick: () => void;
}

function getStatusDotColor(agent: AgentRow): string {
  const nowSeconds = Date.now() / 1000;
  if (nowSeconds - agent.lastFetchedAt > 3600) {
    return "#EF9F27"; // amber — stale > 1 hour
  }
  return "#1D9E75"; // green — recently fetched
}

function getHostFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function AgentListItem({ agent, isActive, onClick }: AgentListItemProps) {
  const [hovered, setHovered] = useState(false);

  const dotColor = getStatusDotColor(agent);
  const displayName = agent.nickname ?? agent.card.name;
  const hostUrl = getHostFromUrl(agent.url);
  const skillCount = agent.card.skills.length;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "8px 10px",
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
        border: `0.5px solid ${isActive ? "var(--border-default)" : "transparent"}`,
        background: isActive || hovered ? "var(--bg-primary)" : "transparent",
        transition: "background 0.1s",
      }}
    >
      {/* Status dot */}
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          flexShrink: 0,
          background: dotColor,
        }}
      />

      {/* Agent info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "var(--text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {displayName}
        </div>
        <div
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            fontFamily: "'JetBrains Mono', monospace",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {hostUrl}
        </div>
      </div>

      {/* Skill count */}
      <div style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>
        {skillCount}
      </div>
    </div>
  );
}
