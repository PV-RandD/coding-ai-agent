import { useState } from "react";
import useToast from "./useToast.js";
import { aiTransform, saveScript } from "../lib/api";

export default function AssistantPane({
  selected,
  editableCode,
  setEditableCode,
  aiMessage,
  setAiMessage,
}) {
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantBusy, setAssistantBusy] = useState(false);
  const { showToast } = useToast();

  async function handleSend() {
    const msg = assistantInput.trim();
    if (!msg) return;
    setAssistantBusy(true);
    try {
      const prevMessage = aiMessage;
      const data = await aiTransform({
        prompt: msg,
        code: editableCode,
        name: selected?.name,
      });
      const beforeCode = editableCode;
      const fileId = selected?._id;
      if (data && typeof data.code === "string" && data.code !== beforeCode) {
        const keep = window.confirm(
          "AI modified the file. Keep changes and save? Click Cancel to discard and revert."
        );
        if (keep) {
          setEditableCode(data.code);
          try {
            if (fileId) {
              await saveScript(fileId, data.code);
              showToast("File saved successfully!", "success", 2000);
            }
          } catch (e) {
            setAiMessage(String(e));
            showToast(`Save failed: ${String(e)}`, "error", 4000);
          }
          if (data.explanation) setAiMessage(data.explanation);
        } else {
          setEditableCode(beforeCode);
          // Restore previous assistant message instead of showing discard note or new explanation
          setAiMessage(prevMessage);
        }
      } else if (data && data.explanation) {
        setAiMessage(data.explanation);
      }
      setAssistantInput("");
    } catch (err) {
      setAiMessage(String(err));
      showToast(`Assistant error: ${String(err)}`, "error", 4000);
    } finally {
      setAssistantBusy(false);
    }
  }

  return (
    <div className="assistant-pane w-[360px] border-l border-[var(--border)] p-4 overflow-hidden relative">
      <div className="heading mb-2 flex items-center gap-2">
        <span>Assistant</span>
        {assistantBusy && (
          <span className="muted text-xs px-2 py-[2px] border border-[var(--border)] rounded">
            Thinking...
          </span>
        )}
      </div>
      <div className="assistant-content muted text-sm whitespace-pre-wrap">
        {aiMessage ||
          "No response yet. Ask AI from the toolbar or via the chat below."}
      </div>
      {selected && (
        <div className="assistant-chat sticky-input">
          <input
            className="input mono"
            placeholder="Describe changes for this file..."
            value={assistantInput}
            onChange={(e) => setAssistantInput(e.target.value)}
            disabled={assistantBusy}
            onKeyDown={async (e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                await handleSend();
              }
            }}
          />
          <button
            className="tbtn-icon"
            disabled={assistantBusy || !assistantInput.trim()}
            title="Send"
            onClick={handleSend}
          >
            {assistantBusy ? "…" : "➤"}
          </button>
        </div>
      )}
    </div>
  );
}
