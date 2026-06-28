"use client";

import { useState } from "react";

interface Props {
  body: string;
  setBody: (value: string) => void;
  bodyType: string;
  setBodyType: (type: string) => void;
}

const bodyTypes = [
  { id: "none", label: "none" },
  { id: "form-data", label: "form-data" },
  { id: "x-www-form-urlencoded", label: "x-www-form-urlencoded" },
  { id: "raw", label: "raw" },
  { id: "binary", label: "binary" },
  { id: "graphql", label: "GraphQL" },
];

const rawSubTypes = ["JSON", "Text", "JavaScript", "HTML", "XML"];

export default function BodyEditor({
  body,
  setBody,
  bodyType,
  setBodyType,
}: Props) {
  const [rawSubType, setRawSubType] = useState("JSON");

  const handleBodyTypeChange = (type: string) => {
    setBodyType(type);
    if (type === "none") {
      setBody("");
    }
  };

  const renderBodyContent = () => {
    switch (bodyType) {
      case "none":
        return (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            Request body is empty
          </div>
        );
      case "form-data":
        return (
          <div className="p-2 border rounded bg-gray-900 text-gray-300 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gray-400">Key</span>
              <span className="text-gray-400 ml-4">Value</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Key"
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
              />
              <input
                type="text"
                placeholder="Value"
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
              />
              <button className="text-blue-400 hover:text-blue-300 text-sm">
                Add
              </button>
            </div>
            <div className="text-gray-500 text-xs mt-2">
              form-data editor (key-value pairs)
            </div>
          </div>
        );
      case "x-www-form-urlencoded":
        return (
          <div className="p-2 border rounded bg-gray-900 text-gray-300 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gray-400">Key</span>
              <span className="text-gray-400 ml-4">Value</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Key"
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
              />
              <input
                type="text"
                placeholder="Value"
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
              />
              <button className="text-blue-400 hover:text-blue-300 text-sm">
                Add
              </button>
            </div>
            <div className="text-gray-500 text-xs mt-2">
              x-www-form-urlencoded editor
            </div>
          </div>
        );
      case "raw":
        return (
          <div className="flex flex-col h-full">
            {/* Raw sub-type dropdown + extra controls */}
            <div className="flex items-center gap-2 mb-2 shrink-0">
              <select
                value={rawSubType}
                onChange={(e) => setRawSubType(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
              >
                {rawSubTypes.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
              <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">
                Beautify
              </span>
              <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">
                Text
              </span>
              <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">
                2
              </span>
            </div>
            {/* Editor area */}
            <div className="flex-1 flex flex-col min-h-[200px]">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={`Enter ${rawSubType.toLowerCase()} data...`}
                className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm font-mono text-gray-200 resize-none focus:outline-none focus:border-blue-500"
                style={{ minHeight: "200px" }}
              />
            </div>
          </div>
        );
      case "binary":
        return (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-400 text-sm">
            <div className="border-2 border-dashed border-gray-700 rounded p-8 text-center">
              <div className="text-blue-400 mb-2">📁</div>
              <div>Select a file or drag and drop here</div>
              <div className="text-xs text-gray-600 mt-1">
                Maximum file size: 10MB
              </div>
            </div>
          </div>
        );
      case "graphql":
        return (
          <div className="flex flex-col h-full">
            <div className="flex gap-2 mb-2 shrink-0">
              <button className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded">
                Query
              </button>
              <button className="px-3 py-1 text-xs font-medium bg-gray-800 text-gray-400 rounded">
                Variables
              </button>
              <button className="px-3 py-1 text-xs font-medium bg-gray-800 text-gray-400 rounded">
                Settings
              </button>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter GraphQL query..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm font-mono text-gray-200 resize-none focus:outline-none focus:border-blue-500"
              style={{ minHeight: "200px" }}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Body type selector */}
      <div className="flex gap-2 pb-2 border-b border-gray-800 shrink-0 overflow-x-auto">
        {bodyTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => handleBodyTypeChange(type.id)}
            className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap transition-colors ${
              bodyType === type.id
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>
      {/* Body content */}
      <div className="flex-1 pt-2 overflow-auto">{renderBodyContent()}</div>
    </div>
  );
}
