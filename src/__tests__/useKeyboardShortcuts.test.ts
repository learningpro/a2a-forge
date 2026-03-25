import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

describe("useKeyboardShortcuts", () => {
  it("Cmd+N fires onAddAgent handler", () => {
    const onAddAgent = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onAddAgent }));

    fireEvent.keyDown(document, { key: "n", metaKey: true });

    expect(onAddAgent).toHaveBeenCalledTimes(1);
  });

  it("Ctrl+N also fires onAddAgent handler", () => {
    const onAddAgent = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onAddAgent }));

    fireEvent.keyDown(document, { key: "n", ctrlKey: true });

    expect(onAddAgent).toHaveBeenCalledTimes(1);
  });

  it("Cmd+Enter fires onRunTest handler", () => {
    const onRunTest = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onRunTest }));

    fireEvent.keyDown(document, { key: "Enter", metaKey: true });

    expect(onRunTest).toHaveBeenCalledTimes(1);
  });

  it("Cmd+Shift+C fires onCopyCurl handler", () => {
    const onCopyCurl = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onCopyCurl }));

    fireEvent.keyDown(document, { key: "C", metaKey: true, shiftKey: true });

    expect(onCopyCurl).toHaveBeenCalledTimes(1);
  });

  it("regular keys without modifier do NOT fire handlers", () => {
    const onAddAgent = vi.fn();
    const onRunTest = vi.fn();
    const onCopyCurl = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({ onAddAgent, onRunTest, onCopyCurl }),
    );

    fireEvent.keyDown(document, { key: "n" });
    fireEvent.keyDown(document, { key: "Enter" });
    fireEvent.keyDown(document, { key: "C", shiftKey: true });

    expect(onAddAgent).not.toHaveBeenCalled();
    expect(onRunTest).not.toHaveBeenCalled();
    expect(onCopyCurl).not.toHaveBeenCalled();
  });

  it("Cmd+N without shift does not fire onCopyCurl", () => {
    const onCopyCurl = vi.fn();
    const onAddAgent = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onAddAgent, onCopyCurl }));

    fireEvent.keyDown(document, { key: "n", metaKey: true });

    expect(onCopyCurl).not.toHaveBeenCalled();
  });
});
