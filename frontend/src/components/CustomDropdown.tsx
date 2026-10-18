import React, { useState, useRef, useEffect } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: string;
  iconColor?: string;
  badge?: string;
  badgeColor?: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  className?: string;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Pilih opsi...',
  label,
  variant = 'primary',
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const activeBorderClass =
    variant === 'secondary'
      ? 'focus:border-secondary border-secondary/40 shadow-[0_0_12px_rgba(76,215,246,0.15)]'
      : 'focus:border-primary border-primary/40 shadow-[0_0_12px_rgba(78,222,163,0.15)]';

  const selectedItemTextClass = variant === 'secondary' ? 'text-secondary' : 'text-primary';

  return (
    <div className={`relative flex flex-col gap-1 w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="text-[10px] text-on-surface-variant font-medium flex items-center justify-between">
          <span>{label}</span>
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-surface-container px-3 py-2.5 rounded-xl text-xs text-left border flex items-center justify-between gap-2 transition-all duration-200 outline-none select-none ${
          isOpen
            ? activeBorderClass
            : 'border-white/10 hover:border-white/20 hover:bg-surface-container-high'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption?.icon && (
            <span
              className="material-symbols-outlined text-[17px] shrink-0"
              style={{ color: selectedOption.iconColor || 'inherit' }}
            >
              {selectedOption.icon}
            </span>
          )}
          <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
            <span className={`truncate font-medium ${selectedOption ? 'text-on-surface' : 'text-on-surface-variant'}`}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            {selectedOption?.sublabel && (
              <span className="text-[11px] text-on-surface-variant font-num-data shrink-0 opacity-80">
                {selectedOption.sublabel}
              </span>
            )}
          </div>
          {selectedOption?.badge && (
            <span
              className="px-1.5 py-0.5 rounded-md font-label-caps text-[9px] font-bold shrink-0"
              style={{
                backgroundColor: `${selectedOption.badgeColor || '#4EDE93'}20`,
                color: selectedOption.badgeColor || '#4EDE93',
              }}
            >
              {selectedOption.badge}
            </span>
          )}
        </div>

        {/* Animated Chevron */}
        <span
          className={`material-symbols-outlined text-[18px] text-on-surface-variant shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-on-surface' : ''
          }`}
        >
          expand_more
        </span>
      </button>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-surface-container-low/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-1 max-h-56 overflow-y-auto no-scrollbar animate-fadeIn">
          {options.length === 0 ? (
            <div className="p-3 text-center text-xs text-on-surface-variant">Tidak ada pilihan</div>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-all select-none text-left ${
                    isSelected
                      ? 'bg-surface-container-high border border-white/10 font-semibold'
                      : 'hover:bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {option.icon && (
                      <span
                        className="material-symbols-outlined text-[17px] shrink-0"
                        style={{ color: option.iconColor || (isSelected ? '#4EDE93' : 'inherit') }}
                      >
                        {option.icon}
                      </span>
                    )}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className={`truncate text-xs ${isSelected ? 'text-on-surface font-semibold' : 'text-on-surface/90'}`}>
                        {option.label}
                      </span>
                      {option.sublabel && (
                        <span className="text-[10px] text-on-surface-variant font-num-data truncate">
                          {option.sublabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {option.badge && (
                      <span
                        className="px-1.5 py-0.5 rounded-md font-label-caps text-[9px] font-bold"
                        style={{
                          backgroundColor: `${option.badgeColor || '#4EDE93'}20`,
                          color: option.badgeColor || '#4EDE93',
                        }}
                      >
                        {option.badge}
                      </span>
                    )}
                    {isSelected && (
                      <span className={`material-symbols-outlined text-[16px] ${selectedItemTextClass}`}>
                        check
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
