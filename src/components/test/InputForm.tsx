import React, { Suspense, useState, useRef, useCallback } from "react";
import type { AgentSkill, AgentCard } from "../../bindings";
import { useTestStore } from "../../stores/testStore";

const MonacoWrapper = React.lazy(() => import("./MonacoWrapper").then((m) => ({ default: m.MonacoWrapper })));

interface InputFormProps {
  skill: AgentSkill;
  card: AgentCard;
}

interface HeaderEntry {
  key: string;
  value: string;
}

export function InputForm({
  skill,
  card: _card,
}: InputFormProps) {
  const inputText = useTestStore((s) => s.inputText);
  const setInputText = useTestStore((s) => s.setInputText);
  const inputTab = useTestStore((s) => s.inputTab);
  const setInputTab = useTestStore((s) => s.setInputTab);
  const setCustomHeaders = useTestStore((s) => s.setCustomHeaders);

  const [contextData, setContextData] = useState("{\n  \n}");
  const [headerEntries, setHeaderEntries] = useState<HeaderEntry[]>([
    { key: "", value: "" },
  ]);
  const [droppedFile, setDroppedFile] = useState<{ name: string; data: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasFileMode = skill.inputModes?.some((m) => m.includes("file")) ?? false;

  // Sync header entries to store
  const syncHeaders = useCallback(
    (entries: HeaderEntry[]) => {
      const h: Record<string, string> = {};
      for (const e of entries) {
        if (e.key.trim()) h[e.key.trim()] = e.value;
      }
      setCustomHeaders(h);
    },
    [setCustomHeaders]
  );

  const handleHeaderChange = (idx: number, field: "key" | "value", val: string) => {
    const next = [...headerEntries];
    next[idx] = { ...next[idx], [field]: val };
    setHeaderEntries(next);
    syncHeaders(next);
  };

  const addHeader = () => {
    const next = [...headerEntries, { key: "", value: "" }];
    setHeaderEntries(next);
  };

  const removeHeader = (idx: number) => {
    const next = headerEntries.filter((_, i) => i !== idx);
    if (next.length === 0) next.push({ key: "", value: "" });
    setHeaderEntries(next);
    syncHeaders(next);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    readFileAsBase64(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileAsBase64(file);
  };

  const readFileAsBase64 = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1] ?? "";
      setDroppedFile({ name: file.name, data: base64 });
    };
    reader.readAsDataURL(file);
  };

  const tabs: Array<{ id: "message" | "context" | "headers"; label: string }> = [
    { id: "message", label: "message" },
    { id: "context", label: "context data" },
    { id: "headers", label: "headers" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Tab row */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "0.5px solid var(--border-subtle)",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setInputTab(t.id)}
            style={{
              padding: "6px 12px",
              fontSize: 10,
              cursor: "pointer",
              color: inputTab === t.id ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: inputTab === t.id ? 500 : 400,
              background: "none",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              borderBottom: `1.5px solid ${inputTab === t.id ? "var(--text-primary)" : "transparent"}`,
              marginBottom: -0.5,
              fontFamily: "inherit",
              transition: "color 0.1s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div style={{ flex: 1, padding: "10px 14px", overflow: "hidden" }}>
        {inputTab === "message" && (
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter test message..."
            style={{
              width: "100%",
              height: "100%",
              background: "var(--bg-secondary)",
              border: "0.5px solid var(--border-subtle)",
              borderRadius: "var(--radius-md, 6px)",
              padding: "10px 12px",
              fontSize: 11,
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              color: "var(--text-primary)",
              resize: "none",
              minHeight: 80,
              lineHeight: 1.6,
              outline: "none",
            }}
          />
        )}

        {inputTab === "context" && (
          <Suspense
            fallback={
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  color: "var(--text-muted)",
                }}
              >
                Loading editor...
              </div>
            }
          >
            <MonacoWrapper value={contextData} onChange={setContextData} />
          </Suspense>
        )}

        {inputTab === "headers" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {headerEntries.map((entry, i) => (
              <div key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input
                  value={entry.key}
                  onChange={(e) => handleHeaderChange(i, "key", e.target.value)}
                  placeholder="Header name"
                  style={{
                    flex: 1,
                    padding: "4px 8px",
                    fontSize: 11,
                    background: "var(--bg-secondary)",
                    border: "0.5px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md, 6px)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  }}
                />
                <input
                  value={entry.value}
                  onChange={(e) => handleHeaderChange(i, "value", e.target.value)}
                  placeholder="Value"
                  style={{
                    flex: 2,
                    padding: "4px 8px",
                    fontSize: 11,
                    background: "var(--bg-secondary)",
                    border: "0.5px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md, 6px)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  }}
                />
                <button
                  onClick={() => removeHeader(i)}
                  style={{
                    padding: "2px 6px",
                    fontSize: 10,
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
              onClick={addHeader}
              style={{
                alignSelf: "flex-start",
                padding: "3px 10px",
                fontSize: 10,
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
        )}
      </div>

      {/* File drop zone (only when skill supports file input) */}
      {hasFileMode && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            margin: "0 14px 8px",
            padding: "12px",
            border: "1.5px dashed var(--border-default)",
            borderRadius: "var(--radius-md, 6px)",
            textAlign: "center",
            cursor: "pointer",
            fontSize: 11,
            color: "var(--text-muted)",
          }}
        >
          {droppedFile ? droppedFile.name : "Drop a file here or click to select"}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
        </div>
      )}

      {/* Examples row */}
      {skill.examples && skill.examples.length > 0 && (
        <>
          <div style={{ padding: "0 14px 4px", fontSize: 10, color: "var(--text-muted)" }}>
            Examples
          </div>
          <div
            style={{
              padding: "4px 14px 8px",
              display: "flex",
              gap: 5,
              flexWrap: "wrap",
            }}
          >
            {skill.examples.map((ex, i) => {
              const label = typeof ex === "string" ? ex : JSON.stringify(ex).slice(0, 30);
              return (
                <button
                  key={i}
                  onClick={() => {
                    const text = typeof ex === "string" ? ex : JSON.stringify(ex, null, 2);
                    setInputText(text);
                    setInputTab("message");
                  }}
                  style={{
                    fontSize: 10,
                    padding: "3px 8px",
                    borderRadius: 10,
                    background: "var(--bg-secondary)",
                    border: "0.5px solid var(--border-subtle)",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                    whiteSpace: "nowrap",
                    maxWidth: 140,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    transition: "all 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-default)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </>
      )}

    </div>
  );
}
