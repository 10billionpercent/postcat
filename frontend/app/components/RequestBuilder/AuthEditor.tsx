"use client";

import { useState } from "react";

interface AuthConfig {
  type: "no-auth" | "basic" | "bearer";
  username?: string;
  password?: string;
  token?: string;
}

interface AuthEditorProps {
  auth: AuthConfig | null;
  onChange: (auth: AuthConfig | null) => void;
}

export default function AuthEditor({ auth, onChange }: AuthEditorProps) {
  const [authType, setAuthType] = useState<"no-auth" | "basic" | "bearer">(
    auth?.type || "no-auth",
  );

  const handleTypeChange = (type: "no-auth" | "basic" | "bearer") => {
    setAuthType(type);
    if (type === "no-auth") {
      onChange(null);
    } else if (type === "basic") {
      onChange({ type: "basic", username: "", password: "" });
    } else if (type === "bearer") {
      onChange({ type: "bearer", token: "" });
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    if (!auth || auth.type === "no-auth") return;
    onChange({ ...auth, [field]: value });
  };

  return (
    <div className="text-white max-w-3xl">
      {/* 2‑column grid layout */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {/* Left column: Auth Type label + dropdown */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Auth Type
          </label>
          <select
            value={authType}
            onChange={(e) =>
              handleTypeChange(e.target.value as "no-auth" | "basic" | "bearer")
            }
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="no-auth">No Auth</option>
            <option value="basic">Basic Auth</option>
            <option value="bearer">Bearer Token</option>
          </select>
        </div>

        {/* Right column: dynamic content */}
        <div className="col-span-1 space-y-4">
          {authType === "no-auth" && (
            <div className="text-sm text-gray-500 py-2">
              This request does not use any authorization.
            </div>
          )}

          {authType === "basic" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={auth?.username || ""}
                  onChange={(e) =>
                    handleFieldChange("username", e.target.value)
                  }
                  placeholder="Enter username"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={auth?.password || ""}
                  onChange={(e) =>
                    handleFieldChange("password", e.target.value)
                  }
                  placeholder="Enter password"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="text-xs text-gray-500">
                The authorization header will be automatically generated when
                you send the request.{" "}
                <a href="#" className="text-blue-400 hover:underline">
                  Learn more about Basic Auth authorization
                </a>
                .
              </div>
            </>
          )}

          {authType === "bearer" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Token
                </label>
                <input
                  type="text"
                  value={auth?.token || ""}
                  onChange={(e) => handleFieldChange("token", e.target.value)}
                  placeholder="Enter token"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="text-xs text-gray-500">
                The authorization header will be automatically generated when
                you send the request.{" "}
                <a href="#" className="text-blue-400 hover:underline">
                  Learn more about Bearer Token authorization
                </a>
                .
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
