export default function FileBar({
  selected,
  onClose,
  onRun,
  onStop,
  onSave,
  isSaving,
  isRunning,
}) {
  return (
    <div className="filebar px-3 py-2 border-b border-[var(--border)] flex items-center gap-2">
      <div className="file-pill pill-with-close">
        <span className="pill-name">
          {selected ? selected.name : "Welcome"}
        </span>
        {selected && (
          <button className="pill-close" title="Close file" onClick={onClose}>
            ×
          </button>
        )}
      </div>
      <div className="toolbar-spacer"></div>
      <button className="btn btn-sm disabled:opacity-50" onClick={onRun} disabled={!selected?._id || isRunning}>
        Run
      </button>
      <button
        className="btn btn-danger btn-sm disabled:opacity-50"
        onClick={onStop}
        disabled={!selected?._id || !isRunning}
        title="Stop current execution"
      >
        Stop
      </button>
      <button
        className="btn btn-secondary btn-sm disabled:opacity-50"
        disabled={!selected?._id || isSaving}
        onClick={onSave}
      >
        {isSaving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
