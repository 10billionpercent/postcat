"use client";

import { useReducer, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Folder,
  Globe,
  Loader2,
  History,
  Layers,
} from "lucide-react";
import {
  getCollections,
  getRequests,
  createCollection,
  getHistory,
  getEnvironments,
  Collection,
  RequestOut,
  Environment,
} from "../lib/apiClient";
import CreateEnvironmentModal from "./CreateEnvironmentModal";

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

// ---- Date grouping helper ----
const groupRequestsByDate = (requests: RequestOut[]) => {
  const groups: { label: string; items: RequestOut[] }[] = [];
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = (date: Date) => date.toDateString() === today.toDateString();
  const isYesterday = (date: Date) =>
    date.toDateString() === yesterday.toDateString();

  const todayItems: RequestOut[] = [];
  const yesterdayItems: RequestOut[] = [];
  const olderItems: RequestOut[] = [];

  requests.forEach((req) => {
    if (!req.executed_at) return;
    const date = new Date(req.executed_at);
    if (isToday(date)) todayItems.push(req);
    else if (isYesterday(date)) yesterdayItems.push(req);
    else olderItems.push(req);
  });

  if (todayItems.length) groups.push({ label: "Today", items: todayItems });
  if (yesterdayItems.length)
    groups.push({ label: "Yesterday", items: yesterdayItems });
  if (olderItems.length) groups.push({ label: "Older", items: olderItems });

  return groups;
};

// ---- Reducer for Collections ----
type CollectionsState = {
  collections: Collection[];
  requests: Record<number, RequestOut[]>;
  expanded: Set<number>;
  loading: boolean;
  creating: boolean;
  error: string | null;
};

type CollectionsAction =
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

const initialCollectionsState: CollectionsState = {
  collections: [],
  requests: {},
  expanded: new Set<number>(),
  loading: true,
  creating: false,
  error: null,
};

function collectionsReducer(
  state: CollectionsState,
  action: CollectionsAction,
): CollectionsState {
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
      if (newExpanded.has(action.payload)) newExpanded.delete(action.payload);
      else newExpanded.add(action.payload);
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

// ---- History state ----
type HistoryState = {
  requests: RequestOut[];
  loading: boolean;
  error: string | null;
};

const initialHistoryState: HistoryState = {
  requests: [],
  loading: false,
  error: null,
};

type HistoryAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: RequestOut[] }
  | { type: "FETCH_ERROR"; payload: string };

function historyReducer(
  state: HistoryState,
  action: HistoryAction,
): HistoryState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true, error: null };
    case "FETCH_SUCCESS":
      return { ...state, loading: false, requests: action.payload };
    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

// ---- Environments state ----
type EnvState = {
  environments: Environment[];
  loading: boolean;
  error: string | null;
};

const initialEnvState: EnvState = {
  environments: [],
  loading: false,
  error: null,
};

type EnvAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: Environment[] }
  | { type: "FETCH_ERROR"; payload: string };

function envReducer(state: EnvState, action: EnvAction): EnvState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true, error: null };
    case "FETCH_SUCCESS":
      return { ...state, loading: false, environments: action.payload };
    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

export default function Sidebar({ onSelectRequest, selectedRequestId }: Props) {
  // ---- View toggle ----
  const [view, setView] = useState<"items" | "history">("items");

  // ---- Collections ----
  const [collectionsState, collectionsDispatch] = useReducer(
    collectionsReducer,
    initialCollectionsState,
  );
  const {
    collections,
    requests,
    expanded,
    loading: collectionsLoading,
    creating,
    error: collectionsError,
  } = collectionsState;

  // ---- History ----
  const [historyState, historyDispatch] = useReducer(
    historyReducer,
    initialHistoryState,
  );
  const {
    requests: historyRequests,
    loading: historyLoading,
    error: historyError,
  } = historyState;

  // ---- Environments ----
  const [envState, envDispatch] = useReducer(envReducer, initialEnvState);
  const { environments, loading: envLoading, error: envError } = envState;

  // ---- Modal ----
  const [showEnvModal, setShowEnvModal] = useState(false);

  // ---- Fetch collections ----
  const fetchCollections = async () => {
    collectionsDispatch({ type: "FETCH_START" });
    try {
      const data = await getCollections();
      const newExpanded =
        data.length > 0 ? new Set([data[0].id]) : new Set<number>();
      collectionsDispatch({
        type: "FETCH_SUCCESS",
        payload: { collections: data, expanded: newExpanded },
      });
    } catch (err) {
      collectionsDispatch({
        type: "FETCH_ERROR",
        payload: "Failed to load collections",
      });
      console.error(err);
    }
  };

  // ---- Fetch history ----
  const fetchHistory = async () => {
    historyDispatch({ type: "FETCH_START" });
    try {
      const data = await getHistory();
      historyDispatch({ type: "FETCH_SUCCESS", payload: data });
    } catch (err) {
      historyDispatch({
        type: "FETCH_ERROR",
        payload: "Failed to load history",
      });
      console.error(err);
    }
  };

  // ---- Fetch environments ----
  const fetchEnvironments = async () => {
    envDispatch({ type: "FETCH_START" });
    try {
      const data = await getEnvironments();
      envDispatch({ type: "FETCH_SUCCESS", payload: data });
    } catch (err) {
      envDispatch({
        type: "FETCH_ERROR",
        payload: "Failed to load environments",
      });
      console.error(err);
    }
  };

  // ---- Load on mount ----
  useEffect(() => {
    fetchCollections();
    fetchEnvironments();
  }, []);

  // ---- Load history when switching to history view ----
  useEffect(() => {
    if (view === "history") {
      fetchHistory();
    }
  }, [view]);

  // ---- Fetch requests for expanded collections ----
  useEffect(() => {
    const fetchRequestsForCollections = async () => {
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
      collectionsDispatch({ type: "SET_REQUESTS", payload: newRequests });
    };
    if (collections.length > 0) {
      fetchRequestsForCollections();
    }
  }, [collections, expanded]);

  // ---- Handlers ----
  const toggleCollection = (id: number) => {
    collectionsDispatch({ type: "TOGGLE_EXPAND", payload: id });
  };

  const handleCreateCollection = async () => {
    const name = "New Collection";
    collectionsDispatch({ type: "CREATE_START" });
    try {
      const newCollection = await createCollection(name);
      const newExpanded = new Set([...expanded, newCollection.id]);
      collectionsDispatch({
        type: "CREATE_SUCCESS",
        payload: { collection: newCollection, expanded: newExpanded },
      });
    } catch (err) {
      collectionsDispatch({ type: "CREATE_ERROR" });
      alert("Failed to create collection. Please try again.");
      console.error(err);
    }
  };

  const handleEnvModalSuccess = () => {
    fetchEnvironments();
  };

  // ---- Render Collections ----
  const renderCollections = () => {
    if (collectionsLoading) {
      return (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      );
    }
    if (collectionsError) {
      return (
        <div className="text-center text-red-400 text-sm p-4">
          {collectionsError}
          <button
            onClick={fetchCollections}
            className="block text-blue-400 hover:underline mt-2"
          >
            Retry
          </button>
        </div>
      );
    }
    if (collections.length === 0) {
      return (
        <div className="px-4 py-8 text-center text-gray-500 text-sm">
          No collections yet
          <br />
          <button
            onClick={handleCreateCollection}
            className="text-blue-400 hover:underline mt-1"
          >
            Create one
          </button>
        </div>
      );
    }
    return collections.map((collection) => (
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
                  className={`text-xs font-mono font-semibold ${methodColors[req.method] || "text-gray-400"}`}
                >
                  {req.method}
                </span>
                <span className="text-gray-300 truncate flex-1">{req.url}</span>
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
    ));
  };

  // ---- Render History ----
  const renderHistory = () => {
    if (historyLoading) {
      return (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      );
    }
    if (historyError) {
      return (
        <div className="text-center text-red-400 text-sm p-4">
          {historyError}
          <button
            onClick={fetchHistory}
            className="block text-blue-400 hover:underline mt-2"
          >
            Retry
          </button>
        </div>
      );
    }
    if (historyRequests.length === 0) {
      return (
        <div className="px-4 py-8 text-center text-gray-500 text-sm">
          No history yet
        </div>
      );
    }
    const groups = groupRequestsByDate(historyRequests);
    return groups.map((group) => (
      <div key={group.label}>
        <div className="px-3 py-1 text-xs font-semibold text-gray-400 bg-gray-900 border-b border-gray-800">
          {group.label}
        </div>
        {group.items.map((req) => (
          <div
            key={req.id}
            className={`flex items-center gap-2 px-3 py-1.5 hover:bg-gray-800 cursor-pointer ${
              selectedRequestId === req.id ? "bg-gray-800" : ""
            }`}
            onClick={() => onSelectRequest(req.id)}
          >
            <span
              className={`text-xs font-mono font-semibold ${methodColors[req.method] || "text-gray-400"}`}
            >
              {req.method}
            </span>
            <span className="text-gray-300 truncate flex-1 text-sm">
              {req.url}
            </span>
          </div>
        ))}
      </div>
    ));
  };

  // ---- Render Environments ----
  const renderEnvironments = () => {
    if (envLoading) {
      return (
        <div className="flex items-center justify-center h-12">
          <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
        </div>
      );
    }
    if (envError) {
      return (
        <div className="text-center text-red-400 text-xs p-2">{envError}</div>
      );
    }
    if (environments.length === 0) {
      return (
        <div className="px-3 py-2 text-xs text-gray-500">
          No items in this panel
        </div>
      );
    }
    return (
      <div className="px-3 py-1 space-y-1">
        {environments.map((env) => (
          <div
            key={env.id}
            className="text-xs text-gray-300 py-0.5 flex items-center gap-2"
          >
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            {env.name}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-80 min-w-[320px] h-full bg-black border-r border-gray-800 flex flex-col text-gray-300">
      {/* ---- Toggle Header ---- */}
      <div className="flex border-b border-gray-800 shrink-0">
        <button
          onClick={() => setView("items")}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            view === "items"
              ? "text-white border-b-2 border-blue-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Layers className="w-4 h-4 inline mr-1" />
          ITEMS
        </button>
        <button
          onClick={() => setView("history")}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            view === "history"
              ? "text-white border-b-2 border-blue-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <History className="w-4 h-4 inline mr-1" />
          HISTORY
        </button>
      </div>

      {/* ---- Content (Items or History) ---- */}
      <div className="flex-1 overflow-y-auto">
        {view === "items" && (
          <>
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between shrink-0">
              <span className="text-sm font-semibold text-white">
                Collections
              </span>
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
            {renderCollections()}
          </>
        )}
        {view === "history" && renderHistory()}
      </div>

      {/* ---- Environments Section (always visible) ---- */}
      <div className="border-t border-gray-800 shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Environments</span>
          <button
            onClick={() => setShowEnvModal(true)}
            className="text-gray-400 hover:text-white"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="pb-2">{renderEnvironments()}</div>
      </div>

      {/* ---- Bottom placeholders ---- */}
      <div className="border-t border-gray-800 px-4 py-3 shrink-0">
        <div className="text-sm font-semibold text-white">SPECS</div>
        <div className="text-xs text-gray-500 mt-1">FLOWS</div>
      </div>

      {/* ---- Modal ---- */}
      <CreateEnvironmentModal
        isOpen={showEnvModal}
        onClose={() => setShowEnvModal(false)}
        onSuccess={handleEnvModalSuccess}
      />
    </div>
  );
}
