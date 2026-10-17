import React, { useEffect, useState } from 'react';
import { useFinFlowStore } from '../store/useFinFlowStore';

export const Toast: React.FC = () => {
  const { toast, hideToast } = useFinFlowStore();
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!toast) return;

    setProgress(100);
    const duration = toast.duration || 3500;
    const intervalTime = 50;
    const decrement = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= decrement) {
          clearInterval(timer);
          hideToast();
          return 0;
        }
        return prev - decrement;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [toast, hideToast]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 pointer-events-none animate-fadeIn">
      <div
        className={`pointer-events-auto relative overflow-hidden rounded-2xl p-3.5 backdrop-blur-2xl shadow-2xl border transition-all duration-300 ${
          isSuccess
            ? 'bg-surface-container/95 border-primary/30 shadow-[0_8px_32px_rgba(78,222,163,0.2)]'
            : isError
            ? 'bg-surface-container/95 border-error/30 shadow-[0_8px_32px_rgba(255,180,171,0.2)]'
            : 'bg-surface-container/95 border-secondary/30 shadow-[0_8px_32px_rgba(76,215,246,0.2)]'
        }`}
      >
        {/* Ambient Subtle Glow */}
        <div
          className={`absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl pointer-events-none ${
            isSuccess ? 'bg-primary/20' : isError ? 'bg-error/20' : 'bg-secondary/20'
          }`}
        />

        <div className="flex items-center gap-3 relative z-10">
          {/* Icon Badge */}
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isSuccess
                ? 'bg-primary/15 text-primary border border-primary/30'
                : isError
                ? 'bg-error/15 text-error border border-error/30'
                : 'bg-secondary/15 text-secondary border border-secondary/30'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">
              {isSuccess ? 'check_circle' : isError ? 'error' : 'info'}
            </span>
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-headline-sm text-xs sm:text-sm font-bold text-on-surface truncate">
              {toast.title}
            </h4>
            {toast.message && (
              <p className="font-body-sm text-[11px] text-on-surface-variant truncate mt-0.5">
                {toast.message}
              </p>
            )}
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={hideToast}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5 overflow-hidden">
          <div
            className={`h-full transition-all duration-75 ${
              isSuccess ? 'bg-primary' : isError ? 'bg-error' : 'bg-secondary'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
