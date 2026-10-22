import React, { useState } from 'react';
import { useFinFlowStore } from '../store/useFinFlowStore';
import { DateRangeFilter } from '../types';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const DateRangeFilterModal: React.FC = () => {
  const { isDateFilterModalOpen, setDateFilterModalOpen, historyFilter, setHistoryFilter } = useFinFlowStore();
  
  const [selectedPreset, setSelectedPreset] = useState<DateRangeFilter['preset']>(historyFilter.preset);

  // Initialize range dates from existing filter (if any)
  const [rangeStart, setRangeStart] = useState<string>(() => {
    if (historyFilter.startDate) {
      const d = new Date(historyFilter.startDate);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    return '';
  });

  const [rangeEnd, setRangeEnd] = useState<string>(() => {
    if (historyFilter.endDate) {
      const d = new Date(historyFilter.endDate);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    return '';
  });

  // Calendar View month & year (defaults to selected start date or current date)
  const [viewYear, setViewYear] = useState<number>(() => {
    if (historyFilter.startDate) {
      const d = new Date(historyFilter.startDate);
      if (!isNaN(d.getTime())) return d.getFullYear();
    }
    return new Date().getFullYear();
  });

  const [viewMonth, setViewMonth] = useState<number>(() => {
    if (historyFilter.startDate) {
      const d = new Date(historyFilter.startDate);
      if (!isNaN(d.getTime())) return d.getMonth();
    }
    return new Date().getMonth();
  });

  if (!isDateFilterModalOpen) return null;

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const formatYMD = (year: number, month: number, day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  // Month navigation
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

  const handleJumpToToday = () => {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  };

  // Date selection logic
  const handleDateClick = (dateStr: string) => {
    setSelectedPreset('custom');

    if (!rangeStart || (rangeStart && rangeEnd)) {
      // Start fresh selection
      setRangeStart(dateStr);
      setRangeEnd('');
    } else if (rangeStart && !rangeEnd) {
      if (dateStr < rangeStart) {
        // Clicked date is earlier than start, make it new start
        setRangeStart(dateStr);
        setRangeEnd('');
      } else {
        // Complete the range
        setRangeEnd(dateStr);
      }
    }
  };

  // Quick preset shortcuts for custom range
  const handleQuickRange = (type: 'last7' | 'last30' | 'thisMonth') => {
    setSelectedPreset('custom');
    const end = todayStr;
    let start = todayStr;

    if (type === 'last7') {
      const d = new Date(Date.now() - 6 * 86400000);
      start = formatYMD(d.getFullYear(), d.getMonth(), d.getDate());
    } else if (type === 'last30') {
      const d = new Date(Date.now() - 29 * 86400000);
      start = formatYMD(d.getFullYear(), d.getMonth(), d.getDate());
    } else if (type === 'thisMonth') {
      start = formatYMD(now.getFullYear(), now.getMonth(), 1);
    }

    setRangeStart(start);
    setRangeEnd(end);
    const startD = new Date(start);
    setViewYear(startD.getFullYear());
    setViewMonth(startD.getMonth());
  };

  const handleApply = () => {
    let start: string | null = null;
    let end: string | null = null;

    if (selectedPreset === 'today') {
      const s = new Date();
      s.setHours(0, 0, 0, 0);
      const e = new Date();
      e.setHours(23, 59, 59, 999);
      start = s.toISOString();
      end = e.toISOString();
    } else if (selectedPreset === 'this_week') {
      const oneWeekAgo = new Date(Date.now() - 7 * 86400000);
      oneWeekAgo.setHours(0, 0, 0, 0);
      const e = new Date();
      e.setHours(23, 59, 59, 999);
      start = oneWeekAgo.toISOString();
      end = e.toISOString();
    } else if (selectedPreset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      start = firstDay.toISOString();
      end = lastDay.toISOString();
    } else if (selectedPreset === 'last_month') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      start = firstDayLastMonth.toISOString();
      end = lastDayLastMonth.toISOString();
    } else if (selectedPreset === 'custom') {
      if (rangeStart) {
        const s = new Date(rangeStart + 'T00:00:00');
        start = !isNaN(s.getTime()) ? s.toISOString() : null;
      }
      if (rangeEnd || rangeStart) {
        const eDateStr = rangeEnd || rangeStart;
        const e = new Date(eDateStr + 'T23:59:59.999');
        end = !isNaN(e.getTime()) ? e.toISOString() : null;
      }
    }

    setHistoryFilter({
      preset: selectedPreset,
      startDate: start,
      endDate: end,
    });
    setDateFilterModalOpen(false);
  };

  const handleReset = () => {
    setSelectedPreset('all');
    setRangeStart('');
    setRangeEnd('');
    setHistoryFilter({
      preset: 'all',
      startDate: null,
      endDate: null,
    });
    setDateFilterModalOpen(false);
  };

  // Calendar generation for viewMonth & viewYear
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Minggu
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Calculate days in selected range
  const calculateDaysSelected = () => {
    if (!rangeStart) return 0;
    if (!rangeEnd || rangeEnd === rangeStart) return 1;
    const s = new Date(rangeStart).getTime();
    const e = new Date(rangeEnd).getTime();
    return Math.max(1, Math.round((e - s) / 86400000) + 1);
  };

  const formatDisplayDate = (ymdStr: string) => {
    if (!ymdStr) return '-';
    const parts = ymdStr.split('-');
    if (parts.length !== 3) return ymdStr;
    const y = parts[0];
    const m = MONTH_NAMES[parseInt(parts[1], 10) - 1]?.slice(0, 3);
    const d = parseInt(parts[2], 10);
    return `${d} ${m} ${y}`;
  };

  const presets = [
    { id: 'all', label: 'Semua', icon: 'all_inclusive' },
    { id: 'today', label: 'Hari Ini', icon: 'today' },
    { id: 'this_week', label: '7 Hari', icon: 'date_range' },
    { id: 'this_month', label: 'Bulan Ini', icon: 'calendar_month' },
    { id: 'last_month', label: 'Bulan Lalu', icon: 'event_repeat' },
    { id: 'custom', label: 'Kalender Kustom', icon: 'edit_calendar' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-sm bg-surface-container-low rounded-t-3xl sm:rounded-3xl border border-white/10 p-4 sm:p-5 pb-[max(env(safe-area-inset-bottom,0px),1.25rem)] shadow-2xl flex flex-col gap-3.5 max-h-[92vh] overflow-y-auto no-scrollbar animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-secondary/20 text-secondary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[20px]">calendar_month</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-base font-bold text-on-surface">Filter Rentang Waktu</h3>
              <p className="text-[10px] text-on-surface-variant">Pilih periode instan atau tentukan tanggal sendiri</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setDateFilterModalOpen(false)}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Quick Presets Grid */}
        <div className="grid grid-cols-3 gap-1.5">
          {presets.map((p) => {
            const isSelected = selectedPreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPreset(p.id as DateRangeFilter['preset'])}
                className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-[11px] font-semibold transition-all ${
                  isSelected
                    ? 'bg-secondary/20 text-secondary border border-secondary/40 shadow-sm'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high border border-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{p.icon}</span>
                <span className="truncate">{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Interactive Calendar UI */}
        {selectedPreset === 'custom' && (
          <div className="flex flex-col gap-3 p-3 rounded-2xl bg-surface-container border border-white/5 shadow-inner animate-fadeIn">
            {/* Range Indicator Pill */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-lowest/80 border border-white/5 text-xs">
              <div className="flex flex-col">
                <span className="text-[9px] text-on-surface-variant uppercase font-label-caps">Mulai</span>
                <span className="font-num-data font-bold text-primary">
                  {rangeStart ? formatDisplayDate(rangeStart) : 'Pilih Tanggal'}
                </span>
              </div>
              <div className="flex flex-col items-center px-1">
                <span className="material-symbols-outlined text-secondary text-[16px]">arrow_forward</span>
                <span className="font-label-caps text-[9px] text-secondary font-bold">
                  {calculateDaysSelected()} Hari
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] text-on-surface-variant uppercase font-label-caps">Sampai</span>
                <span className="font-num-data font-bold text-secondary">
                  {rangeEnd ? formatDisplayDate(rangeEnd) : rangeStart ? formatDisplayDate(rangeStart) : '-'}
                </span>
              </div>
            </div>

            {/* Quick shortcuts under preview */}
            <div className="flex items-center gap-1.5 justify-between">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleQuickRange('last7')}
                  className="px-2 py-0.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-[10px] text-on-surface-variant hover:text-on-surface font-medium transition-colors"
                >
                  7 Hari
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRange('last30')}
                  className="px-2 py-0.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-[10px] text-on-surface-variant hover:text-on-surface font-medium transition-colors"
                >
                  30 Hari
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRange('thisMonth')}
                  className="px-2 py-0.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-[10px] text-on-surface-variant hover:text-on-surface font-medium transition-colors"
                >
                  Bulan Ini
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRangeStart('');
                  setRangeEnd('');
                }}
                className="text-[10px] text-error hover:underline font-medium"
              >
                Bersihkan
              </button>
            </div>

            {/* Calendar Month Header & Navigation */}
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
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex items-center justify-center transition-colors"
                  title="Bulan Sebelumnya"
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex items-center justify-center transition-colors"
                  title="Bulan Berikutnya"
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>

            {/* Days of week header */}
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
              {/* Previous month trailing days (muted blanks) */}
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

                const isStart = rangeStart === dateStr;
                const isEnd = rangeEnd === dateStr;
                const hasBoth = Boolean(rangeStart && rangeEnd && rangeStart !== rangeEnd);
                const isSingle = isStart && (!rangeEnd || rangeEnd === rangeStart);
                const isInRange = Boolean(rangeStart && rangeEnd && dateStr > rangeStart && dateStr < rangeEnd);
                const isToday = todayStr === dateStr;

                return (
                  <div
                    key={`curr-${dayNum}`}
                    className={`relative h-8 flex items-center justify-center transition-colors ${
                      hasBoth && isStart ? 'bg-gradient-to-r from-transparent to-secondary/15 rounded-l-xl' : ''
                    } ${
                      hasBoth && isEnd ? 'bg-gradient-to-l from-transparent to-secondary/15 rounded-r-xl' : ''
                    } ${
                      isInRange ? 'bg-secondary/15' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleDateClick(dateStr)}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-num-data transition-all relative ${
                        isSingle
                          ? 'bg-primary text-surface-container-lowest font-extrabold shadow-[0_0_10px_#4edea3] scale-105 z-10'
                          : isStart
                          ? 'bg-primary text-surface-container-lowest font-extrabold shadow-[0_0_8px_#4edea3] z-10'
                          : isEnd
                          ? 'bg-secondary text-surface-container-lowest font-extrabold shadow-[0_0_8px_#4cd7f6] z-10'
                          : isInRange
                          ? 'text-secondary font-bold hover:bg-secondary/20'
                          : 'text-on-surface hover:bg-surface-container-high'
                      } ${
                        isToday && !isStart && !isEnd && !isInRange
                          ? 'ring-1 ring-primary/40 font-bold text-primary'
                          : ''
                      }`}
                    >
                      {dayNum}
                      {/* Today indicator dot if not active */}
                      {isToday && !isStart && !isEnd && (
                        <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary"></span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-on-surface-variant/80 text-center pt-1">
              {rangeStart && !rangeEnd
                ? 'Pilih tanggal kedua untuk melengkapi rentang waktu.'
                : 'Klik tanggal mulai lalu tanggal selesai untuk memilih rentang.'}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 py-2.5 rounded-xl bg-surface-container text-on-surface-variant hover:text-on-surface font-semibold text-xs transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-surface-container-lowest font-bold text-xs shadow-lg shadow-primary/20 hover:opacity-95 active:scale-98 transition-all"
          >
            Terapkan Filter
          </button>
        </div>
      </div>
    </div>
  );
};
