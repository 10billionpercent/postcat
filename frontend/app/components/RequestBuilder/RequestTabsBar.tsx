"use client";

import { X } from "lucide-react";

interface RequestTab {
  id: string;
  method: string;
  url: string;
  name?: string;
}

interface Props {
  tabs: RequestTab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
}

const methodColors: Record<string, string> = {
  GET: "text-green-400",
  POST: "text-blue-400",
  PUT: "text-yellow-400",
  PATCH: "text-purple-400",
  DELETE: "text-red-400",
  HEAD: "text-gray-400",
  OPTIONS: "text-gray-400",
};

export default function RequestTabsBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
}: Props) {
  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center gap-0.5 px-2 pt-1 bg-black w-full">
      {tabs.map((tab) => {
        const isActive = activeTabId === tab.id;
        const methodColor = methodColors[tab.method] || "text-gray-400";
        const displayName = tab.name || tab.url;

        return (
          <div
            key={tab.id}
            className={`group flex items-center gap-1 px-2 py-1.5 rounded-t text-xs cursor-pointer transition-colors flex-shrink-1 min-w-[40px] overflow-hidden ${
              isActive
                ? "bg-gray-800 text-white"
                : "text-gray-400 hover:bg-gray-900 hover:text-white"
            }`}
            onClick={() => onSelectTab(tab.id)}
          >
            <span
              className={`font-mono font-semibold ${methodColor} flex-shrink-0`}
            >
              {tab.method}
            </span>
            <span className="truncate min-w-0 flex-1">{displayName}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              className="opacity-0 group-hover:opacity-100 hover:bg-gray-700 rounded p-0.5 transition-opacity flex-shrink-0"
            >
              <X className="w-3 h-3 text-gray-400 hover:text-white" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
