import { useEffect, useState } from "react";

export default function SettingsModal({ open, onClose }) {
  const [key, setKey] = useState("");

  useEffect(() => {
    if (!open) return;
    try {
      const k = localStorage.getItem("OPENAI_KEY") || "";
      setKey(k);
    } catch {
      setKey("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-[#0b1220] border border-[var(--border)] rounded p-4 w-[520px] max-w-[90vw]">
        <div className="flex items-center justify-between mb-3">
          <div className="heading">Settings</div>
          <button className="tbtn-icon" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="mb-3">
          <div className="muted text-xs mb-1">OpenAI API Key</div>
          <input
            className="input mono w-full"
            type="password"
            placeholder="sk-..."
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <div className="muted text-[10px] mt-1">
            Stored locally in your browser (localStorage). Used only for
            requests from this app.
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn"
            onClick={() => {
              try {
                if (key.trim()) {
                  localStorage.setItem("OPENAI_KEY", key.trim());
                } else {
                  localStorage.removeItem("OPENAI_KEY");
                }
              } catch {
                /* no-op */
              }
              onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
