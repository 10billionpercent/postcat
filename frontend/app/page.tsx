"use client";

import { useState, useRef } from "react";
import TopBar from "./components/TopBar";
import Sidebar from "./components/Sidebar";
import RequestBuilder, {
  type RequestBuilderHandle,
} from "./components/RequestBuilder";
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
  const requestBuilderRef = useRef<RequestBuilderHandle>(null);

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

  const handleSelectEnvironment = async (id: number) => {
    requestBuilderRef.current?.openEnvironmentTab(id);
  };

  const handleOpenEnvironmentTab = () => {
    requestBuilderRef.current?.openEnvironmentTab();
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
          onSelectEnvironment={handleSelectEnvironment}
          selectedRequestId={selectedRequestId}
          onOpenEnvironmentTab={handleOpenEnvironmentTab}
        />
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Loading request...
            </div>
          ) : (
            <RequestBuilder
              ref={requestBuilderRef}
              initialRequest={currentRequest}
              environmentId={selectedEnvironmentId || undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
}
