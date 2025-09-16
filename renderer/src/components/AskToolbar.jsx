export default function AskToolbar({
  askText,
  setAskText,
  onAsk,
  isGenerating,
  error,
}) {
  return (
    <div className="editor-toolbar px-3 py-2 border-b border-[var(--border)] flex items-center gap-2">
      <input
        className="ask-input mono"
        placeholder="Ask AI to modify or explain..."
        value={askText}
        onChange={(e) => setAskText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!isGenerating && askText.trim()) onAsk();
          }
        }}
        disabled={isGenerating}
      />
      <button
        className="btn"
        disabled={isGenerating || !askText.trim()}
        onClick={onAsk}
      >
        {isGenerating ? "Asking..." : "Ask AI"}
      </button>
      {error && <div className="text-red-400 text-xs">{error}</div>}
      {!error && !isGenerating && !askText.trim() && (
        <div className="muted text-xs">
          Tip: Select a storage folder to save results.
        </div>
      )}
      <div className="toolbar-spacer" />
      <button
        className="icon-gear"
        title="Settings"
        onClick={() => {
          const ev = new CustomEvent("open-settings");
          window.dispatchEvent(ev);
        }}
      >
        ⚙️
      </button>
    </div>
  );
}
