"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  language?: "json" | "text" | "javascript" | "html" | "xml";
  minHeight?: string;
  className?: string;
}

// Dynamically import Ace editor with no SSR
const AceEditor = dynamic(
  () =>
    import("react-ace").then((mod) => {
      // Load modes and themes inside the dynamic import (client-side only)
      require("ace-builds/src-noconflict/mode-json");
      require("ace-builds/src-noconflict/mode-text");
      require("ace-builds/src-noconflict/theme-monokai");
      require("ace-builds/src-noconflict/ext-language_tools");
      return mod.default;
    }),
  { ssr: false },
);

export default function CustomCodeEditor({
  value,
  onChange,
  placeholder = "",
  language = "text",
  minHeight = "200px",
  className = "",
}: CodeEditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const languageMap: Record<string, string> = {
    json: "json",
    text: "text",
    javascript: "javascript",
    html: "html",
    xml: "xml",
  };

  if (!mounted) {
    // Return a placeholder div during SSR to avoid hydration mismatch
    return (
      <div
        style={{ minHeight }}
        className={`border border-gray-700 rounded bg-gray-900 ${className}`}
      />
    );
  }

  return (
    <div
      className={`border border-gray-700 rounded bg-gray-900 overflow-hidden ${className}`}
      style={{ minHeight }}
    >
      <AceEditor
        mode={languageMap[language] || "text"}
        theme="monokai"
        name="code-editor"
        value={value}
        onChange={(newValue) => onChange && onChange(newValue)}
        placeholder={placeholder}
        width="100%"
        height={minHeight}
        fontSize={13}
        showPrintMargin={false}
        showGutter={true}
        highlightActiveLine={true}
        setOptions={{
          enableBasicAutocompletion: true,
          enableLiveAutocompletion: true,
          enableSnippets: true,
          showLineNumbers: true,
          tabSize: 2,
          fontFamily: "monospace",
        }}
        editorProps={{ $blockScrolling: true }}
        style={{
          background: "transparent",
          color: "#d4d4d4",
        }}
      />
    </div>
  );
}
