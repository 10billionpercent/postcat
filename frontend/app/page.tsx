"use client";

import { useState, useRef } from "react";
import TopBar from "./components/TopBar";
import Sidebar, { type SidebarHandle } from "./components/Sidebar";
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
  const sidebarRef = useRef<SidebarHandle>(null);
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

  const handleRequestSent = () => {
    if (sidebarRef.current) {
      sidebarRef.current.refreshHistory();
    }
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
          ref={sidebarRef}
          onSelectRequest={handleSelectRequest}
          selectedRequestId={selectedRequestId}
          onOpenEnvironmentTab={handleOpenEnvironmentTab}
          onSelectEnvironment={(id) =>
            requestBuilderRef.current?.openEnvironmentTab(id)
          }
        />
        <div className="flex-1 overflow-hidden">
          {/* Always render RequestBuilder – never unmount */}
          <RequestBuilder
            ref={requestBuilderRef}
            initialRequest={currentRequest}
            onRequestSent={handleRequestSent}
            environmentId={selectedEnvironmentId || undefined}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
