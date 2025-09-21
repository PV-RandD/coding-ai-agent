import { useState, useEffect } from "react";

export default function CodeActionPopup({
  isVisible,
  onClose,
  onRun,
  onEdit,
  onKeep,
  title = "AI Generated Code",
  message = "AI has generated new code. What would you like to do?",
  showRunOption = true,
  showEditOption = true,
  showKeepOption = true,
}) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      // Focus management for accessibility
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isVisible]);

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isVisible) return;
      
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          handleClose();
          break;
        case 'Enter':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleAction(onRun);
          }
          break;
        case '1':
          if (e.altKey && showRunOption) {
            e.preventDefault();
            handleAction(onRun);
          }
          break;
        case '2':
          if (e.altKey) {
            e.preventDefault();
            handleAction(onEdit);
          }
          break;
        case '3':
          if (e.altKey) {
            e.preventDefault();
            handleAction(onKeep);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onRun, onEdit, onKeep, showRunOption, showEditOption, showKeepOption]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleAction = (action) => {
    setIsAnimating(false);
    setTimeout(() => {
      action();
      onClose();
    }, 150);
  };

  if (!isVisible && !isAnimating) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${
        isVisible && isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleClose}
    >
      <div 
        className={`bg-[var(--bg)] border border-[var(--border)] rounded-lg shadow-2xl max-w-md w-full mx-4 transform transition-all duration-200 ${
          isVisible && isAnimating ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(25, 227, 194, 0.1)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--accent)] to-[#15c7aa] rounded-lg flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-black">
                <path 
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text)]">{title}</h3>
              <p className="text-sm text-[var(--muted)] mt-1">{message}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--border)] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[var(--muted)]">
              <path 
                d="M18 6L6 18M6 6l12 12" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-2">
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-[var(--accent)]">Code Ready</span>
            </div>
            <p className="text-sm text-[var(--text)] leading-relaxed">
              The AI has successfully generated or modified your code. You can run it immediately, 
              make edits first, or simply keep the changes.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 p-6 pt-0">
          {showRunOption && (
            <button
              onClick={() => handleAction(onRun)}
              className="flex items-center justify-between w-full bg-gradient-to-r from-[var(--accent)] to-[#15c7aa] text-black font-medium py-3 px-4 rounded-lg hover:from-[#15c7aa] hover:to-[var(--accent)] transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path 
                    d="M8 5v14l11-7z" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    fill="currentColor"
                  />
                </svg>
                Run Code Now
              </div>
              <span className="text-xs opacity-70">Ctrl+Enter</span>
            </button>
          )}
          
          <div className="flex gap-3">
            {showEditOption && (
              <button
                onClick={() => handleAction(onEdit)}
                className="flex flex-col items-center justify-center gap-1 flex-1 bg-[var(--panel)] border border-[var(--border)] text-[var(--text)] font-medium py-3 px-4 rounded-lg hover:bg-[var(--border)] transition-all duration-200"
              >
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path 
                      d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                  Edit First
                </div>
                <span className="text-xs opacity-60">Alt+2</span>
              </button>
            )}
            
            {showKeepOption && (
              <button
                onClick={() => handleAction(onKeep)}
                className="flex flex-col items-center justify-center gap-1 flex-1 bg-[var(--panel)] border border-[var(--border)] text-[var(--text)] font-medium py-3 px-4 rounded-lg hover:bg-[var(--border)] transition-all duration-200"
              >
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path 
                      d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <polyline 
                      points="17,21 17,13 7,13 7,21" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <polyline 
                      points="7,3 7,8 15,8" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                  Keep Changes
                </div>
                <span className="text-xs opacity-60">Alt+3</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-[var(--muted)]">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-[var(--muted)] rounded-full"></div>
                <span>Keyboard shortcuts available</span>
              </div>
              <span>Press Esc to close</span>
            </div>
            <div className="text-xs text-[var(--muted)] opacity-70">
              Ctrl+Enter: Run • Alt+1: Run • Alt+2: Edit • Alt+3: Keep
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
