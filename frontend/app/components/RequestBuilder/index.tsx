"use client";

import { useReducer, useEffect } from "react";
import RequestHeader from "./RequestHeader";
import RequestTabs from "./RequestTabs";
import ResponsePanel from "./ResponsePanel";
import BodyEditor from "./BodyEditor";
import ParamsEditor from "./ParamsEditor";
import AuthEditor from "./AuthEditor";
import SaveModal from "./SaveModal";
import RequestTabsBar from "./RequestTabsBar";
import { Plus } from "lucide-react";
import {
  sendRequest,
  SendRequestPayload,
  RequestOut,
} from "../../lib/apiClient";

interface RequestBuilderProps {
  initialRequest?: RequestOut | null;
  environmentId?: number;
  loading?: boolean;
}

interface Tab {
  id: string;
  requestId: number;
  method: string;
  url: string;
  name?: string;
  requestData: RequestOut;
}

let tabCounter = 0;
const generateTabId = () => `tab-${Date.now()}-${++tabCounter}`;

const buildResponseDisplay = (request: RequestOut) => {
  if (request.response_status && request.response_body) {
    return {
      statusCode: request.response_status,
      headers: request.response_headers || {},
      body: request.response_body,
      responseTime: request.response_time || 0,
      responseSize: new Blob([request.response_body]).size,
    };
  }
  return null;
};

// ---- State & Actions ----
type State = {
  tabs: Tab[];
  activeIndex: number;
  activeTab: string; // 'params', 'auth', 'headers', 'body', etc.
  method: string;
  url: string;
  queryParams: Record<string, string>;
  headers: Record<string, string>;
  auth: any;
  body: string;
  bodyType: string;
  currentRequestId: number | null;
  response: any;
  loading: boolean;
  error: string | null;
  showSaveModal: boolean;
};

type Action =
  | { type: "OPEN_REQUEST"; payload: RequestOut }
  | { type: "OPEN_BLANK_TAB" }
  | { type: "SELECT_TAB"; payload: number }
  | { type: "CLOSE_TAB"; payload: number }
  | { type: "SET_ACTIVE_TAB"; payload: string }
  | { type: "SET_REQUEST_FIELDS"; payload: Partial<State> }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_RESPONSE"; payload: any }
  | { type: "SET_CURRENT_REQUEST_ID"; payload: number | null }
  | { type: "SET_SHOW_SAVE_MODAL"; payload: boolean }
  | {
      type: "UPDATE_TAB_AFTER_SEND";
      payload: { requestId: number; response: any };
    };

const initialState: State = {
  tabs: [],
  activeIndex: -1,
  activeTab: "params",
  method: "GET",
  url: "",
  queryParams: {},
  headers: {},
  auth: null,
  body: "",
  bodyType: "none",
  currentRequestId: null,
  response: null,
  loading: false,
  error: null,
  showSaveModal: false,
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "OPEN_REQUEST": {
      const request = action.payload;
      const existingIndex = state.tabs.findIndex(
        (t) => t.requestId === request.id,
      );
      if (existingIndex >= 0) {
        const tab = state.tabs[existingIndex];
        const req = tab.requestData;
        return {
          ...state,
          activeIndex: existingIndex,
          method: req.method,
          url: req.url,
          queryParams: req.query_params || {},
          headers: req.headers || {},
          auth: req.auth || null,
          body: req.body || "",
          bodyType: req.body_type || "none",
          currentRequestId: req.id,
          response: buildResponseDisplay(req),
          error: null,
        };
      }
      const newTab: Tab = {
        id: generateTabId(),
        requestId: request.id,
        method: request.method,
        url: request.url,
        requestData: request,
      };
      const newTabs = [...state.tabs, newTab];
      const newIndex = newTabs.length - 1;
      const req = request;
      return {
        ...state,
        tabs: newTabs,
        activeIndex: newIndex,
        method: req.method,
        url: req.url,
        queryParams: req.query_params || {},
        headers: req.headers || {},
        auth: req.auth || null,
        body: req.body || "",
        bodyType: req.body_type || "none",
        currentRequestId: req.id,
        response: buildResponseDisplay(req),
        error: null,
      };
    }
    case "OPEN_BLANK_TAB": {
      const blankRequest: RequestOut = {
        id: -1,
        collection_id: null,
        state: "DRAFT",
        method: "GET",
        url: "",
        query_params: {},
        headers: {},
        auth: null,
        body: "",
        body_type: "none",
        response_status: null,
        response_headers: null,
        response_body: null,
        response_time: null,
        created_at: new Date().toISOString(),
        executed_at: null,
      };
      const newTab: Tab = {
        id: generateTabId(),
        requestId: -1,
        method: "GET",
        url: "",
        name: "Untitled",
        requestData: blankRequest,
      };
      const newTabs = [...state.tabs, newTab];
      const newIndex = newTabs.length - 1;
      return {
        ...state,
        tabs: newTabs,
        activeIndex: newIndex,
        method: "GET",
        url: "",
        queryParams: {},
        headers: {},
        auth: null,
        body: "",
        bodyType: "none",
        currentRequestId: null,
        response: null,
        error: null,
      };
    }
    case "SELECT_TAB": {
      const index = action.payload;
      if (index === state.activeIndex) return state;
      const tab = state.tabs[index];
      if (!tab) return state;
      const req = tab.requestData;
      return {
        ...state,
        activeIndex: index,
        method: req.method,
        url: req.url,
        queryParams: req.query_params || {},
        headers: req.headers || {},
        auth: req.auth || null,
        body: req.body || "",
        bodyType: req.body_type || "none",
        currentRequestId: req.id,
        response: buildResponseDisplay(req),
        error: null,
      };
    }
    case "CLOSE_TAB": {
      const index = action.payload;
      const newTabs = state.tabs.filter((_, i) => i !== index);
      if (newTabs.length === 0) {
        return {
          ...initialState,
          tabs: [],
          activeIndex: -1,
        };
      }
      let newActiveIndex = state.activeIndex;
      if (index === state.activeIndex) {
        newActiveIndex = Math.min(index, newTabs.length - 1);
      } else if (index < state.activeIndex) {
        newActiveIndex = state.activeIndex - 1;
      }
      const tab = newTabs[newActiveIndex];
      const req = tab.requestData;
      return {
        ...state,
        tabs: newTabs,
        activeIndex: newActiveIndex,
        method: req.method,
        url: req.url,
        queryParams: req.query_params || {},
        headers: req.headers || {},
        auth: req.auth || null,
        body: req.body || "",
        bodyType: req.body_type || "none",
        currentRequestId: req.id,
        response: buildResponseDisplay(req),
        error: null,
      };
    }
    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.payload };
    case "SET_REQUEST_FIELDS":
      return { ...state, ...action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_RESPONSE":
      return { ...state, response: action.payload };
    case "SET_CURRENT_REQUEST_ID":
      return { ...state, currentRequestId: action.payload };
    case "SET_SHOW_SAVE_MODAL":
      return { ...state, showSaveModal: action.payload };
    case "UPDATE_TAB_AFTER_SEND": {
      const { requestId, response } = action.payload;
      const index = state.tabs.findIndex(
        (t) => t.requestId === state.currentRequestId,
      );
      if (index === -1) return state;
      const oldTab = state.tabs[index];
      const updatedRequest: RequestOut = {
        ...oldTab.requestData,
        id: requestId,
        response_status: response.statusCode,
        response_headers: response.headers,
        response_body: response.body,
        response_time: response.responseTime,
        executed_at: new Date().toISOString(),
        state: "EXECUTED",
      };
      const updatedTab: Tab = {
        ...oldTab,
        requestId: requestId,
        requestData: updatedRequest,
      };
      const newTabs = [...state.tabs];
      newTabs[index] = updatedTab;
      return {
        ...state,
        tabs: newTabs,
        currentRequestId: requestId,
        response: {
          statusCode: response.statusCode,
          headers: response.headers,
          body: response.body,
          responseTime: response.responseTime,
          responseSize: response.responseSize,
        },
      };
    }
    default:
      return state;
  }
};

export default function RequestBuilder({
  initialRequest,
  environmentId,
  loading: externalLoading,
}: RequestBuilderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    tabs,
    activeIndex,
    activeTab,
    method,
    url,
    queryParams,
    headers,
    auth,
    body,
    bodyType,
    currentRequestId,
    response,
    loading: internalLoading,
    error,
    showSaveModal,
  } = state;

  // ---- Handle initial request from sidebar ----
  useEffect(() => {
    if (initialRequest) {
      dispatch({ type: "OPEN_REQUEST", payload: initialRequest });
    }
  }, [initialRequest]);

  // Inside RequestBuilder component, after state declarations:

  // Build the full URL with query params
  const buildFullUrl = (base: string, params: Record<string, string>) => {
    // Filter out keys or values that are empty (trimmed)
    const filteredParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      const trimmedKey = key.trim();
      const trimmedValue = value.trim();
      if (trimmedKey !== "" && trimmedValue !== "") {
        filteredParams[trimmedKey] = trimmedValue;
      }
    }
    const queryString = new URLSearchParams(filteredParams).toString();
    if (!queryString) return base;
    const connector = base.includes("?") ? "&" : "?";
    return `${base}${connector}${queryString}`;
  };

  const fullUrl = buildFullUrl(url, queryParams);

  // Handler to parse a full URL and update both url and queryParams
  const handleUrlChange = (input: string) => {
    try {
      // Try to parse as URL (if it has protocol)
      const parsed = new URL(input);
      const base = parsed.origin + parsed.pathname;
      const params: Record<string, string> = {};
      parsed.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      dispatch({
        type: "SET_REQUEST_FIELDS",
        payload: { url: base, queryParams: params },
      });
    } catch {
      // If parsing fails, just set the url as the raw input (no query params)
      // We could also try to split on '?' manually
      const [base, query] = input.split("?");
      if (query) {
        const params: Record<string, string> = {};
        new URLSearchParams(query).forEach((value, key) => {
          params[key] = value;
        });
        dispatch({
          type: "SET_REQUEST_FIELDS",
          payload: { url: base, queryParams: params },
        });
      } else {
        dispatch({
          type: "SET_REQUEST_FIELDS",
          payload: { url: input, queryParams: {} },
        });
      }
    }
  };

  // ---- Handlers ----
  const handleSend = async () => {
    const payload: SendRequestPayload = {
      method,
      url,
      query_params: queryParams,
      headers,
      auth,
      environment_id: environmentId,
      ...(bodyType !== "none" && { body, body_type: bodyType }),
    };

    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    try {
      const result = await sendRequest(payload);
      dispatch({ type: "SET_RESPONSE", payload: result });
      if (result.request_id) {
        dispatch({
          type: "UPDATE_TAB_AFTER_SEND",
          payload: { requestId: result.request_id, response: result },
        });
      }
    } catch (err: any) {
      dispatch({ type: "SET_ERROR", payload: err.message });
      dispatch({ type: "SET_RESPONSE", payload: null });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const handleSaveClick = () => {
    dispatch({ type: "SET_SHOW_SAVE_MODAL", payload: true });
  };

  const activeTabId = activeIndex >= 0 ? tabs[activeIndex]?.id : null;
  const tabsBarData = tabs.map((tab) => ({
    id: tab.id,
    method: tab.method,
    url: tab.url,
    name: tab.name,
  }));

  // Combine internal and external loading
  const isLoading = internalLoading || externalLoading || false;

  return (
    <div className="flex flex-col h-full bg-black text-white">
      <div className="flex items-center border-b border-gray-800 bg-black shrink-0">
        <RequestTabsBar
          tabs={tabsBarData}
          activeTabId={activeTabId}
          onSelectTab={(id) => {
            const index = tabs.findIndex((t) => t.id === id);
            if (index >= 0) dispatch({ type: "SELECT_TAB", payload: index });
          }}
          onCloseTab={(id) => {
            const index = tabs.findIndex((t) => t.id === id);
            if (index >= 0) dispatch({ type: "CLOSE_TAB", payload: index });
          }}
        />
        <button
          onClick={() => dispatch({ type: "OPEN_BLANK_TAB" })}
          className="px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <RequestHeader
        method={method}
        setMethod={(m) =>
          dispatch({ type: "SET_REQUEST_FIELDS", payload: { method: m } })
        }
        url={fullUrl} // <-- display full URL
        setUrl={handleUrlChange} // <-- parse input
        onSend={handleSend}
        onSave={handleSaveClick}
        loading={isLoading}
      />

      {/* Tabs: Params, Auth, Headers, Body, etc. */}
      <RequestTabs
        activeTab={activeTab}
        setActiveTab={(tab) =>
          dispatch({ type: "SET_ACTIVE_TAB", payload: tab })
        }
      >
        <div className="flex-1 p-4 overflow-auto bg-black relative">
          {activeTab === "params" && (
            <ParamsEditor
              params={queryParams}
              onChange={(newParams) =>
                dispatch({
                  type: "SET_REQUEST_FIELDS",
                  payload: { queryParams: newParams },
                })
              }
            />
          )}
          {activeTab === "auth" && (
            <AuthEditor
              auth={auth}
              onChange={(newAuth) =>
                dispatch({
                  type: "SET_REQUEST_FIELDS",
                  payload: { auth: newAuth },
                })
              }
            />
          )}
          {activeTab === "headers" && (
            <div className="text-gray-400">Headers editor (coming soon)</div>
          )}
          {activeTab === "body" && (
            <BodyEditor
              body={body}
              setBody={(b) =>
                dispatch({ type: "SET_REQUEST_FIELDS", payload: { body: b } })
              }
              bodyType={bodyType}
              setBodyType={(bt) =>
                dispatch({
                  type: "SET_REQUEST_FIELDS",
                  payload: { bodyType: bt },
                })
              }
            />
          )}
        </div>
      </RequestTabs>

      {error && (
        <div className="border-t border-red-800 p-2 text-red-400 text-sm bg-red-950">
          Error: {error}
        </div>
      )}
      <ResponsePanel response={response} loading={isLoading} />

      <SaveModal
        isOpen={showSaveModal}
        onClose={() =>
          dispatch({ type: "SET_SHOW_SAVE_MODAL", payload: false })
        }
        requestId={currentRequestId!}
      />
    </div>
  );
}
