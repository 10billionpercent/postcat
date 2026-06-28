"use client";

import { useReducer, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Folder,
  Globe,
  Loader2,
} from "lucide-react";
import {
  getCollections,
  getRequests,
  createCollection,
  Collection,
  RequestOut,
} from "../lib/apiClient";

interface Props {
  onSelectRequest: (id: number) => void;
  selectedRequestId: number | null;
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

type State = {
  collections: Collection[];
  requests: Record<number, RequestOut[]>;
  expanded: Set<number>;
  loading: boolean;
  creating: boolean;
  error: string | null;
};

type Action =
  | { type: "FETCH_START" }
  | {
      type: "FETCH_SUCCESS";
      payload: { collections: Collection[]; expanded: Set<number> };
    }
  | { type: "FETCH_ERROR"; payload: string }
  | { type: "SET_REQUESTS"; payload: Record<number, RequestOut[]> }
  | { type: "TOGGLE_EXPAND"; payload: number }
  | { type: "CREATE_START" }
  | {
      type: "CREATE_SUCCESS";
      payload: { collection: Collection; expanded: Set<number> };
    }
  | { type: "CREATE_ERROR" };

const initialState: State = {
  collections: [],
  requests: {},
  expanded: new Set<number>(),
  loading: true,
  creating: false,
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
        expanded: action.payload.expanded,
      };
    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.payload };
    case "SET_REQUESTS":
      return { ...state, requests: action.payload };
    case "TOGGLE_EXPAND": {
      const newExpanded = new Set(state.expanded);
      if (newExpanded.has(action.payload)) {
        newExpanded.delete(action.payload);
      } else {
        newExpanded.add(action.payload);
      }
      return { ...state, expanded: newExpanded };
    }
    case "CREATE_START":
      return { ...state, creating: true };
    case "CREATE_SUCCESS":
      return {
        ...state,
        creating: false,
        collections: [...state.collections, action.payload.collection],
        expanded: action.payload.expanded,
      };
    case "CREATE_ERROR":
      return { ...state, creating: false };
    default:
      return state;
  }
}

export default function Sidebar({ onSelectRequest, selectedRequestId }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { collections, requests, expanded, loading, creating, error } = state;

  // Fetch collections on mount
  useEffect(() => {
    const fetchCollections = async () => {
      dispatch({ type: "FETCH_START" });
      try {
        const data = await getCollections();
        const newExpanded: Set<number> =
          data.length > 0 ? new Set([data[0].id]) : new Set<number>();
        dispatch({
          type: "FETCH_SUCCESS",
          payload: { collections: data, expanded: newExpanded },
        });
      } catch (err) {
        dispatch({
          type: "FETCH_ERROR",
          payload: "Failed to load collections",
        });
        console.error(err);
      }
    };
    fetchCollections();
  }, []);

  // Fetch requests for expanded collections
  useEffect(() => {
    const fetchRequests = async () => {
      const newRequests: Record<number, RequestOut[]> = {};
      for (const collection of collections) {
        if (expanded.has(collection.id)) {
          try {
            const reqs = await getRequests(collection.id);
            newRequests[collection.id] = reqs;
          } catch (err) {
            console.error(
              `Failed to fetch requests for collection ${collection.id}`,
              err,
            );
            newRequests[collection.id] = [];
          }
        }
      }
      dispatch({ type: "SET_REQUESTS", payload: newRequests });
    };
    if (collections.length > 0) {
      fetchRequests();
    }
  }, [collections, expanded]);

  const toggleCollection = (id: number) => {
    dispatch({ type: "TOGGLE_EXPAND", payload: id });
  };

  const handleCreateCollection = async () => {
    const name = prompt("Enter collection name:");
    if (!name || name.trim() === "") return;

    dispatch({ type: "CREATE_START" });
    try {
      const newCollection = await createCollection(name.trim());
      // Auto-expand the new collection
      const newExpanded = new Set([...expanded, newCollection.id]);
      dispatch({
        type: "CREATE_SUCCESS",
        payload: { collection: newCollection, expanded: newExpanded },
      });
    } catch (err) {
      dispatch({ type: "CREATE_ERROR" });
      alert("Failed to create collection. Please try again.");
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="w-80 min-w-[320px] h-full bg-black border-r border-gray-800 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-80 min-w-[320px] h-full bg-black border-r border-gray-800 flex flex-col items-center justify-center text-red-400 text-sm px-4">
        <div className="text-center">
          <div className="mb-2">{error}</div>
          <button
            onClick={() => {
              dispatch({ type: "FETCH_START" });
              const fetchCollections = async () => {
                try {
                  const data = await getCollections();
                  const newExpanded: Set<number> =
                    data.length > 0 ? new Set([data[0].id]) : new Set<number>();
                  dispatch({
                    type: "FETCH_SUCCESS",
                    payload: { collections: data, expanded: newExpanded },
                  });
                } catch (err) {
                  dispatch({
                    type: "FETCH_ERROR",
                    payload: "Failed to load collections",
                  });
                  console.error(err);
                }
              };
              fetchCollections();
            }}
            className="text-blue-400 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 min-w-[320px] h-full bg-black border-r border-gray-800 flex flex-col text-gray-300">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <span className="text-sm font-semibold text-white">Collections</span>
        <button
          onClick={handleCreateCollection}
          disabled={creating}
          className="text-gray-400 hover:text-white disabled:opacity-50"
        >
          {creating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Collections List */}
      <div className="flex-1 overflow-y-auto">
        {collections.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            No collections yet
            <br />
            <button
              onClick={handleCreateCollection}
              disabled={creating}
              className="text-blue-400 hover:underline mt-1 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create one"}
            </button>
          </div>
        ) : (
          collections.map((collection) => (
            <div key={collection.id} className="border-b border-gray-800/50">
              <div
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 cursor-pointer"
                onClick={() => toggleCollection(collection.id)}
              >
                {expanded.has(collection.id) ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
                <Folder className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-white">
                  {collection.name}
                </span>
                <span className="text-xs text-gray-500 ml-auto">
                  {requests[collection.id]?.length || 0}
                </span>
              </div>

              {expanded.has(collection.id) && (
                <div className="pl-8 pr-2 py-1">
                  {requests[collection.id]?.map((req) => (
                    <div
                      key={req.id}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer hover:bg-gray-800 ${
                        selectedRequestId === req.id ? "bg-gray-800" : ""
                      }`}
                      onClick={() => onSelectRequest(req.id)}
                    >
                      <span
                        className={`text-xs font-mono font-semibold ${
                          methodColors[req.method] || "text-gray-400"
                        }`}
                      >
                        {req.method}
                      </span>
                      <span className="text-gray-300 truncate flex-1">
                        {req.url}
                      </span>
                      <Globe className="w-3 h-3 text-gray-600 flex-shrink-0" />
                    </div>
                  ))}
                  {(!requests[collection.id] ||
                    requests[collection.id].length === 0) && (
                    <div className="text-xs text-gray-500 px-2 py-1 italic">
                      No requests
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Environments Section */}
      <div className="border-t border-gray-800">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Environments</span>
          <button className="text-gray-400 hover:text-white">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 pb-3 text-xs text-gray-500">
          No items in this panel
        </div>
      </div>

      {/* Bottom placeholders */}
      <div className="border-t border-gray-800 px-4 py-3">
        <div className="text-sm font-semibold text-white">SPECS</div>
        <div className="text-xs text-gray-500 mt-1">FLOWS</div>
      </div>
    </div>
  );
}
