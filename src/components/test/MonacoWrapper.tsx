import Editor from "@monaco-editor/react";
import loader from "@monaco-editor/loader";
import * as monaco from "monaco-editor";

// Bundle Monaco locally — no CDN dependency
loader.config({ monaco });

interface MonacoWrapperProps {
  value: string;
  onChange: (v: string) => void;
  theme?: "vs" | "vs-dark";
}

export function MonacoWrapper({ value, onChange, theme = "vs" }: MonacoWrapperProps) {
  return (
    <Editor
      height="100%"
      language="json"
      value={value}
      theme={theme}
      onChange={(v) => onChange(v ?? "")}
      options={{
        minimap: { enabled: false },
        fontSize: 12,
        lineNumbers: "off",
        scrollBeyondLastLine: false,
      }}
    />
  );
}
