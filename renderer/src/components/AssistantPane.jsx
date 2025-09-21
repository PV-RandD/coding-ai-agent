import { useState } from "react";
import useToast from "./useToast.js";
import { aiTransform, saveScript, runScript } from "../lib/api";
import CodeActionPopup from "./CodeActionPopup.jsx";

export default function AssistantPane({
  selected,
  editableCode,
  setEditableCode,
  aiMessage,
  setAiMessage,
  onRunCode, // Function to run code from parent
  onShowOutput, // Function to show output panel from parent
}) {
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [pendingCodeData, setPendingCodeData] = useState(null);
  const [previousMessage, setPreviousMessage] = useState("");
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
        // Auto-apply the changes for Assistant modifications
        setEditableCode(data.code);
        
        try {
          // Auto-save the changes
          if (fileId) {
            await saveScript(fileId, data.code);
            showToast("Code updated by Assistant!", "success", 2000);
          }
          
          // Set explanation
          if (data.explanation) {
            setAiMessage(data.explanation);
          }
          
          // Show popup only for significant changes (more than 50 characters difference)
          const changeSize = Math.abs(data.code.length - beforeCode.length);
          const hasNewFunctions = data.code.includes('function') || data.code.includes('def ') || data.code.includes('class ');
          
          if (changeSize > 50 || hasNewFunctions) {
            // Store the data and show popup for significant changes
            setPendingCodeData({ ...data, beforeCode, fileId });
            setPreviousMessage(prevMessage);
            setShowPopup(true);
          }
        } catch (e) {
          setAiMessage(String(e));
          showToast(`Save failed: ${String(e)}`, "error", 4000);
        }
      } else if (data && data.explanation) {
        setAiMessage(data.explanation);
      }
      setAssistantInput("");
    } catch (err) {
      console.error("Assistant error:", err);
      let errorMessage = String(err);
      
      // Try to extract more specific error information
      if (err.message && err.message.includes("502")) {
        errorMessage = "AI model returned invalid response. Please try again.";
      } else if (err.message && err.message.includes("Failed to parse")) {
        errorMessage = "AI response format error. Please try a simpler request.";
      }
      
      setAiMessage(`Error: ${errorMessage}`);
      showToast(`Assistant error: ${errorMessage}`, "error", 4000);
    } finally {
      setAssistantBusy(false);
    }
  }

  // Handle popup actions
  const handleRunCode = async () => {
    if (!pendingCodeData) return;
    
    // Apply the code changes first
    setEditableCode(pendingCodeData.code);
    
    try {
      // Save the code
      if (pendingCodeData.fileId) {
        await saveScript(pendingCodeData.fileId, pendingCodeData.code);
        showToast("Code saved successfully!", "success", 2000);
      }
      
      // Set explanation
      if (pendingCodeData.explanation) {
        setAiMessage(pendingCodeData.explanation);
      }
      
      // Run the code using the parent's run function
      if (onRunCode && pendingCodeData.fileId) {
        await onRunCode(pendingCodeData.fileId);
        if (onShowOutput) {
          onShowOutput(); // Show the output panel
        }
      }
    } catch (e) {
      setAiMessage(String(e));
      showToast(`Error: ${String(e)}`, "error", 4000);
    }
  };

  const handleEditCode = async () => {
    // Not used for Assistant modifications since code is already applied
  };

  const handleKeepChanges = async () => {
    // Not used for Assistant modifications since code is already applied and saved
  };

  const handleClosePopup = () => {
    // For Assistant modifications, don't revert since changes are already applied and saved
    setShowPopup(false);
    setPendingCodeData(null);
    setPreviousMessage("");
  };

  return (
    <>
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
                if (e.key === "Escape" && showPopup) {
                  handleClosePopup();
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

      {/* Code Action Popup */}
      <CodeActionPopup
        isVisible={showPopup}
        onClose={handleClosePopup}
        onRun={handleRunCode}
        onEdit={handleEditCode}
        onKeep={handleKeepChanges}
        title="Code Updated Successfully"
        message="Assistant has updated your code and saved it. Ready to run?"
        showEditOption={false}
        showKeepOption={false}
      />
    </>
  );
}
