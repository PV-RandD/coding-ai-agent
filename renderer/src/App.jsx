import { useEffect, useState, useRef, useCallback } from "react";
import AssistantPane from "./components/AssistantPane";
import Sidebar from "./components/Sidebar";
import AskToolbar from "./components/AskToolbar";
import FileBar from "./components/FileBar";
import EditorPane from "./components/EditorPane";
import TerminalPane from "./components/TerminalPane";
import SettingsModal from "./components/SettingsModal";
import {
  listScripts,
  getScript,
  runScript,
  saveScript,
  createScript,
  searchScripts,
} from "./lib/api";
import useToast from "./components/useToast.js";

function App() {
  const { showToast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const [scripts, setScripts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [runOutput, setRunOutput] = useState("");
  const [storageDir, setStorageDir] = useState("");
  const [editableCode, setEditableCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [askText, setAskText] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Terminal state
  const [terminalVisible, setTerminalVisible] = useState(true);
  const [termCmd, setTermCmd] = useState("");
  const [termLines, setTermLines] = useState([]);
  const [termHistory, setTermHistory] = useState([]);
  const [, setTermHistIdx] = useState(-1);
  const termScrollRef = useRef(null);
  const termInputRef = useRef(null);
  const setTermScrollRef = (el) => {
    termScrollRef.current = el;
  };
  const [activeTermTab, setActiveTermTab] = useState("terminal");

  // Data fetchers
  const fetchList = useCallback(async () => {
    try {
      const data = await listScripts();
      setScripts(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast(`Failed to load scripts: ${String(e)}`, "error", 4000);
    }
  }, [showToast]);

  const fetchOne = useCallback(
    async (id) => {
      try {
        const data = await getScript(id);
        setSelected(data && data._id ? data : null);
      } catch (e) {
        showToast(`Failed to load file: ${String(e)}`, "error", 4000);
      }
    },
    [showToast]
  );

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    function onOpenSettings() {
      setSettingsOpen(true);
    }
    window.addEventListener("open-settings", onOpenSettings);
    return () => window.removeEventListener("open-settings", onOpenSettings);
  }, []);

  // Focus terminal input when switching to Terminal tab and panel is visible
  useEffect(() => {
    if (
      activeTermTab === "terminal" &&
      terminalVisible &&
      termInputRef.current
    ) {
      termInputRef.current.focus();
    }
  }, [activeTermTab, terminalVisible]);

  // Auto-scroll terminal when new lines are added
  useEffect(() => {
    if (termScrollRef.current) {
      termScrollRef.current.scrollTop = termScrollRef.current.scrollHeight;
    }
  }, [termLines]);

  useEffect(() => {
    const q = search.trim();
    if (!q) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await searchScripts(q);
        if (!cancelled) setScripts(Array.isArray(data) ? data : []);
      } catch (e) {
        showToast(`Search failed: ${String(e)}`, "error", 3000);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [search, showToast]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    fetchOne(selectedId);
  }, [selectedId, fetchOne]);

  useEffect(() => {
    if (selected && typeof selected.code === "string") {
      setEditableCode(selected.code);
      setAiMessage(selected.explanation || "");
    } else {
      setEditableCode("");
      setAiMessage("");
    }
  }, [selected]);

  useEffect(() => {
    (async () => {
      const res = await window.api.getStorageDir();
      if (res.ok) setStorageDir(res.storageDir);
    })();
  }, []);

  async function handleAskAI() {
    const q = askText.trim();
    if (!q) return;
    // Guard: ensure storage selected before creating a script
    const storageCheck = await window.api.getStorageDir();
    if (!storageCheck.ok || !storageCheck.storageDir) {
      setError("No storage selected");
      showToast("Please select a storage folder first.", "error", 3500);
      return;
    }
    setIsGenerating(true);
    setError("");
    try {
      const saved = await createScript(q);
      // Load response into editor and assistant panel
      if (typeof saved.code === "string") setEditableCode(saved.code);
      setAiMessage(saved.explanation || "");
      // Save to list and select new script
      await fetchList();
      if (saved._id) setSelectedId(saved._id);
      setAskText("");
    } catch (e) {
      setError(String(e));
      showToast(`Ask failed: ${String(e)}`, "error", 4000);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="h-screen w-[100vw] text-white bg-gray-900 flex flex-col">
      <div className="titlebar flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 text-sm">
          <span className="logo-dot" />
          <span className="font-semibold">LLM Desktop</span>
          <span className="muted">/ Scripts</span>
        </div>
        <div className="muted text-xs">
          {storageDir ? `Storage: ${storageDir}` : "No storage selected"}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <Sidebar
          scripts={scripts}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          storageDir={storageDir}
          search={search}
          setSearch={setSearch}
          onSelectFolder={async () => {
            const r = await window.api.selectStorageDir();
            if (r.ok) {
              setStorageDir(r.storageDir);
              await fetchList();
            }
          }}
        />

        <div className="flex-1 min-w-0 flex flex-col border-[var(--border)]">
          <div className="flex-1 min-h-0 p-0 flex flex-col">
            <AskToolbar
              askText={askText}
              setAskText={setAskText}
              onAsk={handleAskAI}
              isGenerating={isGenerating}
              error={error}
            />

            <FileBar
              selected={selected}
              onClose={() => {
                setSelectedId("");
                setSelected(null);
              }}
              onRun={async () => {
                if (!selected?._id) return;
                setRunOutput("");
                setTerminalVisible(true);
                setActiveTermTab("output");
                try {
                  const data = await runScript(selected._id);
                  const out = `${data.stdout || ""}${
                    data.stderr ? "\n---\n" + data.stderr : ""
                  }`;
                  const help =
                    Array.isArray(data.suggestions) && data.suggestions.length
                      ? "\n\nSuggestions:\n- " + data.suggestions.join("\n- ")
                      : "";
                  setRunOutput(out + help);
                } catch (e) {
                  setRunOutput(String(e));
                  showToast(`Run error: ${String(e)}`, "error", 4000);
                }
              }}
              onSave={async () => {
                if (!selected?._id) return;
                setIsSaving(true);
                try {
                  await saveScript(selected._id, editableCode);
                  await fetchOne(selected._id);
                } catch (e) {
                  setError(String(e));
                  showToast(`Save failed: ${String(e)}`, "error", 4000);
                } finally {
                  setIsSaving(false);
                }
              }}
              isSaving={isSaving}
            />

            <div className="workbench flex-1 min-h-0 flex">
              <EditorPane
                selected={selected}
                editableCode={editableCode}
                setEditableCode={setEditableCode}
              />
              <AssistantPane
                selected={selected}
                editableCode={editableCode}
                setEditableCode={setEditableCode}
                aiMessage={aiMessage}
                setAiMessage={setAiMessage}
              />
            </div>
          </div>
        </div>
      </div>

      <TerminalPane
        terminalVisible={terminalVisible}
        setTerminalVisible={setTerminalVisible}
        activeTermTab={activeTermTab}
        setActiveTermTab={setActiveTermTab}
        runOutput={runOutput}
        termLines={termLines}
        setTermLines={setTermLines}
        termCmd={termCmd}
        setTermCmd={setTermCmd}
        termInputRef={termInputRef}
        setTermScrollRef={setTermScrollRef}
        termHistory={termHistory}
        setTermHistory={setTermHistory}
        setTermHistIdx={setTermHistIdx}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
