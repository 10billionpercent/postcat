"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

interface ParamsEditorProps {
  params: Record<string, string>;
  onChange: (params: Record<string, string>) => void;
}

export default function ParamsEditor({ params, onChange }: ParamsEditorProps) {
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const entries = Object.entries(params);

  const addRow = () => {
    onChange({ ...params, "": "" });
  };

  const updateRow = (oldKey: string, newKey: string, value: string) => {
    const newParams = { ...params };
    delete newParams[oldKey];
    if (newKey.trim()) {
      newParams[newKey.trim()] = value;
    }
    onChange(newParams);
  };

  const deleteRow = (key: string) => {
    const newParams = { ...params };
    delete newParams[key];
    onChange(newParams);
  };

  const handleBulkApply = () => {
    const lines = bulkText.split("\n").filter((line) => line.trim());
    const newParams: Record<string, string> = {};
    for (const line of lines) {
      const [key, ...rest] = line.split("=");
      if (key && rest.length) {
        newParams[key.trim()] = rest.join("=").trim();
      }
    }
    onChange({ ...params, ...newParams });
    setBulkText("");
    setBulkMode(false);
  };

  return (
    <div className="text-white">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-400">Query Params</span>
        <div className="flex gap-2">
          <button
            onClick={() => setBulkMode(!bulkMode)}
            className="text-xs text-blue-400 hover:underline"
          >
            {bulkMode ? "Cancel" : "Bulk Edit"}
          </button>
          <button
            onClick={addRow}
            className="text-xs text-blue-400 hover:underline flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      </div>

      {bulkMode ? (
        <div className="space-y-2">
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder="key1=value1&#10;key2=value2"
            className="w-full h-32 bg-gray-900 border border-gray-700 rounded p-2 text-sm font-mono text-white resize-none focus:outline-none focus:border-blue-500"
          />
          <div className="flex justify-end">
            <button
              onClick={handleBulkApply}
              className="px-3 py-1 text-sm bg-blue-600 rounded hover:bg-blue-700"
            >
              Apply
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-gray-700 rounded overflow-hidden">
          <div className="grid grid-cols-12 bg-gray-900 text-xs text-gray-400 border-b border-gray-700">
            <div className="col-span-5 px-2 py-1">Key</div>
            <div className="col-span-5 px-2 py-1">Value</div>
            <div className="col-span-2 px-2 py-1 text-right">Actions</div>
          </div>
          {entries.length === 0 ? (
            <div className="text-sm text-gray-500 p-4 text-center">
              No query parameters
            </div>
          ) : (
            entries.map(([key, value]) => (
              <div
                key={key}
                className="grid grid-cols-12 border-b border-gray-800 last:border-0"
              >
                <div className="col-span-5 px-2 py-1">
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => updateRow(key, e.target.value, value)}
                    className="w-full bg-transparent border-none text-sm text-white focus:outline-none"
                    placeholder="Key"
                  />
                </div>
                <div className="col-span-5 px-2 py-1">
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => updateRow(key, key, e.target.value)}
                    className="w-full bg-transparent border-none text-sm text-white focus:outline-none"
                    placeholder="Value"
                  />
                </div>
                <div className="col-span-2 px-2 py-1 flex justify-end">
                  <button
                    onClick={() => deleteRow(key)}
                    className="text-gray-500 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
