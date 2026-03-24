export function TestPanel() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-primary)",
        minWidth: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px 10px",
          borderBottom: "0.5px solid var(--border-subtle)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            No skill selected
          </div>
        </div>
      </div>

      {/* Body: input + output columns */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Input column */}
        <div
          className="input-col"
          style={{
            width: "50%",
            borderRight: "0.5px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              Select a skill to begin testing
            </div>
          </div>
        </div>

        {/* Output column */}
        <div
          className="output-col"
          style={{
            width: "50%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              Results will appear here
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
