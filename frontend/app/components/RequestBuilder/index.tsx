"use client";

import { useState } from "react";
import RequestHeader from "./RequestHeader";
import RequestTabs from "./RequestTabs";
import ResponsePanel from "./ResponsePanel";
import BodyEditor from "./BodyEditor";
import { sendRequest, SendRequestPayload } from "../../lib/apiClient";

export default function RequestBuilder() {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [activeTab, setActiveTab] = useState("body");
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [auth, setAuth] = useState<any>(null);
  const [body, setBody] = useState("");
  const [bodyType, setBodyType] = useState("none");
  const [environmentId, setEnvironmentId] = useState<number | undefined>(
    undefined,
  ); // for now, undefined

  // Response state
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    // Build payload
    const payload: SendRequestPayload = {
      method,
      url,
      query_params: queryParams,
      headers,
      auth,
      environment_id: environmentId,
      // Only include body and body_type if bodyType is not 'none'
      ...(bodyType !== "none" && {
        body,
        body_type: bodyType,
      }),
    };

    setLoading(true);
    setError(null);
    try {
      const result = await sendRequest(payload);
      setResponse(result);
    } catch (err: any) {
      setError(err.message);
      setResponse(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-white">
      <RequestHeader
        method={method}
        setMethod={setMethod}
        url={url}
        setUrl={setUrl}
        onSend={handleSend}
        loading={loading}
      />
      <RequestTabs activeTab={activeTab} setActiveTab={setActiveTab}>
        <div className="flex-1 p-4 overflow-auto bg-black">
          {activeTab === "params" && (
            <div className="text-gray-400">Params editor (coming soon)</div>
          )}
          {activeTab === "auth" && (
            <div className="text-gray-400">
              Authorization editor (coming soon)
            </div>
          )}
          {activeTab === "headers" && (
            <div className="text-gray-400">Headers editor (coming soon)</div>
          )}
          {activeTab === "body" && (
            <BodyEditor
              body={body}
              setBody={setBody}
              bodyType={bodyType}
              setBodyType={setBodyType}
            />
          )}
        </div>
      </RequestTabs>
      {error && (
        <div className="border-t border-red-800 p-2 text-red-400 text-sm bg-red-950">
          Error: {error}
        </div>
      )}
      <ResponsePanel response={response} loading={loading} />
    </div>
  );
}
