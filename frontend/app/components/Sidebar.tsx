"use client";

import { useReducer, useEffect, useState, useRef } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Loader2,
  History,
  Layers,
  MoreHorizontal,
} from "lucide-react";
import {
  getCollections,
  getRequests,
  createCollection,
  getHistory,
  getEnvironments,
  updateCollection,
  deleteCollection,
  updateEnvironment,
  deleteEnvironment,
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
  | { type: "CREATE_ERROR" }
  | { type: "UPDATE_COLLECTION"; payload: Collection }
  | { type: "DELETE_COLLECTION"; payload: number };

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
    case "UPDATE_COLLECTION": {
      const updated = action.payload;
      return {
        ...state,
        collections: state.collections.map((c) =>
          c.id === updated.id ? updated : c,
        ),
      };
    }
    case "DELETE_COLLECTION": {
      const id = action.payload;
      const newCollections = state.collections.filter((c) => c.id !== id);
      const newExpanded = new Set(state.expanded);
      newExpanded.delete(id);
      const newRequests = { ...state.requests };
      delete newRequests[id];
      return {
        ...state,
        collections: newCollections,
        expanded: newExpanded,
        requests: newRequests,
      };
    }
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
  | { type: "FETCH_ERROR"; payload: string }
  | { type: "UPDATE_ENVIRONMENT"; payload: Environment }
  | { type: "DELETE_ENVIRONMENT"; payload: number };

function envReducer(state: EnvState, action: EnvAction): EnvState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true, error: null };
    case "FETCH_SUCCESS":
      return { ...state, loading: false, environments: action.payload };
    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.payload };
    case "UPDATE_ENVIRONMENT": {
      const updated = action.payload;
      return {
        ...state,
        environments: state.environments.map((e) =>
          e.id === updated.id ? updated : e,
        ),
      };
    }
    case "DELETE_ENVIRONMENT": {
      const id = action.payload;
      return {
        ...state,
        environments: state.environments.filter((e) => e.id !== id),
      };
    }
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

  // ---- Local UI state for dropdowns and inline editing ----
  const [collectionDropdownOpen, setCollectionDropdownOpen] = useState<
    Record<number, boolean>
  >({});
  const [environmentDropdownOpen, setEnvironmentDropdownOpen] = useState<
    Record<number, boolean>
  >({});
  const [editingCollectionId, setEditingCollectionId] = useState<number | null>(
    null,
  );
  const [editingEnvironmentId, setEditingEnvironmentId] = useState<
    number | null
  >(null);
  const [tempName, setTempName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleRenameCollection = async (id: number, newName: string) => {
    if (!newName.trim()) return;
    try {
      const updated = await updateCollection(id, newName.trim());
      collectionsDispatch({ type: "UPDATE_COLLECTION", payload: updated });
    } catch (err) {
      alert("Failed to rename collection");
      console.error(err);
    } finally {
      setEditingCollectionId(null);
      setCollectionDropdownOpen((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleDeleteCollection = async (id: number) => {
    if (!confirm("Delete this collection and all its requests?")) return;
    try {
      await deleteCollection(id);
      collectionsDispatch({ type: "DELETE_COLLECTION", payload: id });
    } catch (err) {
      alert("Failed to delete collection");
      console.error(err);
    } finally {
      setCollectionDropdownOpen((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleRenameEnvironment = async (id: number, newName: string) => {
    if (!newName.trim()) return;
    try {
      const updated = await updateEnvironment(id, newName.trim());
      envDispatch({ type: "UPDATE_ENVIRONMENT", payload: updated });
    } catch (err) {
      alert("Failed to rename environment");
      console.error(err);
    } finally {
      setEditingEnvironmentId(null);
      setEnvironmentDropdownOpen((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleDeleteEnvironment = async (id: number) => {
    if (!confirm("Delete this environment?")) return;
    try {
      await deleteEnvironment(id);
      envDispatch({ type: "DELETE_ENVIRONMENT", payload: id });
    } catch (err) {
      alert("Failed to delete environment");
      console.error(err);
    } finally {
      setEnvironmentDropdownOpen((prev) => ({ ...prev, [id]: false }));
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
    return collections.map((collection) => {
      const isEditing = editingCollectionId === collection.id;
      const isDropdownOpen = collectionDropdownOpen[collection.id] || false;

      return (
        <div key={collection.id}>
          <div
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 cursor-pointer group"
            onClick={() => toggleCollection(collection.id)}
          >
            {expanded.has(collection.id) ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={() => handleRenameCollection(collection.id, tempName)}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    handleRenameCollection(collection.id, tempName);
                  if (e.key === "Escape") {
                    setEditingCollectionId(null);
                    setCollectionDropdownOpen((prev) => ({
                      ...prev,
                      [collection.id]: false,
                    }));
                  }
                }}
                className="bg-transparent rounded px-1 text-sm text-white focus:outline-none focus:border-blue-500"
                autoFocus
              />
            ) : (
              <span className="text-sm font-medium text-white">
                {collection.name}
              </span>
            )}
            <div className="ml-auto flex items-center gap-1">
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCollectionDropdownOpen((prev) => ({
                      ...prev,
                      [collection.id]: !prev[collection.id],
                    }));
                  }}
                  className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-32 bg-gray-800 border border-gray-700 rounded shadow-lg z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCollectionId(collection.id);
                        setTempName(collection.name);
                        setCollectionDropdownOpen((prev) => ({
                          ...prev,
                          [collection.id]: false,
                        }));
                      }}
                      className="block w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700"
                    >
                      Rename
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCollection(collection.id);
                      }}
                      className="block w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-gray-700"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
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
                  <span className="text-gray-300 truncate flex-1">
                    {req.url}
                  </span>
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
      );
    });
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
        {environments.map((env) => {
          const isEditing = editingEnvironmentId === env.id;
          const isDropdownOpen = environmentDropdownOpen[env.id] || false;

          return (
            <div
              key={env.id}
              className="flex items-center gap-2 py-0.5 group hover:bg-gray-800 px-1 rounded"
            >
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onBlur={() => handleRenameEnvironment(env.id, tempName)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      handleRenameEnvironment(env.id, tempName);
                    if (e.key === "Escape") {
                      setEditingEnvironmentId(null);
                      setEnvironmentDropdownOpen((prev) => ({
                        ...prev,
                        [env.id]: false,
                      }));
                    }
                  }}
                  className="bg-transparent border border-gray-600 rounded px-1 text-xs text-white focus:outline-none focus:border-blue-500 flex-1"
                  autoFocus
                />
              ) : (
                <span className="text-sm font-medium text-white">
                  {env.name}
                </span>
              )}
              <div className="relative flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEnvironmentDropdownOpen((prev) => ({
                      ...prev,
                      [env.id]: !prev[env.id],
                    }));
                  }}
                  className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="w-3 h-3" />
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-32 bg-gray-800 border border-gray-700 rounded shadow-lg z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingEnvironmentId(env.id);
                        setTempName(env.name);
                        setEnvironmentDropdownOpen((prev) => ({
                          ...prev,
                          [env.id]: false,
                        }));
                      }}
                      className="block w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700"
                    >
                      Rename
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEnvironment(env.id);
                      }}
                      className="block w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-gray-700"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
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
            <div className="px-4 py-3 flex items-center justify-between shrink-0">
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

            {/* ---- Environments Section ---- */}
            <div className="border-t border-gray-800 shrink-0">
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">
                  Environments
                </span>
                <button
                  onClick={() => setShowEnvModal(true)}
                  className="text-gray-400 hover:text-white"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="pb-2">{renderEnvironments()}</div>
            </div>
          </>
        )}
        {view === "history" && renderHistory()}
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
