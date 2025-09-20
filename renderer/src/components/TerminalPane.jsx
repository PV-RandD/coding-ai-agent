export default function TerminalPane({
  terminalVisible,
  setTerminalVisible,
  activeTermTab,
  setActiveTermTab,
  runOutput,
  termLines,
  setTermLines,
  termCmd,
  setTermCmd,
  termInputRef,
  setTermScrollRef,
  termHistory,
  setTermHistory,
  setTermHistIdx,
  cwd,
  isRunning,
  onStop,
}) {
  return (
    <div className="terminal-container w-full">
      <div className="terminal-head">
        <div className="terminal-tabs">
          <button
            className={`term-tab ${activeTermTab === "output" ? "active" : ""}`}
            onClick={() => setActiveTermTab("output")}
          >
            Output
          </button>
          <button
            className={`term-tab ${
              activeTermTab === "terminal" ? "active" : ""
            }`}
            onClick={() => {
              setActiveTermTab("terminal");
              setTimeout(() => {
                if (termInputRef.current) termInputRef.current.focus();
              }, 0);
            }}
          >
            Terminal
          </button>
        </div>
        <div className="terminal-actions">
          {activeTermTab === "output" && isRunning && (
            <button
              className="tbtn-icon"
              title="Stop current execution"
              onClick={onStop}
            >
              ■
            </button>
          )}
          <button
            className="tbtn-icon"
            title="Clear"
            onClick={() => setTermLines([])}
          >
            ⟲
          </button>
          <button
            className="tbtn-icon"
            title={terminalVisible ? "Close" : "Open"}
            onClick={() => setTerminalVisible(!terminalVisible)}
          >
            {terminalVisible ? "✕" : "⤢"}
          </button>
        </div>
      </div>
      {terminalVisible && (
        <div className="terminal-unified">
          {activeTermTab === "output" ? (
            <div className="terminal-scroll mono whitespace-pre output-pre">
              {runOutput || "No output yet."}
            </div>
          ) : (
            <div className="terminal-scroll mono" ref={setTermScrollRef}>
              {termLines.map((ln, i) => (
                <div
                  key={i}
                  className={`term-line ${
                    typeof ln === "string" && ln.startsWith("$ ")
                      ? "term-cmd"
                      : ""
                  }`}
                >
                  {ln}
                </div>
              ))}
              <div className="terminal-inline-row">
                <span className="prompt">$</span>
                <input
                  className="term-input-blend mono"
                  placeholder="type a command and press Enter"
                  value={termCmd}
                  onChange={(e) => setTermCmd(e.target.value)}
                  ref={termInputRef}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      const cmd = termCmd.trim();
                      if (!cmd) return;
                      setTermLines((prev) => [...prev, `$ ${cmd}`]);
                      setTermHistory((h) => [...h, cmd]);
                      setTermHistIdx(-1);
                      setTermCmd("");
                      const r = await window.api.runCommand({ command: cmd, cwd });
                      const out =
                        (r.stdout || "") +
                          (r.stderr ? (r.stdout ? "\n" : "") + r.stderr : "") ||
                        r.error ||
                        "";
                      const outLines = out.split(/\n/);
                      setTermLines((prev) => [...prev, ...outLines]);
                      setTimeout(() => {
                        if (setTermScrollRef && setTermScrollRef.current) {
                          setTermScrollRef.current.scrollTop =
                            setTermScrollRef.current.scrollHeight;
                        }
                      }, 0);
                      return;
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setTermHistIdx((idx) => {
                        const h = termHistory;
                        const next =
                          idx === -1 ? h.length - 1 : Math.max(0, idx - 1);
                        setTermCmd(h[next] || "");
                        return next;
                      });
                    }
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setTermHistIdx((idx) => {
                        const h = termHistory;
                        if (idx === -1) return -1;
                        const next = idx + 1;
                        if (next >= h.length) {
                          setTermCmd("");
                          return -1;
                        }
                        setTermCmd(h[next]);
                        return next;
                      });
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
