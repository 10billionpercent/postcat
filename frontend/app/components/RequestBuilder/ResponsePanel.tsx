"use client";

import { useState } from "react";

interface ResponseData {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  responseTime: number;
  responseSize: number;
}

interface Props {
  response: ResponseData | null;
  loading: boolean;
}

type Tab = "body" | "headers" | "cookies";

export default function ResponsePanel({ response, loading }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("body");

  if (loading) {
    return (
      <div className="border-t border-gray-800 p-4 h-48 flex items-center justify-center text-gray-500 bg-black">
        Sending request...
      </div>
    );
  }

  if (!response) {
    return (
      <div className="border-t border-gray-800 p-4 h-48 flex items-center justify-center text-gray-500 bg-black">
        Response will appear here
      </div>
    );
  }

  // Parse cookies from set-cookie header(s)
  const cookies = response.headers["set-cookie"]
    ? (Array.isArray(response.headers["set-cookie"])
        ? response.headers["set-cookie"]
        : [response.headers["set-cookie"]]
      ).map((cookieStr: string) => {
        const parts = cookieStr.split(";")[0].trim().split("=");
        return { name: parts[0], value: parts.slice(1).join("=") };
      })
    : [];

  const renderContent = () => {
    switch (activeTab) {
      case "body":
        return (
          <pre className="font-mono text-sm whitespace-pre-wrap text-gray-200">
            {response.body}
          </pre>
        );
      case "headers": {
        const headerEntries = Object.entries(response.headers);
        if (headerEntries.length === 0) {
          return (
            <div className="text-gray-500 text-sm">No headers received</div>
          );
        }
        return (
          <div className="border border-gray-700 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400">
                <tr>
                  <th className="text-left px-2 py-1 font-medium">Key</th>
                  <th className="text-left px-2 py-1 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {headerEntries.map(([key, value]) => (
                  <tr key={key} className="border-t border-gray-700">
                    <td className="px-2 py-1 text-blue-400 font-mono">{key}</td>
                    <td className="px-2 py-1 text-gray-200">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      case "cookies":
        if (cookies.length === 0) {
          return (
            <div className="text-gray-500 text-sm">No cookies received</div>
          );
        }
        return (
          <div className="border border-gray-700 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400">
                <tr>
                  <th className="text-left px-2 py-1 font-medium">Name</th>
                  <th className="text-left px-2 py-1 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {cookies.map((cookie, i) => (
                  <tr key={i} className="border-t border-gray-700">
                    <td className="px-2 py-1 text-yellow-400 font-mono">
                      {cookie.name}
                    </td>
                    <td className="px-2 py-1 text-gray-200">{cookie.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="border-t border-gray-800 flex flex-col h-48 shrink-0 bg-black">
      {/* Combined header row: tabs left, status right */}
      <div className="flex items-center justify-between px-4 py-1 bg-gray-900 border-b border-gray-800 min-h-[40px]">
        {/* Tabs */}
        <div className="flex gap-1">
          {(["body", "headers", "cookies"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`capitalize px-3 py-1 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-blue-500 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Status */}
        <div className="flex items-center gap-4 text-sm">
          <span
            className={`font-medium ${response.statusCode < 400 ? "text-green-400" : "text-red-400"}`}
          >
            {response.statusCode}
          </span>
          <span className="text-gray-400">{response.responseTime} ms</span>
          <span className="text-gray-400">{response.responseSize} B</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 bg-black">{renderContent()}</div>
    </div>
  );
}
