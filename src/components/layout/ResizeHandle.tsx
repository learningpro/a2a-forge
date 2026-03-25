import { useCallback, useRef } from "react";

interface ResizeHandleProps {
  onResize: (deltaX: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}

export function ResizeHandle({ onResize, onResizeStart, onResizeEnd }: ResizeHandleProps) {
  const startX = useRef(0);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      startX.current = e.clientX;
      e.currentTarget.setPointerCapture(e.pointerId);
      onResizeStart?.();
    },
    [onResizeStart]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      const delta = e.clientX - startX.current;
      startX.current = e.clientX;
      onResize(delta);
    },
    [onResize]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.releasePointerCapture(e.pointerId);
      onResizeEnd?.();
    },
    [onResizeEnd]
  );

  return (
    <div
      style={{
        width: 6,
        cursor: "col-resize",
        background: "transparent",
        flexShrink: 0,
        position: "relative",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 2,
          width: 2,
          background: "var(--border-subtle)",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = "var(--border-default)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = "var(--border-subtle)";
        }}
      />
    </div>
  );
}
