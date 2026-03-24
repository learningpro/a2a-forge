import { useState, useEffect, useCallback } from "react";
import { commands, type AgentCard } from "../../bindings";
import { unwrap } from "../../lib/tauri-helpers";
import { useAgentStore } from "../../stores/agentStore";

type PreviewState =
  | { status: "idle" }
  | { status: "fetching" }
  | { status: "success"; card: AgentCard }
  | { status: "error"; message: string };

interface AddAgentDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddAgentDialog({ open, onClose }: AddAgentDialogProps) {
  const [url, setUrl] = useState("");
  const [nickname, setNickname] = useState("");
  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });
  const [isAdding, setIsAdding] = useState(false);

  // Debounced URL preview (900ms)
  useEffect(() => {
    if (url.trim().length < 8) {
      setPreview({ status: "idle" });
      return;
    }

    setPreview({ status: "fetching" });

    const timer = setTimeout(async () => {
      try {
        const card = unwrap(await commands.fetchAgentCard(url.trim()));
        setPreview({ status: "success", card });
      } catch (err: unknown) {
        let message = "Failed to fetch agent card";
        if (err && typeof err === "object" && "message" in err) {
          message = String((err as { message: string }).message);
        } else if (typeof err === "string") {
          message = err;
        }
        setPreview({ status: "error", message });
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [url]);

  const handleAdd = useCallback(async () => {
    if (preview.status !== "success") return;
    setIsAdding(true);
    try {
      await useAgentStore
        .getState()
        .addAgent(url.trim(), nickname.trim() || null, "default");
      setUrl("");
      setNickname("");
      setPreview({ status: "idle" });
      onClose();
    } catch (err: unknown) {
      let message = "Failed to add agent";
      if (err && typeof err === "object" && "message" in err) {
        message = String((err as { message: string }).message);
      }
      setPreview({ status: "error", message });
    } finally {
      setIsAdding(false);
    }
  }, [preview, url, nickname, onClose]);

  const handleCancel = useCallback(() => {
    setUrl("");
    setNickname("");
    setPreview({ status: "idle" });
    onClose();
  }, [onClose]);

  if (!open) return null;

  const addDisabled = preview.status !== "success" || isAdding;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCancel();
      }}
    >
      <style>{`@keyframes a2a-spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius-lg)",
          padding: 16,
          width: 420,
          maxWidth: "90vw",
          border: "0.5px solid var(--border-subtle)",
          boxShadow: "0 4px 32px rgba(0,0,0,0.06)",
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          Add agent card
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            marginBottom: 16,
            lineHeight: 1.5,
          }}
        >
          Enter the base URL of the agent. The workbench will fetch the
          well-known card from{" "}
          <code
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
            }}
          >
            /.well-known/agent.json
          </code>
          .
        </div>

        {/* Base URL label */}
        <div
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            marginBottom: 4,
          }}
        >
          Base URL
        </div>

        {/* URL input */}
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="http://localhost:8080"
          style={{
            width: "100%",
            padding: "7px 10px",
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            background: "var(--bg-primary)",
            border: "0.5px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-primary)",
            marginBottom: 12,
            boxSizing: "border-box",
            outline: "none",
          }}
        />

        {/* Nickname label */}
        <div
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            marginBottom: 4,
          }}
        >
          Nickname (optional)
        </div>

        {/* Nickname input */}
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="e.g. Travel Planner (dev)"
          style={{
            width: "100%",
            padding: "7px 10px",
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            background: "var(--bg-primary)",
            border: "0.5px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-primary)",
            marginBottom: 12,
            boxSizing: "border-box",
            outline: "none",
          }}
        />

        {/* Preview label */}
        <div
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            marginBottom: 4,
          }}
        >
          Preview
        </div>

        {/* Preview box */}
        <div
          style={{
            background: "var(--bg-primary)",
            border: "0.5px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "10px 12px",
            marginBottom: 12,
          }}
        >
          {preview.status === "idle" && (
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Enter a URL to preview the agent card
            </div>
          )}

          {preview.status === "fetching" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  border: "1.5px solid var(--border-default)",
                  borderTopColor: "var(--text-secondary)",
                  borderRadius: "50%",
                  animation: "a2a-spin 0.7s linear infinite",
                  flexShrink: 0,
                }}
              />
              Fetching agent.json...
            </div>
          )}

          {preview.status === "success" && (
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  marginBottom: 2,
                }}
              >
                {preview.card.name}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                v{preview.card.version} &middot; A2A{" "}
                {preview.card.protocolVersion ?? "unknown"} &middot;{" "}
                {preview.card.skills.length} skills
              </div>
              {preview.card.skills.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    flexWrap: "wrap",
                    marginTop: 6,
                  }}
                >
                  {preview.card.skills.slice(0, 4).map((skill) => (
                    <span
                      key={skill.id}
                      style={{
                        fontSize: 10,
                        padding: "2px 7px",
                        borderRadius: 8,
                        background: "var(--bg-secondary)",
                        border: "0.5px solid var(--border-subtle)",
                        color: "var(--text-secondary)",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {skill.name}
                    </span>
                  ))}
                  {preview.card.skills.length > 4 && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 7px",
                        borderRadius: 8,
                        background: "var(--bg-secondary)",
                        border: "0.5px solid var(--border-subtle)",
                        color: "var(--text-secondary)",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      +{preview.card.skills.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {preview.status === "error" && (
            <div style={{ fontSize: 11, color: "#e24b4a" }}>
              {preview.message}
            </div>
          )}
        </div>

        {/* Button row */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={handleCancel}
            style={{
              padding: "6px 14px",
              fontSize: 11,
              background: "transparent",
              border: "0.5px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={addDisabled}
            style={{
              padding: "6px 14px",
              fontSize: 11,
              fontWeight: 500,
              background: "var(--text-primary)",
              border: "0.5px solid var(--border-strong)",
              borderRadius: "var(--radius-md)",
              color: "var(--bg-primary)",
              cursor: addDisabled ? "default" : "pointer",
              fontFamily: "inherit",
              opacity: addDisabled ? 0.4 : 1,
              pointerEvents: addDisabled ? "none" : "auto",
            }}
          >
            Add agent
          </button>
        </div>
      </div>
    </div>
  );
}
