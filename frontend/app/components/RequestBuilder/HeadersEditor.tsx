"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";

interface HeadersEditorProps {
  headers: Record<string, string>;
  onChange: (headers: Record<string, string>) => void;
}

const COMMON_HEADERS = [
  "Authorization",
  "Proxy-Authorization",
  "Content-Type",
  "Content-Length",
  "Content-Encoding",
  "Content-Language",
  "Content-Location",
  "Accept",
  "Accept-Encoding",
  "Accept-Language",
  "Accept-Charset",
  "Cache-Control",
  "Pragma",
  "If-Modified-Since",
  "If-Unmodified-Since",
  "If-Match",
  "If-None-Match",
  "Host",
  "Connection",
  "User-Agent",
  "Referer",
  "Origin",
  "Cookie",
  "Upgrade-Insecure-Requests",
  "X-Requested-With",
  "Sec-Fetch-Site",
  "Sec-Fetch-Mode",
  "Sec-Fetch-User",
  "Sec-Fetch-Dest",
  "Sec-CH-UA",
  "Sec-CH-UA-Mobile",
  "Sec-CH-UA-Platform",
];

export default function HeadersEditor({
  headers,
  onChange,
}: HeadersEditorProps) {
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [dropdownState, setDropdownState] = useState<{
    open: boolean;
    index: number;
    filter: string;
    rect: DOMRect | null;
  }>({
    open: false,
    index: -1,
    filter: "",
    rect: null,
  });

  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const entries = Object.entries(headers);
  const displayEntries = entries.length === 0 ? [["", ""]] : entries;

  const updateRow = (oldKey: string, newKey: string, value: string) => {
    const newHeaders = { ...headers };
    if (oldKey !== newKey && oldKey in newHeaders) delete newHeaders[oldKey];
    if (newKey.trim() === "") {
      delete newHeaders[oldKey];
    } else {
      newHeaders[newKey.trim()] = value;
    }
    delete newHeaders[""];

    const isRowFilled = newKey.trim() !== "" && value.trim() !== "";
    const wasEmptyRow = oldKey === "";

    if (wasEmptyRow && !isRowFilled) {
      // do nothing
    } else {
      const hasFilledRow = Object.entries(newHeaders).some(
        ([k, v]) => k.trim() !== "" && v.trim() !== "",
      );
      if (hasFilledRow) {
        newHeaders[""] = "";
      }
    }

    const hasFilledRowAfter = Object.entries(newHeaders).some(
      ([k, v]) => k.trim() !== "" && v.trim() !== "",
    );
    const hasEmptyKeyAfter = Object.keys(newHeaders).some((k) => k === "");
    if (!hasFilledRowAfter && !hasEmptyKeyAfter) {
      newHeaders[""] = "";
    }

    onChange(newHeaders);
  };

  const deleteRow = (key: string) => {
    const newHeaders = { ...headers };
    delete newHeaders[key];
    delete newHeaders[""];
    const hasFilledRow = Object.entries(newHeaders).some(
      ([k, v]) => k.trim() !== "" && v.trim() !== "",
    );
    if (hasFilledRow) {
      newHeaders[""] = "";
    } else {
      newHeaders[""] = "";
    }
    onChange(newHeaders);
  };

  const handleBulkApply = () => {
    const lines = bulkText.split("\n").filter((line) => line.trim());
    const newHeaders: Record<string, string> = {};
    for (const line of lines) {
      const [key, ...rest] = line.split("=");
      if (key && rest.length) {
        newHeaders[key.trim()] = rest.join("=").trim();
      }
    }
    const merged = { ...headers, ...newHeaders };
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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownState.open) {
        const target = e.target as Node;
        const isInsideInput = Object.values(inputRefs.current).some(
          (ref) => ref && ref.contains(target),
        );
        const isInsideDropdown = document
          .getElementById("headers-dropdown")
          ?.contains(target);
        if (!isInsideInput && !isInsideDropdown) {
          setDropdownState((prev) => ({ ...prev, open: false }));
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownState.open]);

  const handleFocus = (index: number, key: string) => {
    const input = inputRefs.current[index];
    if (input) {
      const rect = input.getBoundingClientRect();
      setDropdownState({
        open: true,
        index,
        filter: key,
        rect,
      });
    }
  };

  // Handle key input change – update parent and filter
  const handleKeyChange = (
    index: number,
    oldKey: string,
    newKey: string,
    value: string,
  ) => {
    // Update parent state
    updateRow(oldKey, newKey, value);
    // If dropdown is open for this index, update filter
    if (dropdownState.open && dropdownState.index === index) {
      setDropdownState((prev) => ({ ...prev, filter: newKey }));
    }
  };

  const selectHeader = (header: string) => {
    const { index } = dropdownState;
    if (index < 0) return;
    const row = displayEntries[index];
    const oldKey = row[0];
    const value = row[1];
    updateRow(oldKey, header, value);
    setDropdownState((prev) => ({ ...prev, open: false }));
  };

  const filteredHeaders = COMMON_HEADERS.filter((h) =>
    h.toLowerCase().includes(dropdownState.filter.toLowerCase()),
  );

  // Render portal for dropdown
  const renderDropdown = () => {
    if (!dropdownState.open || dropdownState.index < 0 || !dropdownState.rect)
      return null;
    const { rect, filter, index } = dropdownState;
    const top = rect.bottom + window.scrollY + 4;
    const left = rect.left + window.scrollX;
    const width = rect.width;

    return createPortal(
      <div
        id="headers-dropdown"
        style={{
          position: "absolute",
          top: top,
          left: left,
          width: width,
          maxHeight: "200px",
          overflowY: "auto",
          background: "#1f2937",
          border: "1px solid #374151",
          borderRadius: "0.375rem",
          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.5)",
          zIndex: 99999,
        }}
        className="bg-gray-800 border border-gray-700 rounded shadow-lg"
      >
        {filteredHeaders.map((h) => (
          <div
            key={h}
            onClick={() => selectHeader(h)}
            className="px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700 cursor-pointer"
          >
            {h}
          </div>
        ))}
      </div>,
      document.body,
    );
  };

  return (
    <div className="text-white">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-400">Headers</span>
        <button
          onClick={() => setBulkMode(!bulkMode)}
          className="text-xs text-blue-400 hover:underline"
        >
          {bulkMode ? "Cancel" : "Bulk Edit"}
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
            <div className="col-span-2 px-2 py-1 text-right">Actions</div>
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
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    value={key}
                    onChange={(e) =>
                      handleKeyChange(index, key, e.target.value, value)
                    }
                    onFocus={() => handleFocus(index, key)}
                    placeholder="Select or type header"
                    className="w-full bg-transparent border-none text-sm text-white focus:outline-none"
                  />
                </div>
                <div className="col-span-5 px-2 py-1">
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => updateRow(key, key, e.target.value)}
                    placeholder="Value"
                    className="w-full bg-transparent border-none text-sm text-white focus:outline-none"
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
      {renderDropdown()}
    </div>
  );
}
