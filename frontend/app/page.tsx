"use client";

import TopBar from "./components/TopBar";
import RequestBuilder from "./components/RequestBuilder";

export default function Home() {
  return (
    <div className="flex flex-col h-full">
      <TopBar />
      <div className="flex-1 overflow-hidden">
        <RequestBuilder />
      </div>
    </div>
  );
}
