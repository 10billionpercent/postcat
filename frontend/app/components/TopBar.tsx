"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";
import { getEnvironments, Environment } from "../lib/apiClient";

interface Props {
  selectedEnvironmentId: number | null;
  onEnvironmentChange: (id: number | null) => void;
}

export default function TopBar({
  selectedEnvironmentId,
  onEnvironmentChange,
}: Props) {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch environments on mount
  useEffect(() => {
    const fetchEnvironments = async () => {
      setLoading(true);
      try {
        const data = await getEnvironments();
        setEnvironments(data);
        // If none selected and we have environments, select the first one
        if (selectedEnvironmentId === null && data.length > 0) {
          onEnvironmentChange(data[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch environments", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEnvironments();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedEnv = environments.find((e) => e.id === selectedEnvironmentId);
  const displayLabel = selectedEnv ? selectedEnv.name : "No environment";

  const handleSelect = (id: number) => {
    onEnvironmentChange(id);
    setIsOpen(false);
  };

  const handleClear = () => {
    onEnvironmentChange(null);
    setIsOpen(false);
  };

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-black shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-lg text-white">Postcat</span>
        <span className="text-sm text-gray-400">Default workspace</span>
      </div>
      <div className="flex items-center gap-2">
        <button className="px-3 py-1 text-sm text-gray-300 border border-gray-700 rounded hover:bg-gray-900">
          Invite
        </button>
        <button className="px-3 py-1 text-sm text-gray-300 border border-gray-700 rounded hover:bg-gray-900">
          Upgrade
        </button>
        <button className="px-3 py-1 text-sm text-gray-300 border border-gray-700 rounded hover:bg-gray-900">
          Share
        </button>

        {/* Environment Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center gap-1 px-3 py-1 text-sm rounded border ${
              selectedEnvironmentId !== null
                ? "text-blue-400 border-blue-600 hover:bg-gray-900"
                : "text-gray-500 border-gray-700 hover:bg-gray-900"
            }`}
          >
            <span>{displayLabel}</span>
            <ChevronDown
              className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-gray-900 border border-gray-700 rounded shadow-lg z-50 py-1">
              {loading ? (
                <div className="px-3 py-2 text-xs text-gray-500">
                  Loading...
                </div>
              ) : environments.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-500">
                  No environments
                </div>
              ) : (
                <>
                  {environments.map((env) => (
                    <button
                      key={env.id}
                      onClick={() => handleSelect(env.id)}
                      className="flex items-center justify-between w-full px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 text-left"
                    >
                      <span>{env.name}</span>
                      {selectedEnvironmentId === env.id && (
                        <Check className="w-3 h-3 text-blue-400" />
                      )}
                    </button>
                  ))}
                  <div className="border-t border-gray-700 my-1" />
                  <button
                    onClick={handleClear}
                    className="w-full px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-800 text-left"
                  >
                    No environment
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
