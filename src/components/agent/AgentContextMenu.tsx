import { useState } from "react";
import { useAgentStore } from "../../stores/agentStore";

interface AgentContextMenuProps {
  agentId: string;
  agentName: string;
  onRename: () => void;
}

export function AgentContextMenu({
  agentId,
  agentName,
  onRename,
}: AgentContextMenuProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await useAgentStore.getState().refreshAgent(agentId);
    } catch (e) {
      console.error("Refresh failed:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = async () => {
    try {
      await useAgentStore.getState().deleteAgent(agentId);
    } catch (e) {
      console.error("Delete failed:", e);
    }
    setConfirmingDelete(false);
  };

  const buttonBase: React.CSSProperties = {
    padding: "2px 4px",
    background: "transparent",
    border: "none",
    fontSize: 9,
    color: "var(--text-muted)",
    cursor: "pointer",
    fontFamily: "inherit",
    lineHeight: 1,
  };

  if (confirmingDelete) {
    return (
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: "100%",
          zIndex: 10,
          padding: "6px 8px",
          background: "var(--bg-primary)",
          border: "0.5px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontSize: 10,
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          Delete {agentName}? This removes all test history.
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={() => setConfirmingDelete(false)}
            style={{
              ...buttonBase,
              color: "var(--text-muted)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            style={{
              ...buttonBase,
              color: "var(--dot-error)",
              fontWeight: 500,
            }}
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 2,
        alignItems: "center",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onRename}
        style={buttonBase}
        title="Rename"
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--text-muted)";
        }}
      >
        rename
      </button>
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        style={{
          ...buttonBase,
          opacity: isRefreshing ? 0.5 : 1,
        }}
        title="Refresh agent card"
        onMouseEnter={(e) => {
          if (!isRefreshing) e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--text-muted)";
        }}
      >
        {isRefreshing ? "..." : "refresh"}
      </button>
      <button
        onClick={() => setConfirmingDelete(true)}
        style={buttonBase}
        title="Delete agent"
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--dot-error)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--text-muted)";
        }}
      >
        del
      </button>
    </div>
  );
}
