import React from 'react';

export interface ActionSheetProps {
  isOpen: boolean;
  title?: string | null;
  message?: string | null;
  cancelButton?: string | null;
  buttons: string[];
  alignLeft?: boolean;
  onSelect: (selected: string | null) => void;
}

export const ActionSheet: React.FC<ActionSheetProps> = ({
  isOpen,
  title,
  message,
  cancelButton,
  buttons,
  alignLeft,
  onSelect,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="action-sheet-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-xs transition-opacity"
      onClick={() => onSelect(null)}
    >
      <div
        id="action-sheet-container"
        className="w-full max-w-xs xs:max-w-sm sm:max-w-md overflow-hidden rounded-2xl bg-[#1c1c1e] text-white border border-[#333333] shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {(title || message) && (
          <div
            id="action-sheet-header"
            className={`px-4 xs:px-5 py-3.5 xs:py-4 border-b border-[#2c2c2e] ${alignLeft ? 'text-left' : 'text-center'}`}
          >
            {title && (
              <h3 id="action-sheet-title" className="text-sm xs:text-base sm:text-lg font-semibold text-gray-100">
                {title}
              </h3>
            )}
            {message && (
              <p
                id="action-sheet-message"
                className={`mt-1 text-xs xs:text-sm text-gray-400 whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto ${alignLeft ? 'text-left' : ''}`}
              >
                {message}
              </p>
            )}
          </div>
        )}

        <div id="action-sheet-buttons" className="max-h-72 overflow-y-auto divide-y divide-[#2c2c2e]">
          {buttons.map((btn, index) => (
            <button
              key={index}
              id={`action-sheet-btn-${index}`}
              className="w-full py-3 xs:py-3.5 px-4 text-center text-xs xs:text-sm sm:text-base font-medium text-blue-400 hover:bg-[#2c2c2e] active:bg-[#3a3a3c] transition-colors whitespace-nowrap truncate"
              onClick={() => onSelect(btn)}
            >
              {btn}
            </button>
          ))}
        </div>

        {cancelButton && (
          <div id="action-sheet-footer" className="border-t border-[#2c2c2e] p-2 bg-[#161618]">
            <button
              id="action-sheet-cancel-btn"
              className="w-full py-2.5 sm:py-3 rounded-xl font-semibold text-xs xs:text-sm sm:text-base text-red-400 hover:bg-[#2c2c2e] active:bg-[#3a3a3c] transition-colors whitespace-nowrap"
              onClick={() => onSelect(null)}
            >
              {cancelButton}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
