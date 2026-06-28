export default function TopBar() {
  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-black shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-lg text-white">Postcat</span>
        <span className="text-sm text-gray-400">Default workspace</span>
      </div>
      <div className="flex items-center gap-2">
        <button className="px-3 py-1 text-sm text-gray-300 border border-gray-700 rounded hover:bg-gray-900">
          Invite
        </button>
        <button className="px-3 py-1 text-sm text-gray-300 border border-gray-700 rounded hover:bg-gray-900">
          Upgrade
        </button>
        <button className="px-3 py-1 text-sm text-gray-300 border border-gray-700 rounded hover:bg-gray-900">
          Share
        </button>
        <span className="text-sm text-gray-500">No environment</span>
      </div>
    </header>
  );
}
