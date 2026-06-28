"use client";

import { useReducer, useEffect } from "react";
import { X, Folder, Loader2 } from "lucide-react";
import { getCollections, saveRequest, Collection } from "../../lib/apiClient";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  requestId: number;
  onSuccess: () => void;
}

type State = {
  collections: Collection[];
  selectedId: number | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
};

type Action =
  | { type: "FETCH_START" }
  | {
      type: "FETCH_SUCCESS";
      payload: { collections: Collection[]; selectedId: number | null };
    }
  | { type: "FETCH_ERROR"; payload: string }
  | { type: "SELECT_COLLECTION"; payload: number }
  | { type: "SAVE_START" }
  | { type: "SAVE_SUCCESS" }
  | { type: "SAVE_ERROR" }
  | { type: "RESET" };

const initialState: State = {
  collections: [],
  selectedId: null,
  loading: false,
  saving: false,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true, error: null };
    case "FETCH_SUCCESS":
      return {
        ...state,
        loading: false,
        collections: action.payload.collections,
        selectedId: action.payload.selectedId,
      };
    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.payload };
    case "SELECT_COLLECTION":
      return { ...state, selectedId: action.payload };
    case "SAVE_START":
      return { ...state, saving: true };
    case "SAVE_SUCCESS":
      return { ...state, saving: false };
    case "SAVE_ERROR":
      return { ...state, saving: false };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export default function SaveModal({
  isOpen,
  onClose,
  requestId,
  onSuccess,
}: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { collections, selectedId, loading, saving, error } = state;

  // Fetch collections when modal opens
  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      dispatch({ type: "RESET" });
      return;
    }

    const fetchCollections = async () => {
      dispatch({ type: "FETCH_START" });
      try {
        const data = await getCollections();
        const firstId = data.length > 0 ? data[0].id : null;
        dispatch({
          type: "FETCH_SUCCESS",
          payload: { collections: data, selectedId: firstId },
        });
      } catch (err) {
        dispatch({
          type: "FETCH_ERROR",
          payload: "Failed to load collections",
        });
      }
    };

    fetchCollections();
  }, [isOpen]);

  const handleSave = async () => {
    if (!selectedId) {
      alert("Please select a collection");
      return;
    }

    dispatch({ type: "SAVE_START" });
    try {
      await saveRequest({
        collection_id: selectedId,
        request_id: requestId,
      });
      dispatch({ type: "SAVE_SUCCESS" });
      onSuccess();
      onClose();
    } catch (err) {
      dispatch({ type: "SAVE_ERROR" });
      alert("Failed to save request");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl w-96 max-w-full p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Save to Collection
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-red-400 text-sm text-center py-4">{error}</div>
        ) : collections.length === 0 ? (
          <div className="text-gray-400 text-sm text-center py-4">
            No collections exist. Create one first.
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {collections.map((col) => (
              <div
                key={col.id}
                className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer ${
                  selectedId === col.id
                    ? "bg-blue-600/20 border border-blue-500"
                    : "hover:bg-gray-800"
                }`}
                onClick={() =>
                  dispatch({ type: "SELECT_COLLECTION", payload: col.id })
                }
              >
                <Folder className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-white">{col.name}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white border border-gray-700 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading || collections.length === 0}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
