export default function EditorPane({
  selected,
  editableCode,
  setEditableCode,
}) {
  return (
    <div className="editor flex-1 p-4 flex flex-col min-h-0">
      {selected ? (
        <div className="flex flex-col gap-3 min-h-0 flex-1">
          <div className="muted text-sm">
            {new Date(selected.createdAt).toLocaleString()}
          </div>
          {selected.tags && selected.tags.length > 0 && (
            <div className="text-xs muted">
              Tags: {selected.tags.join(", ")}
            </div>
          )}
          <textarea
            className="textarea mono code-editor flex-1 min-h-0"
            value={editableCode}
            onChange={(e) => setEditableCode(e.target.value)}
          />
        </div>
      ) : (
        <div className="p-6">
          <div className="heading mb-2">Welcome</div>
          <div className="muted text-sm">
            Select a script from the Explorer or ask AI to generate a new one.
          </div>
        </div>
      )}
    </div>
  );
}
