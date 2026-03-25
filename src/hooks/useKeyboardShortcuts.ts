import { useEffect } from "react";

interface ShortcutHandlers {
  onAddAgent?: () => void;
  onRunTest?: () => void;
  onCopyCurl?: () => void;
}

/**
 * Global keyboard shortcuts:
 *  - Cmd/Ctrl+N  -> onAddAgent
 *  - Cmd/Ctrl+Enter -> onRunTest
 *  - Cmd/Ctrl+Shift+C -> onCopyCurl
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === "n" && !e.shiftKey) {
        e.preventDefault();
        handlers.onAddAgent?.();
        return;
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handlers.onRunTest?.();
        return;
      }

      if ((e.key === "c" || e.key === "C") && e.shiftKey) {
        e.preventDefault();
        handlers.onCopyCurl?.();
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handlers]);
}
