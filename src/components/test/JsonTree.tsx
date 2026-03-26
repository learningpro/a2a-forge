import { useState, useCallback, type JSX } from "react";

interface JsonTreeProps {
  value: unknown;
  indent?: number;
  defaultCollapsed?: boolean;
}

const INDENT_PX = 16;
const AUTO_COLLAPSE_DEPTH = 3;

export function JsonTree({
  value,
  indent = 0,
  defaultCollapsed,
}: JsonTreeProps) {
  return (
    <pre
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        lineHeight: 1.7,
        margin: 0,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      <JsonNode value={value} depth={0} indent={indent} defaultCollapsed={defaultCollapsed} />
    </pre>
  );
}

interface JsonNodeProps {
  value: unknown;
  depth: number;
  indent: number;
  defaultCollapsed?: boolean;
  isLast?: boolean;
}

function JsonNode({ value, depth, indent, defaultCollapsed, isLast = true }: JsonNodeProps) {
  const comma = isLast ? "" : ",";

  if (value === null) {
    return <><span className="json-null">null</span>{comma}{"\n"}</>;
  }

  if (typeof value === "boolean") {
    return <><span className="json-bool">{String(value)}</span>{comma}{"\n"}</>;
  }

  if (typeof value === "number") {
    return <><span className="json-num">{String(value)}</span>{comma}{"\n"}</>;
  }

  if (typeof value === "string") {
    return <><span className="json-str">{`"${escapeString(value)}"`}</span>{comma}{"\n"}</>;
  }

  if (Array.isArray(value)) {
    return (
      <CollapsibleNode
        type="array"
        entries={value.map((v, i) => [String(i), v])}
        depth={depth}
        indent={indent}
        defaultCollapsed={defaultCollapsed}
        isLast={isLast}
      />
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <CollapsibleNode
        type="object"
        entries={entries}
        depth={depth}
        indent={indent}
        defaultCollapsed={defaultCollapsed}
        isLast={isLast}
      />
    );
  }

  // Fallback for undefined / functions etc
  return <><span className="json-null">{String(value)}</span>{comma}{"\n"}</>;
}

interface CollapsibleNodeProps {
  type: "object" | "array";
  entries: [string, unknown][];
  depth: number;
  indent: number;
  defaultCollapsed?: boolean;
  isLast: boolean;
}

function CollapsibleNode({
  type,
  entries,
  depth,
  indent,
  defaultCollapsed,
  isLast,
}: CollapsibleNodeProps) {
  const shouldCollapse = defaultCollapsed ?? depth >= AUTO_COLLAPSE_DEPTH;
  const [collapsed, setCollapsed] = useState(shouldCollapse);
  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  const open = type === "array" ? "[" : "{";
  const close = type === "array" ? "]" : "}";
  const comma = isLast ? "" : ",";
  const childIndent = indent + depth + 1;
  const padStr = pad(childIndent);
  const closePad = pad(indent + depth);

  if (entries.length === 0) {
    return <>{open}{close}{comma}{"\n"}</>;
  }

  if (collapsed) {
    const badge = type === "array" ? entries.length : Object.keys(entries).length;
    return (
      <>
        <Chevron collapsed onClick={toggle} />
        {open}
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
          {" "}{badge} {type === "array" ? (badge === 1 ? "item" : "items") : (badge === 1 ? "key" : "keys")}{" "}
        </span>
        {close}{comma}{"\n"}
      </>
    );
  }

  const children: JSX.Element[] = [];
  entries.forEach(([key, val], i) => {
    const last = i === entries.length - 1;
    if (type === "object") {
      children.push(
        <span key={key + "-" + i}>
          {padStr}
          <span className="json-key">{`"${escapeString(key)}"`}</span>
          {": "}
          <JsonNode value={val} depth={depth + 1} indent={indent} defaultCollapsed={defaultCollapsed} isLast={last} />
        </span>
      );
    } else {
      children.push(
        <span key={i}>
          {padStr}
          <JsonNode value={val} depth={depth + 1} indent={indent} defaultCollapsed={defaultCollapsed} isLast={last} />
        </span>
      );
    }
  });

  return (
    <>
      <Chevron collapsed={false} onClick={toggle} />
      {open}{"\n"}
      {children}
      {closePad}{close}{comma}{"\n"}
    </>
  );
}

function Chevron({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  return (
    <span
      onClick={onClick}
      style={{
        cursor: "pointer",
        display: "inline-block",
        width: 14,
        textAlign: "center",
        userSelect: "none",
        color: "var(--text-muted)",
        fontSize: 11,
      }}
      role="button"
      aria-label={collapsed ? "expand" : "collapse"}
    >
      {collapsed ? "\u25B6" : "\u25BC"}
    </span>
  );
}

function pad(level: number): string {
  if (level <= 0) return "";
  return " ".repeat(level * (INDENT_PX / 4)); // 4 spaces per indent level
}

function escapeString(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}
