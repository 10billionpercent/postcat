"use client";

import { useReducer, useEffect } from "react";
import RequestHeader from "./RequestHeader";
import RequestTabs from "./RequestTabs";
import ResponsePanel from "./ResponsePanel";
import BodyEditor from "./BodyEditor";
import SaveModal from "./SaveModal";
import {
  sendRequest,
  SendRequestPayload,
  RequestOut,
} from "../../lib/apiClient";

interface RequestBuilderProps {
  initialRequest?: RequestOut | null;
}

type State = {
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
  | { type: "LOAD_REQUEST"; payload: RequestOut }
  | { type: "SET_METHOD"; payload: string }
  | { type: "SET_URL"; payload: string }
  | { type: "SET_QUERY_PARAMS"; payload: Record<string, string> }
  | { type: "SET_HEADERS"; payload: Record<string, string> }
  | { type: "SET_AUTH"; payload: any }
  | { type: "SET_BODY"; payload: string }
  | { type: "SET_BODY_TYPE"; payload: string }
  | { type: "SET_CURRENT_REQUEST_ID"; payload: number | null }
  | { type: "SET_RESPONSE"; payload: any }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_SHOW_SAVE_MODAL"; payload: boolean };

const initialState: State = {
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

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOAD_REQUEST":
      const responseData =
        action.payload.response_status && action.payload.response_body
          ? {
              statusCode: action.payload.response_status,
              headers: action.payload.response_headers || {},
              body: action.payload.response_body,
              responseTime: action.payload.response_time || 0,
              responseSize: new Blob([action.payload.response_body]).size,
            }
          : null;

      return {
        ...state,
        method: action.payload.method,
        url: action.payload.url,
        queryParams: action.payload.query_params || {},
        headers: action.payload.headers || {},
        auth: action.payload.auth || null,
        body: action.payload.body || "",
        bodyType: action.payload.body_type || "none",
        currentRequestId: action.payload.id,
        response: responseData, // either the response object or null
        error: null,
      };
    case "SET_METHOD":
      return { ...state, method: action.payload };
    case "SET_URL":
      return { ...state, url: action.payload };
    case "SET_QUERY_PARAMS":
      return { ...state, queryParams: action.payload };
    case "SET_HEADERS":
      return { ...state, headers: action.payload };
    case "SET_AUTH":
      return { ...state, auth: action.payload };
    case "SET_BODY":
      return { ...state, body: action.payload };
    case "SET_BODY_TYPE":
      return { ...state, bodyType: action.payload };
    case "SET_CURRENT_REQUEST_ID":
      return { ...state, currentRequestId: action.payload };
    case "SET_RESPONSE":
      return { ...state, response: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_SHOW_SAVE_MODAL":
      return { ...state, showSaveModal: action.payload };
    default:
      return state;
  }
}

export default function RequestBuilder({
  initialRequest,
}: RequestBuilderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    method,
    url,
    queryParams,
    headers,
    auth,
    body,
    bodyType,
    currentRequestId,
    response,
    loading,
    error,
    showSaveModal,
  } = state;

  // Load request from sidebar
  useEffect(() => {
    if (initialRequest) {
      dispatch({ type: "LOAD_REQUEST", payload: initialRequest });
    }
  }, [initialRequest]);

  const handleSend = async () => {
    const payload: SendRequestPayload = {
      method,
      url,
      query_params: queryParams,
      headers,
      auth,
      ...(bodyType !== "none" && { body, body_type: bodyType }),
    };

    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    try {
      const result = await sendRequest(payload);
      dispatch({ type: "SET_RESPONSE", payload: result });
      if (result.request_id) {
        dispatch({
          type: "SET_CURRENT_REQUEST_ID",
          payload: result.request_id,
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
    if (!currentRequestId) {
      alert("Send the request first or load an existing request to save.");
      return;
    }
    dispatch({ type: "SET_SHOW_SAVE_MODAL", payload: true });
  };

  const handleSaveSuccess = () => {
    alert("Request saved to collection!");
    // Optionally refresh sidebar
  };

  return (
    <div className="flex flex-col h-full bg-black text-white">
      <RequestHeader
        method={method}
        setMethod={(m) => dispatch({ type: "SET_METHOD", payload: m })}
        url={url}
        setUrl={(u) => dispatch({ type: "SET_URL", payload: u })}
        onSend={handleSend}
        onSave={handleSaveClick}
        loading={loading}
      />
      <RequestTabs activeTab="body" setActiveTab={() => {}}>
        <div className="flex-1 p-4 overflow-auto bg-black">
          {/** For now we only have body tab, but we can extend later */}
          <BodyEditor
            body={body}
            setBody={(b) => dispatch({ type: "SET_BODY", payload: b })}
            bodyType={bodyType}
            setBodyType={(bt) =>
              dispatch({ type: "SET_BODY_TYPE", payload: bt })
            }
          />
        </div>
      </RequestTabs>
      {error && (
        <div className="border-t border-red-800 p-2 text-red-400 text-sm bg-red-950">
          Error: {error}
        </div>
      )}
      <ResponsePanel response={response} loading={loading} />

      <SaveModal
        isOpen={showSaveModal}
        onClose={() =>
          dispatch({ type: "SET_SHOW_SAVE_MODAL", payload: false })
        }
        requestId={currentRequestId!}
        onSuccess={handleSaveSuccess}
      />
    </div>
  );
}
