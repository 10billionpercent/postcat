"use client";

import {
  useReducer,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import RequestHeader from "./RequestHeader";
import RequestTabs from "./RequestTabs";
import ResponsePanel from "./ResponsePanel";
import BodyEditor from "./BodyEditor";
import ParamsEditor from "./ParamsEditor";
import AuthEditor from "./AuthEditor";
import HeadersEditor from "./HeadersEditor";
import EnvironmentEditor from "./EnvironmentEditor";
import SaveModal from "./SaveModal";
import RequestTabsBar from "./RequestTabsBar";
import { Plus } from "lucide-react";
import {
  sendRequest,
  SendRequestPayload,
  RequestOut,
  getEnvironment,
  getVariables,
} from "../../lib/apiClient";

export interface RequestBuilderHandle {
  openEnvironmentTab: (envId?: number) => void;
}

interface RequestBuilderProps {
  initialRequest?: RequestOut | null;
  environmentId?: number;
  loading?: boolean;
}

interface VariableItem {
  id?: number;
  key: string;
  value: string;
}

interface Tab {
  id: string;
  type: "request" | "environment";
  // request fields
  requestId?: number;
  method?: string;
  url?: string;
  requestData?: RequestOut;
  // environment fields
  environmentId?: number;
  envName?: string;
  variables?: { key: string; value: string }[];
  // common
  name?: string;
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

const DEFAULT_BLANK_REQUEST: RequestOut = {
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

const createBlankTab = (): Tab => ({
  id: generateTabId(),
  type: "request",
  requestId: -1,
  method: "GET",
  url: "",
  name: "Untitled",
  requestData: DEFAULT_BLANK_REQUEST,
});

type State = {
  tabs: Tab[];
  activeIndex: number;
  activeTab: string;
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
  | { type: "OPEN_ENVIRONMENT_TAB" }
  | {
      type: "OPEN_EXISTING_ENVIRONMENT_TAB";
      payload: { id: number; name: string; variables: VariableItem[] };
    }
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
  tabs: [createBlankTab()],
  activeIndex: 0,
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
  // Debug: log every action
  console.log("🔧 Reducer action:", action.type, action);

  switch (action.type) {
    case "OPEN_REQUEST": {
      const request = action.payload;
      // Always create a new tab – no check for existing tabs
      const newTab: Tab = {
        id: generateTabId(),
        type: "request",
        requestId: request.id,
        method: request.method,
        url: request.url,
        requestData: request,
      };
      const newTabs = [...state.tabs, newTab];
      const newIndex = newTabs.length - 1;
      const newState = {
        ...state,
        tabs: newTabs,
        activeIndex: newIndex,
        method: request.method,
        url: request.url,
        queryParams: request.query_params || {},
        headers: request.headers || {},
        auth: request.auth || null,
        body: request.body || "",
        bodyType: request.body_type || "none",
        currentRequestId: request.id,
        response: buildResponseDisplay(request),
        error: null,
      };
      console.log(
        "✅ After OPEN_REQUEST, tabs:",
        newState.tabs.map((t) => t.url),
      );
      return newState;
    }
    case "OPEN_ENVIRONMENT_TAB": {
      const newTab: Tab = {
        id: generateTabId(),
        type: "environment",
        envName: "New Environment",
        variables: [{ key: "", value: "" }],
        name: "New Environment",
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
    case "OPEN_EXISTING_ENVIRONMENT_TAB": {
      const { id, name, variables } = action.payload;
      const newTab: Tab = {
        id: generateTabId(),
        type: "environment",
        environmentId: id,
        envName: name,
        variables: variables.length > 0 ? variables : [{ key: "", value: "" }],
        name: name,
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
    case "OPEN_BLANK_TAB": {
      const newTab = createBlankTab();
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
      if (tab.type === "environment") {
        return {
          ...state,
          activeIndex: index,
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
      } else {
        const req = tab.requestData!;
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
    }
    case "CLOSE_TAB": {
      const index = action.payload;
      if (index < 0 || index >= state.tabs.length) {
        console.warn("⚠️ Invalid tab index for close:", index);
        return state;
      }
      const newTabs = state.tabs.filter((_, i) => i !== index);
      if (newTabs.length === 0) {
        const blankTab = createBlankTab();
        return {
          ...state,
          tabs: [blankTab],
          activeIndex: 0,
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
      let newActiveIndex = state.activeIndex;
      if (index === state.activeIndex) {
        newActiveIndex = Math.min(index, newTabs.length - 1);
      } else if (index < state.activeIndex) {
        newActiveIndex = state.activeIndex - 1;
      }
      const tab = newTabs[newActiveIndex];
      if (tab.type === "environment") {
        return {
          ...state,
          tabs: newTabs,
          activeIndex: newActiveIndex,
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
      } else {
        const req = tab.requestData!;
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
    }
    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.payload };
    case "SET_REQUEST_FIELDS": {
      const newState = { ...state, ...action.payload };
      const activeTab = newState.tabs[newState.activeIndex];
      if (activeTab && activeTab.type === "request") {
        const updatedTab = { ...activeTab };
        let changed = false;
        if (
          action.payload.method !== undefined &&
          action.payload.method !== activeTab.method
        ) {
          updatedTab.method = action.payload.method;
          changed = true;
        }
        if (
          action.payload.url !== undefined &&
          action.payload.url !== activeTab.url
        ) {
          updatedTab.url = action.payload.url;
          updatedTab.name = action.payload.url.trim() ? undefined : "Untitled";
          changed = true;
        }
        if (action.payload.queryParams !== undefined) {
          updatedTab.requestData = {
            ...activeTab.requestData!,
            query_params: action.payload.queryParams,
          };
          changed = true;
        }
        if (changed) {
          const newTabs = [...newState.tabs];
          newTabs[newState.activeIndex] = updatedTab;
          newState.tabs = newTabs;
        }
      }
      return newState;
    }
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
        (t) => t.type === "request" && t.requestId === state.currentRequestId,
      );
      if (index === -1) return state;
      const oldTab = state.tabs[index] as Tab & {
        type: "request";
        requestData: RequestOut;
      };
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
        requestId,
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

const RequestBuilder = forwardRef<RequestBuilderHandle, RequestBuilderProps>(
  ({ initialRequest, environmentId, loading: externalLoading }, ref) => {
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

    const lastOpenedRequestIdRef = useRef<number | null>(null);

    useEffect(() => {
      if (
        initialRequest &&
        initialRequest.id !== lastOpenedRequestIdRef.current
      ) {
        lastOpenedRequestIdRef.current = initialRequest.id;
        dispatch({ type: "OPEN_REQUEST", payload: initialRequest });
      }
    }, [initialRequest]);

    useImperativeHandle(ref, () => ({
      openEnvironmentTab: async (envId?: number) => {
        if (envId) {
          try {
            const env = await getEnvironment(envId);
            const vars = await getVariables(envId);
            dispatch({
              type: "OPEN_EXISTING_ENVIRONMENT_TAB",
              payload: {
                id: env.id,
                name: env.name,
                variables: vars.map((v) => ({
                  id: v.id,
                  key: v.key,
                  value: v.value,
                })),
              },
            });
          } catch (err) {
            console.error("Failed to load environment", err);
          }
        } else {
          dispatch({ type: "OPEN_ENVIRONMENT_TAB" });
        }
      },
    }));

    const buildFullUrl = (base: string, params: Record<string, string>) => {
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

    const handleUrlChange = (input: string) => {
      try {
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

    const handleSend = async () => {
      const filteredHeaders = Object.fromEntries(
        Object.entries(headers).filter(
          ([key, value]) => key.trim() !== "" && value.trim() !== "",
        ),
      );
      const filteredQueryParams = Object.fromEntries(
        Object.entries(queryParams).filter(
          ([key, value]) => key.trim() !== "" && value.trim() !== "",
        ),
      );
      const payload: SendRequestPayload = {
        method,
        url,
        query_params: filteredQueryParams,
        headers: filteredHeaders,
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
      method: tab.type === "request" ? tab.method || "GET" : "env",
      url:
        tab.type === "request" ? tab.url || "" : tab.envName || "Environment",
      name:
        tab.type === "request"
          ? tab.name || tab.url
          : tab.envName || "Environment",
    }));

    const isLoading = internalLoading || externalLoading || false;
    const activeTabObject = activeIndex >= 0 ? tabs[activeIndex] : null;

    return (
      <div className="flex flex-col h-full bg-black text-white">
        <div className="flex items-center border-b border-gray-800 bg-black shrink-0 px-2">
          <div className="flex-1 min-w-0 overflow-x-auto">
            <RequestTabsBar
              tabs={tabsBarData}
              activeTabId={activeTabId}
              onSelectTab={(id) => {
                const index = tabs.findIndex((t) => t.id === id);
                if (index >= 0)
                  dispatch({ type: "SELECT_TAB", payload: index });
              }}
              onCloseTab={(id) => {
                const index = tabs.findIndex((t) => t.id === id);
                if (index >= 0) {
                  dispatch({ type: "CLOSE_TAB", payload: index });
                }
              }}
            />
          </div>
          <button
            onClick={() => dispatch({ type: "OPEN_BLANK_TAB" })}
            className="flex-shrink-0 ml-1 p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {activeTabObject?.type === "environment" ? (
          <EnvironmentEditor
            key={activeTabObject.id}
            environmentId={activeTabObject.environmentId}
            initialName={activeTabObject.envName || "New Environment"}
            initialVariables={
              activeTabObject.variables || [{ key: "", value: "" }]
            }
            onSave={(id, name) => {
              const index = tabs.findIndex((t) => t.id === activeTabObject.id);
              if (index >= 0) dispatch({ type: "CLOSE_TAB", payload: index });
            }}
            onCancel={() => {
              const index = tabs.findIndex((t) => t.id === activeTabObject.id);
              if (index >= 0) dispatch({ type: "CLOSE_TAB", payload: index });
            }}
          />
        ) : (
          <>
            <RequestHeader
              method={method}
              setMethod={(m) =>
                dispatch({ type: "SET_REQUEST_FIELDS", payload: { method: m } })
              }
              url={fullUrl}
              setUrl={handleUrlChange}
              onSend={handleSend}
              onSave={handleSaveClick}
              loading={isLoading}
            />
            <RequestTabs
              activeTab={activeTab}
              setActiveTab={(tab) =>
                dispatch({ type: "SET_ACTIVE_TAB", payload: tab })
              }
            >
              <div className="flex-1 p-4 overflow-auto bg-black relative">
                {activeTab === "headers" && (
                  <HeadersEditor
                    headers={headers}
                    onChange={(newHeaders) =>
                      dispatch({
                        type: "SET_REQUEST_FIELDS",
                        payload: { headers: newHeaders },
                      })
                    }
                  />
                )}
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
                {activeTab === "body" && (
                  <BodyEditor
                    body={body}
                    setBody={(b) =>
                      dispatch({
                        type: "SET_REQUEST_FIELDS",
                        payload: { body: b },
                      })
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
          </>
        )}
        <SaveModal
          isOpen={showSaveModal}
          onClose={() =>
            dispatch({ type: "SET_SHOW_SAVE_MODAL", payload: false })
          }
          requestId={currentRequestId!}
        />
      </div>
    );
  },
);

RequestBuilder.displayName = "RequestBuilder";
export default RequestBuilder;
