import { useEffect, useState } from "react";

export default function FolderSelectionPopup({
  isVisible,
  onClose,
  onSelectFolder,
  title = "No Storage Folder Selected",
  message = "Please select a storage folder to start creating and managing your scripts.",
  showCloseButton = false,
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
          if (showCloseButton) {
            e.preventDefault();
            handleClose();
          }
          break;
        case 'Enter':
          e.preventDefault();
          handleSelectFolder();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, showCloseButton]);

  const handleClose = () => {
    if (!showCloseButton) return; // Don't allow closing if no close button
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleSelectFolder = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onSelectFolder();
    }, 150);
  };

  if (!isVisible && !isAnimating) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${
        isVisible && isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={showCloseButton ? handleClose : undefined}
    >
      <div 
        className={`bg-[var(--panel)] border border-[var(--border)] rounded-xl shadow-2xl max-w-md w-full mx-4 transition-all duration-200 ${
          isVisible && isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--accent)] to-[#15c7aa] rounded-lg flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path 
                  d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text)]">{title}</h3>
              <p className="text-sm text-[var(--muted)]">Required to continue</p>
            </div>
          </div>
          {showCloseButton && (
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--border)] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path 
                  d="M18 6L6 18M6 6l12 12" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <div className="mb-6">
            <p className="text-[var(--muted)] leading-relaxed">
              {message}
            </p>
            <div className="mt-4 p-4 bg-[var(--bg)] rounded-lg border border-[var(--border)]">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-blue-500/20 rounded-full flex items-center justify-center mt-0.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[var(--text)] font-medium">What happens next?</p>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    Your scripts will be saved in the selected folder, and you'll be able to create, edit, and run code files.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleSelectFolder}
              className="flex items-center justify-center gap-3 w-full bg-gradient-to-r from-[var(--accent)] to-[#15c7aa] text-black font-medium py-3 px-4 rounded-lg hover:from-[#15c7aa] hover:to-[var(--accent)] transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path 
                  d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
              Select Storage Folder
            </button>
            
            {showCloseButton && (
              <button
                onClick={handleClose}
                className="w-full text-[var(--muted)] hover:text-[var(--text)] py-2 text-sm transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-center text-xs text-[var(--muted)]">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-[var(--muted)] rounded-full"></div>
              <span>Press Enter to select folder{showCloseButton ? ' • Esc to close' : ''}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
