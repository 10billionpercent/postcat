"use client";

import { useState, useEffect } from "react";
import TopBar from "./components/TopBar";
import Sidebar from "./components/Sidebar";
import RequestBuilder from "./components/RequestBuilder";
import { getRequest, RequestOut } from "./lib/apiClient";

export default function Home() {
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(
    null,
  );
  const [currentRequest, setCurrentRequest] = useState<RequestOut | null>(null);

  const handleSelectRequest = async (id: number) => {
    setSelectedRequestId(id);
    try {
      const data = await getRequest(id);
      setCurrentRequest(data);
    } catch (err) {
      console.error("Failed to load request", err);
      setCurrentRequest(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          onSelectRequest={handleSelectRequest}
          selectedRequestId={selectedRequestId}
        />
        <div className="flex-1 overflow-hidden">
          <RequestBuilder initialRequest={currentRequest} />
        </div>
      </div>
    </div>
  );
}
