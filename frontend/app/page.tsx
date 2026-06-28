"use client";

import { useState } from "react";
import TopBar from "./components/TopBar";
import Sidebar from "./components/Sidebar";
import RequestBuilder from "./components/RequestBuilder";
import { getRequest, RequestOut } from "./lib/apiClient";

export default function Home() {
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(
    null,
  );
  const [currentRequest, setCurrentRequest] = useState<RequestOut | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<
    number | null
  >(null);

  const handleSelectRequest = async (id: number) => {
    setSelectedRequestId(id);
    setLoading(true);
    try {
      const data = await getRequest(id);
      setCurrentRequest(data);
    } catch (err) {
      console.error("Failed to load request", err);
      setCurrentRequest(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black">
      <TopBar
        selectedEnvironmentId={selectedEnvironmentId}
        onEnvironmentChange={setSelectedEnvironmentId}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          onSelectRequest={handleSelectRequest}
          selectedRequestId={selectedRequestId}
        />
        <div className="flex-1 overflow-hidden">
          <RequestBuilder
            initialRequest={currentRequest}
            environmentId={selectedEnvironmentId || undefined}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
