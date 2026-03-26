import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAgentStore } from "../../stores/agentStore";
import { fadeBackdrop, slideInRight } from "../../lib/animations";

interface HeaderEntry {
  key: string;
  value: string;
}

interface AgentHeadersDialogProps {
  open: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
}

const EMPTY_HEADERS: Record<string, string> = {};

export function AgentHeadersDialog({
  open,
  onClose,
  agentId,
  agentName,
}: AgentHeadersDialogProps) {
  const allDefaultHeaders = useAgentStore((s) => s.defaultHeaders);
  const defaultHeaders = useMemo(
    () => allDefaultHeaders[agentId] ?? EMPTY_HEADERS,
    [allDefaultHeaders, agentId],
  );
  const setDefaultHeaders = useAgentStore((s) => s.setDefaultHeaders);
  const loadDefaultHeaders = useAgentStore((s) => s.loadDefaultHeaders);

  const [entries, setEntries] = useState<HeaderEntry[]>([{ key: "", value: "" }]);

  // Load from store/SQLite on open
  useEffect(() => {
    if (open) {
      loadDefaultHeaders(agentId);
    }
  }, [open, agentId, loadDefaultHeaders]);

  // Sync store -> local entries when defaultHeaders changes
  useEffect(() => {
    const pairs = Object.entries(defaultHeaders);
    if (pairs.length > 0) {
      setEntries([...pairs.map(([key, value]) => ({ key, value })), { key: "", value: "" }]);
    } else {
      setEntries([{ key: "", value: "" }]);
    }
  }, [defaultHeaders]);

  const handleChange = (idx: number, field: "key" | "value", val: string) => {
    const next = [...entries];
    next[idx] = { ...next[idx], [field]: val };
    setEntries(next);
  };

  const addRow = () => {
    setEntries([...entries, { key: "", value: "" }]);
  };

  const removeRow = (idx: number) => {
    const next = entries.filter((_, i) => i !== idx);
    if (next.length === 0) next.push({ key: "", value: "" });
    setEntries(next);
  };

  const handleSave = useCallback(() => {
    const headers: Record<string, string> = {};
    for (const e of entries) {
      if (e.key.trim()) headers[e.key.trim()] = e.value;
    }
    setDefaultHeaders(agentId, headers);
    onClose();
  }, [entries, agentId, setDefaultHeaders, onClose]);

  if (!open) return null;

  return (
    <AgentHeadersDialogInner
      entries={entries} handleChange={handleChange} addRow={addRow}
      removeRow={removeRow} handleSave={handleSave} onClose={onClose}
      agentName={agentName}
    />
  );
}

function AgentHeadersDialogInner({ entries, handleChange, addRow, removeRow, handleSave, onClose, agentName }: {
  entries: HeaderEntry[]; handleChange: (i: number, f: "key" | "value", v: string) => void;
  addRow: () => void; removeRow: (i: number) => void; handleSave: () => void;
  onClose: () => void; agentName: string;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fadeBackdrop(backdropRef.current);
    slideInRight(dialogRef.current);
  }, []);

  return (
    <div
      ref={backdropRef}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        visibility: "hidden",
      }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-secondary)",
          border: "0.5px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg, 10px)",
          padding: 20,
          width: 420,
          maxWidth: "90vw",
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 4px 32px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          Default Headers
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            marginBottom: 16,
          }}
        >
          Set default headers for <strong>{agentName}</strong>. These are merged
          with per-request headers (per-request wins on conflict).
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {entries.map((entry, i) => (
            <div
              key={i}
              style={{ display: "flex", gap: 4, alignItems: "center" }}
            >
              <input
                value={entry.key}
                onChange={(e) => handleChange(i, "key", e.target.value)}
                placeholder="Header name"
                style={{
                  flex: 1,
                  padding: "4px 8px",
                  fontSize: 11,
                  background: "var(--bg-primary)",
                  border: "0.5px solid var(--border-default)",
                  borderRadius: "var(--radius-md, 6px)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <input
                value={entry.value}
                onChange={(e) => handleChange(i, "value", e.target.value)}
                placeholder="Value"
                style={{
                  flex: 2,
                  padding: "4px 8px",
                  fontSize: 11,
                  background: "var(--bg-primary)",
                  border: "0.5px solid var(--border-default)",
                  borderRadius: "var(--radius-md, 6px)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                onClick={() => removeRow(i)}
                style={{
                  padding: "2px 6px",
                  fontSize: 11,
                  background: "transparent",
                  border: "0.5px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md, 6px)",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                x
              </button>
            </div>
          ))}
          <button
            onClick={addRow}
            style={{
              alignSelf: "flex-start",
              padding: "3px 10px",
              fontSize: 11,
              background: "var(--bg-secondary)",
              border: "0.5px solid var(--border-subtle)",
              borderRadius: "var(--radius-md, 6px)",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            + Add header
          </button>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 16,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "6px 14px",
              fontSize: 11,
              background: "transparent",
              border: "0.5px solid var(--border-subtle)",
              borderRadius: "var(--radius-md, 6px)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "6px 14px",
              fontSize: 11,
              fontWeight: 500,
              background: "var(--text-primary)",
              border: "0.5px solid var(--border-strong)",
              borderRadius: "var(--radius-md, 6px)",
              color: "var(--bg-primary)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
