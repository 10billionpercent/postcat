interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

const tabs = [
  { id: "params", label: "Params" },
  { id: "auth", label: "Authorization" },
  { id: "headers", label: "Headers" },
  { id: "body", label: "Body" },
  { id: "pre-script", label: "Pre-request Script" },
  { id: "tests", label: "Tests" },
  { id: "settings", label: "Settings" },
  { id: "cookies", label: "Cookies" },
];

export default function RequestTabs({
  activeTab,
  setActiveTab,
  children,
}: Props) {
  return (
    <div className="flex flex-col flex-1 min-h-0 bg-black">
      <div className="flex border-b border-gray-800 bg-black shrink-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-blue-500 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto bg-black">{children}</div>
    </div>
  );
}
