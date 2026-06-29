"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

interface ParamsEditorProps {
  params: Record<string, string>;
  onChange: (params: Record<string, string>) => void;
}

export default function ParamsEditor({ params, onChange }: ParamsEditorProps) {
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const entries = Object.entries(params);
  const displayEntries = entries.length === 0 ? [["", ""]] : entries;

  const updateRow = (oldKey: string, newKey: string, value: string) => {
    const newParams = { ...params };

    // Remove old key if it exists and is different from newKey
    if (oldKey !== newKey && oldKey in newParams) {
      delete newParams[oldKey];
    }

    // If newKey is empty, delete the entry
    if (newKey.trim() === "") {
      delete newParams[oldKey];
    } else {
      newParams[newKey.trim()] = value;
    }

    // Remove any leftover empty key (always strip it first)
    delete newParams[""];

    const isRowFilled = newKey.trim() !== "" && value.trim() !== "";
    const wasEmptyRow = oldKey === "";

    // If the user was editing the empty row and it's NOT yet filled, don't add a new empty row.
    if (wasEmptyRow && !isRowFilled) {
      // Do nothing – the empty row is being edited, so we keep it gone.
    } else {
      // Otherwise, ensure there's exactly one empty row if there is at least one filled row.
      const hasFilledRow = Object.entries(newParams).some(
        ([k, v]) => k.trim() !== "" && v.trim() !== "",
      );
      // Only add an empty row if there is at least one filled row
      if (hasFilledRow) {
        newParams[""] = "";
      }
    }

    // If there are no filled rows and no empty row, add one empty row.
    const hasFilledRowAfter = Object.entries(newParams).some(
      ([k, v]) => k.trim() !== "" && v.trim() !== "",
    );
    const hasEmptyKeyAfter = Object.keys(newParams).some((k) => k === "");
    if (!hasFilledRowAfter && !hasEmptyKeyAfter) {
      newParams[""] = "";
    }

    onChange(newParams);
  };

  const deleteRow = (key: string) => {
    const newParams = { ...params };
    delete newParams[key];
    delete newParams[""];
    const hasFilledRow = Object.entries(newParams).some(
      ([k, v]) => k.trim() !== "" && v.trim() !== "",
    );
    if (hasFilledRow) {
      newParams[""] = "";
    } else {
      newParams[""] = "";
    }
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
    // Merge with existing
    const merged = { ...params, ...newParams };
    delete merged[""];
    const hasFilledRow = Object.entries(merged).some(
      ([k, v]) => k.trim() !== "" && v.trim() !== "",
    );
    if (hasFilledRow) {
      merged[""] = "";
    }
    onChange(merged);
    setBulkText("");
    setBulkMode(false);
  };

  return (
    <div className="text-white">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-400">Query Params</span>
        <button
          onClick={() => setBulkMode(!bulkMode)}
          className="text-xs text-blue-400 hover:underline"
        >
          {bulkMode ? "Key Value Edit" : "Bulk Edit"}
        </button>
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
          </div>
          {displayEntries.map(([key, value], index) => {
            const isFilled = key.trim() !== "" && value.trim() !== "";
            return (
              <div
                key={index}
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
                  {isFilled && (
                    <button
                      onClick={() => deleteRow(key)}
                      className="text-gray-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
