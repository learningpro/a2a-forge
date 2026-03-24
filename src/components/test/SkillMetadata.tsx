import type { AgentSkill } from "../../bindings";

interface SkillMetadataProps {
  skill: AgentSkill;
  onExampleClick?: (example: unknown) => void;
}

export function SkillMetadata({ skill, onExampleClick }: SkillMetadataProps) {
  const renderModePills = (modes: string[] | null, label: string) => {
    if (!modes || modes.length === 0) return null;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{label}:</span>
        {modes.map((mode) => {
          const modeClass =
            mode.includes("text") ? "mode-text" :
            mode.includes("file") ? "mode-file" :
            "mode-data";
          return (
            <span
              key={mode}
              className={modeClass}
              style={{
                fontSize: 9,
                padding: "1px 6px",
                borderRadius: 10,
                fontWeight: 500,
              }}
            >
              {mode}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {/* Skill name */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--text-primary)",
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
        }}
      >
        {skill.name}
      </div>

      {/* Skill id */}
      <div
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
        }}
      >
        {skill.id}
      </div>

      {/* Description */}
      {skill.description && (
        <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
          {skill.description}
        </p>
      )}

      {/* Modes */}
      <div style={{ display: "flex", gap: 12, marginTop: 2 }}>
        {renderModePills(skill.inputModes, "in")}
        {renderModePills(skill.outputModes, "out")}
      </div>

      {/* Examples */}
      {skill.examples && skill.examples.length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 2 }}>
          {skill.examples.map((example, i) => (
            <button
              key={i}
              onClick={() => onExampleClick?.(example)}
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
              }}
            >
              {typeof example === "string" ? example : JSON.stringify(example).slice(0, 30)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
