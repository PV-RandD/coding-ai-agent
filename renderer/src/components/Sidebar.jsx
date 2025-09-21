export default function Sidebar({
  scripts,
  selectedId,
  setSelectedId,
  storageDir,
  search,
  setSearch,
  onSelectFolder,
}) {
  return (
    <div className="sidebar w-[260px] p-3 overflow-auto">
      <div className="flex items-center justify-between mb-2">
        <div className="heading">Explorer</div>
        <button
          className="btn btn-secondary px-2 py-1 text-xs"
          onClick={onSelectFolder}
        >
          Add Folder
        </button>
      </div>
      <input
        className="input mono mb-3 w-full"
        placeholder="Search scripts"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="muted text-[10px] mb-2 break-all">
        {storageDir || "Select a storage folder"}
      </div>
      <div className="flex flex-col gap-1">
        {scripts.map((s) => (
          <div
            key={s._id}
            className={`sidebar-item cursor-pointer ${
              selectedId === s._id ? "active" : "hover:bg-[#0f141c]"
            }`}
            onClick={() => setSelectedId(s._id)}
          >
            <div className="text-sm truncate">{s.name}</div>
            <div className="text-[10px] muted">
              {new Date(s.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
