import React from 'react';

interface NumericKeypadProps {
  onDigitPress: (digit: string) => void;
  onDeletePress: () => void;
  onClearPress: () => void;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  onDigitPress,
  onDeletePress,
}) => {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['000', '0', 'backspace'],
  ];

  const handlePress = (key: string) => {
    // Optional Web Vibration API if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        // Ignore vibration errors
      }
    }

    if (key === 'backspace') {
      onDeletePress();
    } else {
      onDigitPress(key);
    }
  };

  return (
    <div className="shrink-0 grid grid-cols-3 gap-2 p-1 max-w-sm mx-auto w-full">
      {keys.flat().map((key, index) => {
        const isAction = key === 'backspace';
        return (
          <button
            key={index}
            type="button"
            onClick={() => handlePress(key)}
            className={`h-12 sm:h-13 rounded-2xl flex flex-col items-center justify-center font-bold text-xl transition-all duration-100 select-none active:scale-95 ${
              isAction
                ? 'bg-surface-container-high/60 text-error hover:bg-surface-container-high active:bg-error/20'
                : 'bg-surface-container/80 text-on-surface hover:bg-surface-container-high active:bg-primary/15 border border-white/5'
            }`}
          >
            {isAction ? (
              <span className="material-symbols-outlined text-[24px]">backspace</span>
            ) : (
              <span>{key}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
