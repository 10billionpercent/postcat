"use client";

import { useState, useRef, useEffect } from "react";
import { Trash2, Plus } from "lucide-react";
import {
  createEnvironment,
  createVariable,
  updateVariable,
  deleteVariable,
  updateEnvironment,
} from "../../lib/apiClient";

interface VariableItem {
  id?: number;
  key: string;
  value: string;
}

interface EnvironmentEditorProps {
  environmentId?: number;
  initialName: string;
  initialVariables: VariableItem[];
  onSave: (id: number, name: string) => void;
  onCancel: () => void;
}

export default function EnvironmentEditor({
  environmentId,
  initialName,
  initialVariables,
  onSave,
  onCancel,
}: EnvironmentEditorProps) {
  const [name, setName] = useState(initialName);
  // Initialize variables, ensuring there is always an empty row for existing envs
  const [variables, setVariables] = useState<VariableItem[]>(() => {
    const initial =
      initialVariables.length > 0 ? initialVariables : [{ key: "", value: "" }];
    // If editing an existing environment, ensure there is at least one empty row
    if (environmentId !== undefined) {
      const hasEmptyRow = initial.some((v) => v.key === "" && v.value === "");
      if (!hasEmptyRow) {
        return [...initial, { key: "", value: "" }];
      }
    }
    return initial;
  });

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(initialName);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Handle name change (inline edit)
  const handleNameSave = async () => {
    const newName = tempName.trim() || "New Environment";
    if (newName === name) {
      setIsEditingName(false);
      return;
    }
    setName(newName);
    setIsEditingName(false);
  };

  // Remove a variable
  const removeVariable = async (index: number) => {
    const varToRemove = variables[index];
    if (!varToRemove) return; // safety check

    if (varToRemove.id) {
      try {
        await deleteVariable(varToRemove.id);
      } catch (err) {
        setError("Failed to delete variable");
        console.error(err);
        return;
      }
    }

    // Remove the variable from state
    const newVars = variables.filter((_, i) => i !== index);
    // Ensure there is at least one row (empty if needed)
    if (newVars.length === 0) {
      newVars.push({ key: "", value: "" });
    }
    setVariables(newVars);
  };

  // Update variable locally, and auto-add empty row when current row becomes filled
  const updateVariable = (
    index: number,
    field: "key" | "value",
    val: string,
  ) => {
    // Guard: if index is out of bounds, ignore
    if (index < 0 || index >= variables.length) return;

    const newVars = [...variables];
    newVars[index][field] = val;

    // Check if the current row is now filled
    const row = newVars[index];
    const isFilled = row.key.trim() !== "" && row.value.trim() !== "";

    if (isFilled) {
      // Check if there is already an empty row at the end
      const lastRow = newVars[newVars.length - 1];
      const hasEmptyRow = lastRow.key === "" && lastRow.value === "";
      if (!hasEmptyRow) {
        newVars.push({ key: "", value: "" });
      }
    }

    setVariables(newVars);
  };

  // Save all changes (name + variables)
  const handleSaveAll = async () => {
    if (!name.trim()) {
      setError("Environment name is required");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      let envId = environmentId;

      // 1. Create or update environment
      if (!envId) {
        const env = await createEnvironment(name.trim());
        envId = env.id;
      } else if (name !== initialName) {
        await updateEnvironment(envId, name.trim());
      }

      // 2. Save all variables (create/update)
      for (const v of variables) {
        if (v.key.trim() && v.value.trim()) {
          if (v.id) {
            await updateVariable(v.id, v.key.trim(), v.value.trim());
          } else {
            await createVariable(envId!, v.key.trim(), v.value.trim());
          }
        }
      }

      // 3. Call parent to refresh sidebar and close tab
      onSave(envId!, name.trim());
    } catch (err) {
      setError("Failed to save environment");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 text-white">
      {/* Header: Name + Save button */}
      <div className="mb-4 flex items-center gap-2">
        {isEditingName ? (
          <input
            ref={nameInputRef}
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleNameSave();
              }
              if (e.key === "Escape") {
                setTempName(name);
                setIsEditingName(false);
              }
            }}
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-lg font-semibold text-white focus:outline-none focus:border-blue-500"
          />
        ) : (
          <h2
            className="text-lg font-semibold cursor-pointer hover:bg-gray-800 px-2 py-1 rounded"
            onClick={() => {
              setTempName(name);
              setIsEditingName(true);
            }}
          >
            {name}
          </h2>
        )}
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 text-sm text-gray-400 hover:text-white border border-gray-700 rounded"
        >
          Cancel
        </button>
        {error && <span className="text-red-400 text-sm ml-2">{error}</span>}
      </div>

      {/* Variables table */}
      <div className="border border-gray-700 rounded overflow-hidden">
        <div className="grid grid-cols-12 bg-gray-900 text-xs text-gray-400 border-b border-gray-700">
          <div className="col-span-5 px-2 py-1">Key</div>
          <div className="col-span-5 px-2 py-1">Value</div>
          <div className="col-span-2 px-2 py-1 text-right">Actions</div>
        </div>
        {variables.map((v, idx) => {
          const isFilled = v.key.trim() !== "" && v.value.trim() !== "";
          return (
            <div
              key={idx}
              className="grid grid-cols-12 border-b border-gray-800 last:border-0"
            >
              <div className="col-span-5 px-2 py-1">
                <input
                  type="text"
                  value={v.key}
                  onChange={(e) => updateVariable(idx, "key", e.target.value)}
                  className="w-full bg-transparent border-none text-sm text-white focus:outline-none"
                  placeholder="Key"
                />
              </div>
              <div className="col-span-5 px-2 py-1">
                <input
                  type="text"
                  value={v.value}
                  onChange={(e) => updateVariable(idx, "value", e.target.value)}
                  className="w-full bg-transparent border-none text-sm text-white focus:outline-none"
                  placeholder="Value"
                />
              </div>
              <div className="col-span-2 px-2 py-1 flex justify-end">
                {isFilled && (
                  <button
                    onClick={() => removeVariable(idx)}
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
    </div>
  );
}
