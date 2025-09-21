export default function AskToolbar({
  askText,
  setAskText,
  onAsk,
  isGenerating,
  error,
}) {
  return (
    <div className="editor-toolbar px-4 py-3 border-b border-[var(--border)] bg-gradient-to-r from-[var(--bg)] via-[#1a2b26] to-[var(--bg)] relative overflow-hidden">
      {/* Subtle animated background accent */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--accent)]/5 to-transparent opacity-60 animate-pulse"></div>
      
      <div className="relative flex items-center gap-3">
        {/* AI Icon */}
        <div className="flex items-center gap-2 text-[var(--accent)] font-semibold">
          <div className="w-6 h-6 bg-gradient-to-br from-[var(--accent)] to-[#15c7aa] rounded-lg flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path 
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
          <span className="text-sm font-medium">AI Assistant</span>
        </div>

        {/* Enhanced Input */}
        <div className="flex-1 relative">
          <input
            className="ask-input-enhanced mono w-full bg-[#1f2b27] border-2 border-[var(--accent)]/30 focus:border-[var(--accent)]/60 rounded-lg px-4 py-2 text-[var(--text)] placeholder-[var(--muted)] transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(25,227,194,0.1)] focus:outline-none"
            placeholder="✨ Ask AI to create, modify, or explain code..."
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
          {/* Input glow effect when focused */}
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[var(--accent)]/10 to-[#15c7aa]/10 opacity-0 transition-opacity duration-200 pointer-events-none focus-within:opacity-100"></div>
        </div>

        {/* Enhanced Button */}
        <button
          className={`btn-ai-primary px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-200 transform ${
            isGenerating || !askText.trim()
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-60'
              : 'bg-gradient-to-r from-[var(--accent)] to-[#15c7aa] text-black hover:from-[#15c7aa] hover:to-[var(--accent)] hover:scale-105 hover:shadow-[0_0_20px_rgba(25,227,194,0.3)] active:scale-95'
          }`}
          disabled={isGenerating || !askText.trim()}
          onClick={onAsk}
        >
          {isGenerating ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              Thinking...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path 
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
              Ask AI
            </div>
          )}
        </button>
      </div>

      {/* Status Messages */}
      <div className="relative mt-2">
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
              <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
            </svg>
            {error}
          </div>
        )}
        {!error && !isGenerating && !askText.trim() && (
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>
              Type your request above to get started • Examples: "create a calculator", "add error handling", "explain this code"
            </span>
          </div>
        )}
        {isGenerating && (
          <div className="flex items-center gap-2 text-[var(--accent)] text-xs">
            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
            <span>AI is processing your request...</span>
          </div>
        )}
      </div>
    </div>
  );
}
