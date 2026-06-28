interface Props {
  response: any; // will be ResponseData
  loading: boolean;
}

export default function ResponsePanel({ response, loading }: Props) {
  if (loading) {
    return (
      <div className="border-t border-gray-200 p-4 h-48 flex items-center justify-center text-gray-500">
        Sending request...
      </div>
    );
  }

  if (!response) {
    return (
      <div className="border-t border-gray-200 p-4 h-48 flex items-center justify-center text-gray-400">
        Response will appear here
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 flex flex-col h-48 shrink-0">
      <div className="flex items-center gap-4 px-4 py-2 bg-black border-b border-gray-200 text-sm">
        <span
          className={`font-medium ${response.statusCode < 400 ? "text-green-600" : "text-red-600"}`}
        >
          {response.statusCode}
        </span>
        <span className="text-gray-600">{response.responseTime} ms</span>
        <span className="text-gray-600">{response.responseSize} bytes</span>
        <button className="ml-auto text-sm text-blue-600 hover:underline">
          Visualize
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 font-mono text-sm whitespace-pre-wrap bg-black">
        {response.body}
      </div>
    </div>
  );
}
