"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { createEnvironment, createVariable } from "../lib/apiClient";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateEnvironmentModal({
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [name, setName] = useState("");
  const [variables, setVariables] = useState<{ key: string; value: string }[]>([
    { key: "", value: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addVariable = () => {
    setVariables([...variables, { key: "", value: "" }]);
  };

  const removeVariable = (index: number) => {
    if (variables.length === 1) return;
    setVariables(variables.filter((_, i) => i !== index));
  };

  const updateVariable = (
    index: number,
    field: "key" | "value",
    val: string,
  ) => {
    const newVars = [...variables];
    newVars[index][field] = val;
    setVariables(newVars);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Environment name is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const env = await createEnvironment(name.trim());
      // Add variables one by one
      for (const v of variables) {
        if (v.key.trim() && v.value.trim()) {
          await createVariable(env.id, v.key.trim(), v.value.trim());
        }
      }
      onSuccess();
      onClose();
      // Reset form
      setName("");
      setVariables([{ key: "", value: "" }]);
    } catch (err) {
      setError("Failed to create environment");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl w-[500px] max-w-full p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">New Environment</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter environment name"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Variables */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">
                Variables
              </label>
              <button
                onClick={addVariable}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add variable
              </button>
            </div>
            <div className="space-y-2">
              {variables.map((v, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={v.key}
                    onChange={(e) => updateVariable(idx, "key", e.target.value)}
                    placeholder="Key"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={v.value}
                    onChange={(e) =>
                      updateVariable(idx, "value", e.target.value)
                    }
                    placeholder="Value"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => removeVariable(idx)}
                    className="text-gray-500 hover:text-red-400 disabled:opacity-50"
                    disabled={variables.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && <div className="text-sm text-red-400">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white border border-gray-700 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
