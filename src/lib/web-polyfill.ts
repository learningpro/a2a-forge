/**
 * Web mode polyfill — must be imported FIRST in main.tsx.
 *
 * When real Tauri is absent, injects a fake `__TAURI_INTERNALS__`
 * so that bindings.ts and all command wrappers work unchanged.
 * In Tauri mode this file is a no-op.
 */

if (typeof window !== "undefined" && !(window as any).__TAURI_INTERNALS__) {
  (window as any).__WEB_MODE__ = true;

  // Callback registry for Channel support
  const callbacks = new Map<number, Function>();
  let nextId = 1;

  let backendPromise: Promise<{ handleInvoke: (cmd: string, args: Record<string, unknown>) => Promise<unknown> }> | null = null;

  function getBackend() {
    if (!backendPromise) {
      backendPromise = import("./web-backend");
    }
    return backendPromise;
  }

  (window as any).__TAURI_INTERNALS__ = {
    __callbacks: callbacks,

    async invoke(cmd: string, args?: Record<string, unknown>, _options?: unknown): Promise<unknown> {
      const backend = await getBackend();
      return backend.handleInvoke(cmd, args ?? {});
    },

    transformCallback(cb: Function, once?: boolean): number {
      const id = nextId++;
      if (once) {
        callbacks.set(id, (...a: unknown[]) => {
          callbacks.delete(id);
          return cb(...a);
        });
      } else {
        callbacks.set(id, cb);
      }
      return id;
    },

    unregisterCallback(id: number): void {
      callbacks.delete(id);
    },

    convertFileSrc(_path: string, _protocol?: string): string {
      return "";
    },
  };

  console.log(
    "%c[A2A Forge] Web mode active — using localStorage + direct fetch",
    "color: #2563eb; font-weight: bold",
  );
}
