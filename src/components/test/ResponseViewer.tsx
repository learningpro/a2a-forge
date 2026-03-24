import { useTestStore } from "../../stores/testStore";
import { TaskStatus } from "./TaskStatus";
import { JsonTree } from "./JsonTree";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

type A2APart = {
  type?: string;
  text?: string;
  mimeType?: string;
  data?: unknown;
  file?: {
    name?: string;
    mimeType?: string;
    bytes?: string; // base64
  };
};

type A2AMessage = {
  role?: string;
  parts?: A2APart[];
};

function extractParts(result: unknown): { message: A2AMessage | null; raw: unknown } {
  if (!result || typeof result !== "object") return { message: null, raw: result };
  const r = result as Record<string, unknown>;

  // A2A response: result.result.message.parts or result.message.parts
  const inner = (r.result as Record<string, unknown>) ?? r;
  const message = inner.message as A2AMessage | undefined;

  return { message: message ?? null, raw: result };
}

export function ResponseViewer() {
  const { result, status, latencyMs, chunks, responseTab, setResponseTab, taskId } =
    useTestStore();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Status bar */}
      <div
        style={{
          padding: "7px 14px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: "0.5px solid var(--border-subtle)",
        }}
      >
        <TaskStatus status={status} latencyMs={latencyMs} />
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 0 }}>
          <TabButton
            label="rendered"
            active={responseTab === "rendered"}
            onClick={() => setResponseTab("rendered")}
          />
          <TabButton
            label="raw json"
            active={responseTab === "raw"}
            onClick={() => setResponseTab("raw")}
          />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {taskId && (
          <div
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              padding: "2px 0",
            }}
          >
            task_id: {taskId}
          </div>
        )}

        {status === "idle" && !result && chunks.length === 0 && (
          <EmptyState />
        )}

        {status === "running" && chunks.length > 0 && (
          <StreamingView chunks={chunks} />
        )}

        {result != null && responseTab === "rendered" && (
          <RenderedView result={result} />
        )}

        {result != null && responseTab === "raw" && (
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "0.5px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "10px 12px",
              overflow: "auto",
            }}
          >
            <JsonTree value={result} />
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
        fontSize: 12,
      }}
    >
      Run a test to see results here
    </div>
  );
}

function RenderedView({ result }: { result: unknown }) {
  const { message } = extractParts(result);

  if (!message?.parts || message.parts.length === 0) {
    // Fallback: show raw as JSON tree
    return (
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "0.5px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "10px 12px",
        }}
      >
        <JsonTree value={result} />
      </div>
    );
  }

  return (
    <>
      {message.parts.map((part, i) => (
        <PartBubble key={i} part={part} index={i} role={message.role} />
      ))}
    </>
  );
}

function PartBubble({
  part,
  index,
  role,
}: {
  part: A2APart;
  index: number;
  role?: string;
}) {
  const partType = part.type ?? "text";
  const mimeType = part.mimeType ?? (partType === "text" ? "text/plain" : "");
  const label = `${role ?? "agent"} \u00B7 part[${index}] \u00B7 ${mimeType}`;

  return (
    <div
      style={{
        padding: "10px 12px",
        background: "var(--bg-secondary)",
        borderRadius: "var(--radius-md)",
        border: "0.5px solid var(--border-subtle)",
      }}
    >
      <div
        style={{
          fontSize: 9,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--text-muted)",
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-primary)", lineHeight: 1.6 }}>
        {partType === "text" && part.text != null && (
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {part.text}
          </ReactMarkdown>
        )}
        {partType === "file" && part.file && <FileDownload file={part.file} />}
        {partType === "data" && part.data != null && <JsonTree value={part.data} />}
      </div>
    </div>
  );
}

function FileDownload({ file }: { file: { name?: string; mimeType?: string; bytes?: string } }) {
  const handleDownload = () => {
    if (!file.bytes) return;
    try {
      const binary = atob(file.bytes);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: file.mimeType ?? "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name ?? "download";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore decode failures
    }
  };

  return (
    <button
      onClick={handleDownload}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        fontSize: 11,
        background: "var(--bg-info)",
        color: "var(--text-info)",
        border: "0.5px solid var(--border-info)",
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        fontFamily: "var(--font-mono)",
      }}
    >
      {file.name ?? "file"} \u2193
    </button>
  );
}

function StreamingView({ chunks }: { chunks: { raw: unknown; status?: { state: string; message?: string } }[] }) {
  return (
    <>
      {chunks.map((chunk, i) => (
        <div
          key={i}
          style={{
            padding: "6px 10px",
            background: "var(--bg-secondary)",
            borderRadius: "var(--radius-md)",
            border: "0.5px solid var(--border-subtle)",
            fontSize: 10,
            fontFamily: "var(--font-mono)",
          }}
        >
          {chunk.status && (
            <div style={{ color: "var(--text-secondary)", marginBottom: 2 }}>
              {chunk.status.state}{chunk.status.message ? `: ${chunk.status.message}` : ""}
            </div>
          )}
          {chunk.raw != null && typeof chunk.raw === "object" && (
            <JsonTree value={chunk.raw} defaultCollapsed />
          )}
        </div>
      ))}
    </>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 12px",
        fontSize: 10,
        cursor: "pointer",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        borderBottom: active ? "1.5px solid var(--text-primary)" : "1.5px solid transparent",
        fontWeight: active ? 500 : 400,
        background: "none",
        border: "none",
        borderBottomStyle: "solid",
        borderBottomWidth: "1.5px",
        borderBottomColor: active ? "var(--text-primary)" : "transparent",
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}
