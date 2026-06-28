interface Props {
  method: string;
  setMethod: (m: string) => void;
  url: string;
  setUrl: (u: string) => void;
  onSend: () => void;
  loading: boolean;
}

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

export default function RequestHeader({
  method,
  setMethod,
  url,
  setUrl,
  onSend,
  loading,
}: Props) {
  return (
    <div className="flex items-center gap-2 p-2 border-b border-gray-800 bg-black shrink-0">
      <select
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        className="border border-gray-700 bg-gray-900 text-white rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
      >
        {methods.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter URL or paste text"
        className="flex-1 border border-gray-700 bg-gray-900 text-white rounded px-3 py-1 text-sm focus:outline-none focus:border-blue-500"
      />
      <div className="flex gap-1">
        <button className="px-3 py-1 text-sm text-gray-400 hover:text-white border border-gray-700 rounded">
          Save
        </button>
        <button
          onClick={onSend}
          disabled={loading}
          className="px-4 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
