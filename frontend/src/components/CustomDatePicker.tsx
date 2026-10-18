import React, { useState } from 'react';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD or empty string
  onChange: (dateStr: string) => void;
  label?: string;
  placeholder?: string;
  allowClear?: boolean;
  minDate?: string; // Optional YYYY-MM-DD
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  label = 'Deadline / Tanggal Target',
  placeholder = 'Pilih tanggal deadline...',
  allowClear = true,
  minDate,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Clean value from potential time or ISO 'T' timestamp
  const cleanVal = value ? value.split('T')[0].split(' ')[0].trim() : '';

  // View state for year and month
  const [viewYear, setViewYear] = useState<number>(() => {
    if (cleanVal && cleanVal.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = cleanVal.split('-');
      return parseInt(parts[0], 10);
    }
    return now.getFullYear();
  });

  const [viewMonth, setViewMonth] = useState<number>(() => {
    if (cleanVal && cleanVal.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = cleanVal.split('-');
      return parseInt(parts[1], 10) - 1;
    }
    return now.getMonth();
  });

  // Temporary selected date when modal is open
  const [selectedDate, setSelectedDate] = useState<string>(cleanVal);

  const formatYMD = (year: number, month: number, day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  const formatDisplayDate = (ymdStr: string) => {
    if (!ymdStr) return '';
    const clean = ymdStr.split('T')[0].split(' ')[0].trim();
    const parts = clean.split('-');
    if (parts.length !== 3) return clean;
    const y = parts[0];
    const m = MONTH_NAMES[parseInt(parts[1], 10) - 1]?.slice(0, 3);
    const d = parseInt(parts[2], 10);
    return `${d} ${m} ${y}`;
  };

  const formatFullDisplayDate = (ymdStr: string) => {
    if (!ymdStr) return 'Belum dipilih';
    const clean = ymdStr.split('T')[0].split(' ')[0].trim();
    const parts = clean.split('-');
    if (parts.length !== 3) return clean;
    const y = parts[0];
    const m = MONTH_NAMES[parseInt(parts[1], 10) - 1];
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(parseInt(y, 10), parseInt(parts[1], 10) - 1, d);
    const dayName = DAY_NAMES[dateObj.getDay()];
    return `${dayName}, ${d} ${m} ${y}`;
  };

  const handleOpen = () => {
    const currentClean = value ? value.split('T')[0].split(' ')[0].trim() : '';
    setSelectedDate(currentClean);
    if (currentClean && currentClean.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = currentClean.split('-');
      setViewYear(parseInt(parts[0], 10));
      setViewMonth(parseInt(parts[1], 10) - 1);
    } else {
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
    }
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handlePrevYear = () => {
    setViewYear(viewYear - 1);
  };

  const handleNextYear = () => {
    setViewYear(viewYear + 1);
  };

  const handleJumpToToday = () => {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(todayStr);
  };

  const handleSelectPreset = (monthsToAdd: number, endOfYear?: boolean) => {
    if (endOfYear) {
      const targetYear = now.getFullYear() + (monthsToAdd || 0);
      const targetStr = `${targetYear}-12-31`;
      setSelectedDate(targetStr);
      setViewYear(targetYear);
      setViewMonth(11);
      return;
    }

    const d = new Date(now.getFullYear(), now.getMonth() + monthsToAdd, now.getDate());
    const targetStr = formatYMD(d.getFullYear(), d.getMonth(), d.getDate());
    setSelectedDate(targetStr);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const handleConfirm = () => {
    onChange(selectedDate);
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedDate('');
    onChange('');
    setIsOpen(false);
  };

  // Calendar calculations
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Minggu
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-xs text-on-surface-variant font-medium">{label}</label>}

      {/* Input Display Trigger */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpen();
          }
        }}
        className="w-full bg-surface-container hover:bg-surface-container-high px-3.5 py-2.5 rounded-xl text-xs text-on-surface border border-white/10 flex items-center justify-between cursor-pointer transition-colors group"
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="material-symbols-outlined text-base text-primary/80 group-hover:text-primary transition-colors">
            calendar_month
          </span>
          {value ? (
            <span className="font-medium text-on-surface truncate">
              {formatDisplayDate(value)}
            </span>
          ) : (
            <span className="text-on-surface-variant/60 font-normal truncate">
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {allowClear && value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-on-surface-variant hover:text-error hover:bg-white/5 transition-colors"
              title="Hapus deadline (jadikan fleksibel)"
            >
              <span className="material-symbols-outlined text-[15px]">close</span>
            </button>
          )}
          <span className="material-symbols-outlined text-base text-on-surface-variant/60 group-hover:text-on-surface transition-colors">
            expand_more
          </span>
        </div>
      </div>

      {/* Custom Date Picker Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div
            className="w-full max-w-sm bg-surface-container-low rounded-3xl border border-white/10 p-4 sm:p-5 shadow-2xl flex flex-col gap-3.5 animate-slideUp text-on-surface"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <span className="material-symbols-outlined text-lg">event_available</span>
                </div>
                <div>
                  <h4 className="font-headline-sm text-sm font-bold text-on-surface leading-tight">
                    Tentukan Deadline Target
                  </h4>
                  <p className="text-[10px] text-on-surface-variant">
                    {selectedDate ? formatFullDisplayDate(selectedDate) : 'Pilih tanggal pada kalender'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-7 h-7 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            {/* Quick Presets for Target Impian */}
            <div className="flex flex-col gap-1.5 bg-surface-container/60 p-2.5 rounded-2xl border border-white/5">
              <span className="text-[10px] font-label-caps font-bold text-on-surface-variant uppercase tracking-wider">
                Target Cepat
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectPreset(3)}
                  className="px-2 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-[10px] font-medium text-on-surface transition-colors text-center"
                >
                  +3 Bulan
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(6)}
                  className="px-2 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-[10px] font-medium text-on-surface transition-colors text-center"
                >
                  +6 Bulan
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(12)}
                  className="px-2 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-[10px] font-medium text-on-surface transition-colors text-center"
                >
                  +1 Tahun
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(0, true)}
                  className="px-2 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-[10px] font-medium text-on-surface transition-colors text-center"
                >
                  Akhir Thn
                </button>
              </div>
            </div>

            {/* Calendar Header with Month & Year Navigator */}
            <div className="flex items-center justify-between pt-1 px-1">
              <div className="flex items-center gap-1.5">
                <span className="font-headline-sm text-sm font-bold text-on-surface">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <button
                  type="button"
                  onClick={handleJumpToToday}
                  className="px-1.5 py-0.5 rounded-md bg-surface-container-high hover:bg-surface-container-highest text-[9px] font-label-caps font-bold text-primary uppercase"
                  title="Kembali ke Hari Ini"
                >
                  Hari Ini
                </button>
              </div>

              {/* Month & Year Navigation Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevYear}
                  className="w-6 h-6 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors text-[10px] font-bold"
                  title="Tahun Lalu (-1 Thn)"
                >
                  -1Y
                </button>
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-6 h-6 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex items-center justify-center transition-colors"
                  title="Bulan Sebelumnya"
                >
                  <span className="material-symbols-outlined text-[15px]">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-6 h-6 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex items-center justify-center transition-colors"
                  title="Bulan Berikutnya"
                >
                  <span className="material-symbols-outlined text-[15px]">chevron_right</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextYear}
                  className="w-6 h-6 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors text-[10px] font-bold"
                  title="Tahun Depan (+1 Thn)"
                >
                  +1Y
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {DAY_NAMES.map((dayName, idx) => (
                <span
                  key={dayName}
                  className={`text-[10px] font-label-caps font-bold ${
                    idx === 0 ? 'text-error/80' : 'text-on-surface-variant'
                  }`}
                >
                  {dayName}
                </span>
              ))}
            </div>

            {/* Interactive Days Grid */}
            <div className="grid grid-cols-7 gap-y-1 gap-x-0">
              {/* Previous month trailing days */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => {
                const dayNum = daysInPrevMonth - firstDayOfWeek + idx + 1;
                return (
                  <div
                    key={`prev-${idx}`}
                    className="h-8 flex items-center justify-center text-[11px] text-on-surface-variant/25 font-num-data"
                  >
                    {dayNum}
                  </div>
                );
              })}

              {/* Current month days */}
              {Array.from({ length: daysInCurrentMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dateStr = formatYMD(viewYear, viewMonth, dayNum);
                const isSelected = selectedDate === dateStr;
                const isToday = todayStr === dateStr;
                const isPast = minDate ? dateStr < minDate : false;

                return (
                  <div key={`curr-${dayNum}`} className="h-8 flex items-center justify-center">
                    <button
                      type="button"
                      disabled={isPast}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-num-data transition-all relative ${
                        isSelected
                          ? 'bg-primary text-surface-container-lowest font-extrabold shadow-[0_0_12px_#4edea3] scale-105 z-10'
                          : isToday
                          ? 'ring-1 ring-primary/50 font-bold text-primary hover:bg-primary/10'
                          : isPast
                          ? 'text-on-surface-variant/30 cursor-not-allowed'
                          : 'text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      {dayNum}
                      {isToday && !isSelected && (
                        <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
              {allowClear && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate('');
                    onChange('');
                    setIsOpen(false);
                  }}
                  className="px-3 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs text-on-surface-variant font-medium transition-colors"
                >
                  Fleksibel
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-xs text-on-surface font-bold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-2.5 rounded-xl bg-primary text-surface-container-lowest text-xs font-bold shadow-md shadow-primary/25 hover:brightness-110 transition-all active:scale-95"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CustomDatePicker;
