import { useState, useRef, useEffect } from "react";
import type { AgentRow } from "../../bindings";
import { useAgentStore } from "../../stores/agentStore";
import { AgentContextMenu } from "./AgentContextMenu";

interface AgentListItemProps {
  agent: AgentRow;
  isActive: boolean;
  onClick: () => void;
}

function getStatusDotColor(agent: AgentRow): string {
  const nowSeconds = Date.now() / 1000;
  if (nowSeconds - Number(agent.lastFetchedAt) > 3600) {
    return "var(--dot-warning)"; // amber -- stale > 1 hour
  }
  return "var(--dot-online)"; // green -- recently fetched
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
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const dotColor = getStatusDotColor(agent);
  const displayName = agent.nickname ?? agent.card.name;
  const hostUrl = getHostFromUrl(agent.url);
  const skillCount = agent.card.skills.length;

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleRenameStart = () => {
    setRenameValue(displayName);
    setIsRenaming(true);
  };

  const handleRenameSave = async () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== displayName) {
      try {
        await useAgentStore.getState().renameAgent(agent.id, trimmed);
      } catch (e) {
        console.error("Rename failed:", e);
      }
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRenameSave();
    } else if (e.key === "Escape") {
      setIsRenaming(false);
    }
  };

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
        position: "relative",
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
        {isRenaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSave}
            onKeyDown={handleRenameKeyDown}
            onClick={(e) => e.stopPropagation()}
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "var(--text-primary)",
              background: "var(--bg-secondary)",
              border: "0.5px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
              padding: "1px 4px",
              width: "100%",
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        ) : (
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
        )}
        <div
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
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

      {/* Hover action menu */}
      {hovered && !isRenaming && (
        <div
          style={{
            position: "absolute",
            right: 4,
            top: 4,
          }}
        >
          <AgentContextMenu
            agentId={agent.id}
            agentName={displayName}
            onRename={handleRenameStart}
          />
        </div>
      )}
    </div>
  );
}
