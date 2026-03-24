interface SkillPanelProps {
  width: number;
}

export function SkillPanel({ width }: SkillPanelProps) {
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
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 2,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>No agent selected</span>
        </div>
        <input
          placeholder="Search skills..."
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
          }}
        />
      </div>

      {/* Filter chips */}
      <div style={{ padding: "6px 14px 8px", display: "flex", gap: 4 }}>
        {["All", "text", "file", "data"].map((label) => (
          <button
            key={label}
            style={{
              fontSize: 10,
              padding: "2px 7px",
              borderRadius: 10,
              border: "0.5px solid var(--border-subtle)",
              background: label === "All" ? "var(--bg-info)" : "transparent",
              color: label === "All" ? "var(--text-info)" : "var(--text-secondary)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Skill list placeholder */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "6px 8px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
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
      </div>
    </div>
  );
}
