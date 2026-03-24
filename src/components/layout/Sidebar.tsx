import { useUiStore } from "../../stores/uiStore";

export function Sidebar() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);

  return (
    <aside
      style={{
        width: sidebarCollapsed ? 48 : 220,
        minWidth: sidebarCollapsed ? 48 : 220,
        background: "var(--bg-secondary)",
        borderRight: "0.5px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.15s, min-width 0.15s",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: sidebarCollapsed ? "14px 8px 10px" : "14px 14px 10px",
          borderBottom: "0.5px solid var(--border-subtle)",
        }}
      >
        {!sidebarCollapsed && (
          <>
            <div
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: "var(--text-muted)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Agents
            </div>
            <button
              style={{
                width: "100%",
                padding: "6px 10px",
                background: "var(--bg-primary)",
                border: "0.5px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: 11,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.background = "var(--bg-info)";
                el.style.color = "var(--text-info)";
                el.style.borderColor = "var(--border-info)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = "var(--bg-primary)";
                el.style.color = "var(--text-primary)";
                el.style.borderColor = "var(--border-default)";
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Add agent card
            </button>
          </>
        )}
      </div>

      {/* Agent list placeholder */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 8,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      />

      {/* Footer */}
      <div
        style={{
          padding: sidebarCollapsed ? "10px 8px" : "10px 14px",
          borderTop: "0.5px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {!sidebarCollapsed && (
          <>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Workspace</div>
            <select
              style={{
                width: "100%",
                padding: "4px 8px",
                fontSize: 11,
                background: "var(--bg-primary)",
                border: "0.5px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <option>Default</option>
            </select>
          </>
        )}
        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            fontSize: 12,
            padding: "4px 0",
            textAlign: sidebarCollapsed ? "center" : "left",
          }}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? "\u25B6" : "\u25C0"}
        </button>
      </div>
    </aside>
  );
}
