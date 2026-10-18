import React, { useState, useMemo } from 'react';
import { useFinFlowStore } from '../store/useFinFlowStore';
import { formatRupiah, formatDate } from '../utils/formatters';

export const DashboardPage: React.FC = () => {
  const {
    user,
    wallets,
    categories,
    transactions,
    isBalanceHidden,
    toggleBalanceHidden,
    setRecordModalOpen,
    setActiveTab,
    setWalletModalOpen,
    setCategoryModalOpen,
    monthlyOverallBudget,
    setMonthlyOverallBudget,
    salaryAllocation,
    setSalaryAllocation,
  } = useFinFlowStore();

  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  const now = new Date();
  const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDaysInMonth = Math.max(1, daysInCurrentMonth - now.getDate());

  const [activeChartPeriod, setActiveChartPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedBarDay, setSelectedBarDay] = useState<string | null>(null);

  const dayNamesShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const dayNamesFull = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthNamesFull = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const parseTxDate = (txDateStr?: string) => {
    if (!txDateStr) return null;
    const d = new Date(txDateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // Kalkulasi dinamis 7 Hari Terakhir dari transaksi nyata pengguna
  const weeklyBars = useMemo(() => {
    const today = new Date();
    const rawDays = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const dayIdx = d.getDay();
      const isToday = i === 0;
      const fullDay = isToday
        ? `${dayNamesFull[dayIdx]} (Hari Ini)`
        : `${dayNamesFull[dayIdx]}, ${d.getDate()} ${monthNamesShort[d.getMonth()]}`;

      let income = 0;
      let expense = 0;

      transactions.forEach((tx) => {
        const txDate = parseTxDate(tx.transactionDate);
        if (
          txDate &&
          txDate.getFullYear() === d.getFullYear() &&
          txDate.getMonth() === d.getMonth() &&
          txDate.getDate() === d.getDate()
        ) {
          if (tx.type === 'income') {
            income += tx.amount;
          } else if (tx.type === 'expense') {
            expense += tx.amount;
          }
        }
      });

      const net = income - expense;
      rawDays.push({
        day: dayNamesShort[dayIdx],
        fullDay,
        net,
        income,
        expense,
        isToday,
      });
    }

    const maxAbs = Math.max(...rawDays.map((d) => Math.abs(d.net)), 0);
    const maxPositive = Math.max(...rawDays.map((d) => (d.net > 0 ? d.net : 0)), 0);

    return rawDays.map((d) => {
      const absNet = Math.abs(d.net);
      let height = 8;
      if (maxAbs > 0 && absNet > 0) {
        height = Math.max(16, Math.min(100, Math.round((absNet / maxAbs) * 90)));
      }

      let amount = 'Rp 0';
      if (d.net > 0) {
        amount = `+${formatRupiah(d.net)}`;
      } else if (d.net < 0) {
        amount = `-${formatRupiah(absNet)}`;
      }

      return {
        day: d.day,
        fullDay: d.fullDay,
        amount,
        height,
        isIncome: d.net >= 0,
        isPeak: maxPositive > 0 && d.net === maxPositive,
        isToday: d.isToday,
      };
    });
  }, [transactions]);

  // Kalkulasi dinamis 6 Bulan Terakhir dari transaksi nyata pengguna
  const monthlyBars = useMemo(() => {
    const today = new Date();
    const rawMonths = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const y = d.getFullYear();
      const isCurrentMonth = i === 0;
      const fullDay = isCurrentMonth
        ? `${monthNamesFull[mIdx]} ${y} (Bulan Ini)`
        : `${monthNamesFull[mIdx]} ${y}`;

      let income = 0;
      let expense = 0;

      transactions.forEach((tx) => {
        const txDate = parseTxDate(tx.transactionDate);
        if (
          txDate &&
          txDate.getFullYear() === y &&
          txDate.getMonth() === mIdx
        ) {
          if (tx.type === 'income') {
            income += tx.amount;
          } else if (tx.type === 'expense') {
            expense += tx.amount;
          }
        }
      });

      const net = income - expense;
      rawMonths.push({
        day: monthNamesShort[mIdx],
        fullDay,
        net,
        income,
        expense,
        isCurrentMonth,
      });
    }

    const maxAbs = Math.max(...rawMonths.map((m) => Math.abs(m.net)), 0);
    const maxPositive = Math.max(...rawMonths.map((m) => (m.net > 0 ? m.net : 0)), 0);

    return rawMonths.map((m) => {
      const absNet = Math.abs(m.net);
      let height = 8;
      if (maxAbs > 0 && absNet > 0) {
        height = Math.max(16, Math.min(100, Math.round((absNet / maxAbs) * 90)));
      }

      let amount = 'Rp 0';
      if (m.net > 0) {
        amount = `+${formatRupiah(m.net)}`;
      } else if (m.net < 0) {
        amount = `-${formatRupiah(absNet)}`;
      }

      return {
        day: m.day,
        fullDay: m.fullDay,
        amount,
        height,
        isIncome: m.net >= 0,
        isPeak: maxPositive > 0 && m.net === maxPositive,
        isToday: m.isCurrentMonth,
      };
    });
  }, [transactions]);

  const handlePeriodChange = (period: 'weekly' | 'monthly') => {
    setActiveChartPeriod(period);
    setSelectedBarDay(null);
  };

  const currentBars = activeChartPeriod === 'weekly' ? weeklyBars : monthlyBars;
  const activeSelectedBar =
    currentBars.find((b) => b.fullDay === selectedBarDay) ||
    currentBars[currentBars.length - 1] || {
      day: 'Hari Ini',
      fullDay: 'Hari Ini',
      amount: 'Rp 0',
      height: 8,
      isIncome: true,
      isPeak: false,
      isToday: true,
    };

  // Calculate Net Worth & Inflow / Outflow
  const totalNetWorth = wallets.reduce((sum, w) => sum + w.balance, 0);

  const totalInflow = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutflow = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Current Month Outflow & Inflow for Monthly Budget & Health indicators
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const isCurrentMonthTx = (t: any) => {
    const d = new Date(t.transactionDate);
    return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  };

  const currentMonthOutflow = transactions
    .filter((t) => t.type === 'expense' && isCurrentMonthTx(t))
    .reduce((sum, t) => sum + t.amount, 0);

  const currentMonthInflow = transactions
    .filter((t) => t.type === 'income' && isCurrentMonthTx(t))
    .reduce((sum, t) => sum + t.amount, 0);

  // Batas Anggaran Bulanan otomatis mengikuti total alokasi pengeluaran (Kebutuhan + Keinginan) dari Gaji
  const allocatedSpendingBudget = Math.round(
    ((salaryAllocation?.monthlyIncome || 0) * ((salaryAllocation?.needsPercent || 50) + (salaryAllocation?.wantsPercent || 30))) / 100
  );
  const currentMonthlyBudget = allocatedSpendingBudget > 0 ? allocatedSpendingBudget : monthlyOverallBudget;
  const budgetSpentPct = currentMonthlyBudget > 0 ? Math.min(100, Math.round((currentMonthOutflow / currentMonthlyBudget) * 100)) : 0;
  const recentTransactions = transactions.slice(0, 5);

  // Dynamic Financial Health Evaluation
  const getFinancialHealth = () => {
    if (transactions.length === 0) {
      return {
        title: 'Selamat Datang di FinFlow 👋',
        colorClass: 'text-secondary',
        badgeBg: 'bg-secondary/10 border-secondary/20 shadow-[0_0_12px_rgba(76,215,246,0.15)]',
        badgeColor: 'text-secondary',
        badgeDot: 'bg-secondary',
        badgeLabel: 'Siap Pakai',
      };
    }

    // Overbudget or severe deficit in current month
    if ((currentMonthlyBudget > 0 && currentMonthOutflow > currentMonthlyBudget) || (currentMonthOutflow > currentMonthInflow && currentMonthInflow > 0)) {
      return {
        title: 'Pengeluaran Melebihi Batas 🚨',
        colorClass: 'text-error',
        badgeBg: 'bg-error/10 border-error/30 shadow-[0_0_12px_rgba(255,180,171,0.2)]',
        badgeColor: 'text-error',
        badgeDot: 'bg-error animate-ping',
        badgeLabel: 'Overbudget',
      };
    }

    // Warning: budget spent >= 75%
    if (budgetSpentPct >= 75) {
      return {
        title: 'Perlu Waspada Anggaran ⚠️',
        colorClass: 'text-amber-400',
        badgeBg: 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
        badgeColor: 'text-amber-400',
        badgeDot: 'bg-amber-400 animate-pulse',
        badgeLabel: 'Waspada',
      };
    }

    // Prima: surplus, healthy spending
    return {
      title: 'Kondisi Finansial Prima ✨',
      colorClass: 'text-primary',
      badgeBg: 'bg-surface-container-high border-primary/30 shadow-[0_0_12px_rgba(78,222,163,0.15)]',
      badgeColor: 'text-primary',
      badgeDot: 'bg-primary animate-ping',
      badgeLabel: 'Vault Prima',
    };
  };

  const health = getFinancialHealth();

  return (
    <div className="flex flex-col w-full px-4 pb-28 gap-4 max-w-md mx-auto animate-fadeIn">
      {/* Greeting & Quick Status Banner */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-body-sm text-xs text-on-surface-variant">
              Halo, {user?.fullName || 'Pengguna'}
            </span>
            <span className="material-symbols-outlined text-[15px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified
            </span>
          </div>
          <span className={`font-headline-sm text-base font-bold tracking-tight transition-colors ${health.colorClass}`}>
            {health.title}
          </span>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${health.badgeBg}`}>
          <span className={`w-2 h-2 rounded-full ${health.badgeDot}`}></span>
          <span className={`font-label-caps text-[10px] uppercase font-bold tracking-wider ${health.badgeColor}`}>
            {health.badgeLabel}
          </span>
        </div>
      </div>

      {/* 1. Main Net Worth Card (Glassmorphism & Depth) */}
      <div className="relative w-full rounded-2xl bg-gradient-to-b from-surface-container-high/90 via-surface-container/85 to-surface-container-low/95 backdrop-blur-xl p-5 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* Ambient Chromatic Glow */}
        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-primary/20 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-secondary/20 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col gap-3">
          {/* Label & Privacy Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-label-caps text-[11px] text-on-surface-variant tracking-wider uppercase font-semibold">
                Total Kekayaan Bersih
              </span>
              <button
                onClick={toggleBalanceHidden}
                className="text-on-surface-variant hover:text-on-surface transition-colors p-0.5"
                title={isBalanceHidden ? 'Tampilkan Saldo' : 'Sembunyikan Saldo'}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isBalanceHidden ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {transactions.length === 0 ? (
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary/10 border border-secondary/20 shadow-[0_0_8px_rgba(76,215,246,0.15)]">
                <span className="material-symbols-outlined text-secondary text-[13px]">account_balance_wallet</span>
                <span className="font-label-caps text-[10px] text-secondary font-bold">FinFlow Siap</span>
              </div>
            ) : totalInflow >= totalOutflow ? (
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 shadow-[0_0_8px_rgba(78,222,163,0.2)]">
                <span className="material-symbols-outlined text-primary text-[13px]">trending_up</span>
                <span className="font-label-caps text-[10px] text-primary font-bold">
                  +{formatRupiah(totalInflow - totalOutflow)} net
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-error/10 border border-error/20 shadow-[0_0_8px_rgba(255,180,171,0.2)]">
                <span className="material-symbols-outlined text-error text-[13px]">trending_down</span>
                <span className="font-label-caps text-[10px] text-error font-bold">
                  -{formatRupiah(totalOutflow - totalInflow)} net
                </span>
              </div>
            )}
          </div>

          {/* Main Balance Number */}
          <div className="flex items-baseline gap-1 py-1">
            <span className="font-headline-md text-xl text-on-surface-variant font-bold">Rp</span>
            <span className="font-headline-lg text-3xl font-extrabold text-on-surface tracking-tight tabular-nums drop-shadow-[0_2px_12px_rgba(255,255,255,0.1)]">
              {isBalanceHidden ? '••••••••' : formatRupiah(totalNetWorth, false)}
            </span>
          </div>

          {/* Inflow & Outflow Metrics Pill Grid */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Inflow */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-container-lowest/60 border border-white/5 shadow-inner">
              <div className="w-8 h-8 rounded-full bg-primary-container/20 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(78,222,163,0.3)]">
                <span className="material-symbols-outlined text-primary text-[18px]">south_west</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-body-sm text-[11px] text-on-surface-variant truncate">Pemasukan</span>
                <span className="font-num-data text-xs font-semibold text-primary truncate tabular-nums">
                  {isBalanceHidden ? '••••••' : `+${formatRupiah(totalInflow)}`}
                </span>
              </div>
            </div>

            {/* Outflow */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-container-lowest/60 border border-white/5 shadow-inner">
              <div className="w-8 h-8 rounded-full bg-error-container/30 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(255,180,171,0.3)]">
                <span className="material-symbols-outlined text-error text-[18px]">north_east</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-body-sm text-[11px] text-on-surface-variant truncate">Pengeluaran</span>
                <span className="font-num-data text-xs font-semibold text-error truncate tabular-nums">
                  {isBalanceHidden ? '••••••' : `-${formatRupiah(totalOutflow)}`}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/5">
            {/* 1. Transfer Button -> opens modal in Transfer mode */}
            <button
              onClick={() => setRecordModalOpen(true, 'transfer')}
              className="group flex flex-col items-center gap-1 focus:outline-none"
            >
              <div className="w-11 h-11 rounded-xl bg-secondary-container/25 text-secondary flex items-center justify-center shadow-lg shadow-secondary/20 group-active:scale-95 transition-all border border-secondary/30">
                <span className="material-symbols-outlined text-[20px]">sync_alt</span>
              </div>
              <span className="font-body-sm text-xs text-on-surface font-medium">Transfer</span>
            </button>

            {/* 2. Top Up / Pemasukan Button -> opens modal in Income mode */}
            <button
              onClick={() => setRecordModalOpen(true, 'income')}
              className="group flex flex-col items-center gap-1 focus:outline-none"
            >
              <div className="w-11 h-11 rounded-xl bg-primary-container/25 text-primary flex items-center justify-center shadow-lg shadow-primary/20 group-active:scale-95 transition-all border border-primary/30">
                <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
              </div>
              <span className="font-body-sm text-xs text-on-surface font-medium">Top Up</span>
            </button>

            {/* 3. Target Button */}
            <button
              onClick={() => setActiveTab('budgets')}
              className="group flex flex-col items-center gap-1 focus:outline-none"
            >
              <div className="w-11 h-11 rounded-xl bg-surface-container-highest text-tertiary flex items-center justify-center shadow-sm group-active:scale-95 transition-all">
                <span className="material-symbols-outlined text-[20px]">savings</span>
              </div>
              <span className="font-body-sm text-xs text-on-surface font-medium">Target</span>
            </button>

            {/* 4. Kategori Button */}
            <button
              onClick={() => setCategoryModalOpen(true)}
              className="group flex flex-col items-center gap-1 focus:outline-none"
            >
              <div className="w-11 h-11 rounded-xl bg-surface-container-highest text-primary-fixed-dim flex items-center justify-center shadow-sm group-active:scale-95 transition-all">
                <span className="material-symbols-outlined text-[20px]">category</span>
              </div>
              <span className="font-body-sm text-xs text-on-surface font-medium">Kategori</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Diagram Arus Kas (Mingguan / Bulanan) */}
      <div className="flex flex-col gap-3 p-4 rounded-2xl bg-surface-container border border-white/5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-headline-sm text-sm font-bold text-on-surface">Arus Kas</span>
            <span className="font-body-sm text-[11px] text-on-surface-variant">
              {activeChartPeriod === 'weekly' ? 'Aktivitas 7 Hari Terakhir' : 'Tren Arus Kas 6 Bulan Terakhir'}
            </span>
          </div>
          {/* Segmented Control Time Filter */}
          <div className="flex items-center p-0.5 rounded-full bg-surface-container-lowest border border-white/5">
            <button
              onClick={() => handlePeriodChange('weekly')}
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                activeChartPeriod === 'weekly'
                  ? 'bg-surface-container-high text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Mingguan
            </button>
            <button
              onClick={() => handlePeriodChange('monthly')}
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                activeChartPeriod === 'monthly'
                  ? 'bg-surface-container-high text-secondary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Bulanan
            </button>
          </div>
        </div>

        {/* Active Tooltip Indicator */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-container-high border border-white/5">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                activeSelectedBar.amount === 'Rp 0'
                  ? 'bg-on-surface-variant/40'
                  : activeSelectedBar.isIncome
                  ? 'bg-primary shadow-[0_0_6px_#4edea3]'
                  : 'bg-error shadow-[0_0_6px_#ffb4ab]'
              }`}
            ></span>
            <span className="font-body-sm text-xs text-on-surface font-semibold">
              {activeSelectedBar.fullDay}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-label-caps text-[10px] text-on-surface-variant">Arus:</span>
            <span
              className={`font-num-data text-xs font-bold ${
                activeSelectedBar.amount === 'Rp 0'
                  ? 'text-on-surface-variant'
                  : activeSelectedBar.isIncome
                  ? 'text-primary'
                  : 'text-error'
              }`}
            >
              {activeSelectedBar.amount}
            </span>
          </div>
        </div>

        {/* Interactive CSS Bar Chart */}
        <div className="flex items-end justify-between gap-2 sm:gap-3 h-36 pt-2 px-1">
          {currentBars.map((bar, idx) => {
            const isSelected = activeSelectedBar.fullDay === bar.fullDay;
            const isZero = bar.amount === 'Rp 0';
            return (
              <div
                key={idx}
                onClick={() => setSelectedBarDay(bar.fullDay)}
                className="flex flex-col items-center gap-1.5 flex-1 cursor-pointer group"
              >
                <div
                  className={`relative w-full flex items-end justify-center h-28 rounded-lg overflow-hidden p-0.5 transition-all ${
                    isSelected
                      ? 'bg-surface-container-lowest/80 ring-1 ring-secondary shadow-[0_0_12px_rgba(76,215,246,0.3)]'
                      : 'bg-surface-container-lowest/40 hover:bg-surface-container-lowest/60'
                  }`}
                >
                  <div
                    className={`w-full rounded-md transition-all duration-300 ${
                      bar.isPeak
                        ? 'bg-gradient-to-t from-secondary via-secondary to-primary shadow-[0_0_10px_#4edea3]'
                        : isZero
                        ? 'bg-white/10 group-hover:bg-white/20'
                        : bar.isIncome
                        ? 'bg-gradient-to-t from-primary/30 to-primary group-hover:brightness-125'
                        : 'bg-gradient-to-t from-error/30 to-error group-hover:brightness-125'
                    }`}
                    style={{ height: `${bar.height}%` }}
                  />
                </div>
                <span
                  className={`font-label-caps text-[10px] ${
                    isSelected
                      ? 'text-secondary font-bold'
                      : bar.isToday
                      ? 'text-primary font-bold'
                      : 'text-on-surface-variant group-hover:text-on-surface'
                  }`}
                >
                  {bar.day}
                </span>
              </div>
            );
          })}
        </div>

        {/* Chart Legend Footer */}
        <div className="flex items-center justify-center gap-4 pt-1 text-on-surface-variant border-t border-white/5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-primary shadow-[0_0_4px_#4edea3]"></span>
            <span className="font-body-sm text-[10px]">Pemasukan Bersih</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-error shadow-[0_0_4px_#ffb4ab]"></span>
            <span className="font-body-sm text-[10px]">Defisit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-secondary shadow-[0_0_4px_#4cd7f6]"></span>
            <span className="font-body-sm text-[10px]">
              {activeChartPeriod === 'weekly' ? 'Hari Puncak' : 'Bulan Puncak'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Kartu Ringkasan Batas Anggaran Bulanan */}
      <div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-surface-container-low border border-white/5 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-secondary-container/20 text-secondary flex items-center justify-center shadow-[0_0_8px_rgba(76,215,246,0.3)]">
              <span className="material-symbols-outlined text-[18px]">track_changes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-headline-sm text-sm font-bold text-on-surface">Batas Anggaran Bulanan</span>
              <button
                type="button"
                onClick={() => {
                  setBudgetInput(
                    salaryAllocation?.monthlyIncome > 0
                      ? salaryAllocation.monthlyIncome.toString()
                      : monthlyOverallBudget > 0
                      ? monthlyOverallBudget.toString()
                      : ''
                  );
                  setIsEditBudgetOpen(true);
                }}
                className="w-6 h-6 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-primary flex items-center justify-center transition-all ml-0.5"
                title="Atur Alokasi Anggaran"
              >
                <span className="material-symbols-outlined text-[14px]">edit</span>
              </button>
            </div>
          </div>
          <span className="font-label-caps text-[10px] px-2 py-0.5 rounded-full bg-surface-container-highest text-secondary font-semibold">
            {remainingDaysInMonth} Hari Tersisa
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-body-sm text-on-surface-variant">
              {currentMonthlyBudget > 0 ? (
                <>Terpakai <strong className="text-on-surface font-semibold">{budgetSpentPct}%</strong> ({formatRupiah(currentMonthOutflow)})</>
              ) : (
                <>Pengeluaran: <strong className="text-on-surface font-semibold">{formatRupiah(currentMonthOutflow)}</strong></>
              )}
            </span>
            <span className="font-body-sm text-on-surface-variant">
              Batas: {currentMonthlyBudget > 0 ? formatRupiah(currentMonthlyBudget) : 'Belum diatur'}
            </span>
          </div>

          {/* Multi-tier Visual Progress Bar */}
          <div className="w-full h-3 rounded-full bg-surface-container-highest overflow-hidden p-0.5 flex border border-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-secondary-container shadow-[0_0_10px_rgba(78,222,163,0.5)] transition-all duration-500"
              style={{ width: `${currentMonthlyBudget > 0 ? budgetSpentPct : 0}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 text-primary">
            {currentMonthlyBudget > 0 ? (
              currentMonthOutflow > currentMonthlyBudget ? (
                <>
                  <span className="material-symbols-outlined text-[15px] text-error">warning</span>
                  <span className="font-body-sm text-[11px] text-error">
                    Melebihi batas sebesar {formatRupiah(currentMonthOutflow - currentMonthlyBudget)}
                  </span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[15px]">check_circle</span>
                  <span className="font-body-sm text-[11px]">
                    Sisa kuota: {formatRupiah(Math.max(0, Math.round((currentMonthlyBudget - currentMonthOutflow) / remainingDaysInMonth)))}/hari
                  </span>
                </>
              )
            ) : (
              <>
                <span className="material-symbols-outlined text-[15px] text-on-surface-variant">info</span>
                <span className="font-body-sm text-[11px] text-on-surface-variant">
                  Batas dihitung otomatis dari Alokasi Anggaran (Gaji x Kebutuhan & Keinginan)
                </span>
              </>
            )}
          </div>
          <button
            onClick={() => setActiveTab('budgets')}
            className="font-label-caps text-[11px] text-secondary hover:underline font-semibold flex items-center gap-0.5"
          >
            <span>{currentMonthlyBudget > 0 ? 'Detail' : 'Atur'}</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Modal Edit Batas Anggaran Bulanan & Alokasi Gaji */}
      {isEditBudgetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-surface-container-low rounded-3xl border border-white/10 p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">tune</span>
                <div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface">Atur Alokasi Anggaran</h3>
                  <p className="text-[10px] text-on-surface-variant">Batas belanja otomatis = Kebutuhan + Keinginan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditBudgetOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSavingBudget(true);
                try {
                  const parsedIncome = Math.max(0, parseFloat(budgetInput) || 0);
                  await setSalaryAllocation({ monthlyIncome: parsedIncome });
                  setIsEditBudgetOpen(false);
                } finally {
                  setIsSavingBudget(false);
                }
              }}
              className="flex flex-col gap-3.5"
            >
              <div className="flex flex-col gap-1">
                <label className="text-xs text-on-surface-variant font-medium">Penghasilan Bulanan / Gaji (Rp)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="bg-surface-container px-3.5 py-2.5 rounded-xl text-on-surface text-sm border border-white/10 focus:outline-none focus:border-primary font-num-data"
                  autoFocus
                />
                <span className="text-[10px] text-on-surface-variant">
                  Batas anggaran belanja bulanan otomatis dihitung dari {salaryAllocation.needsPercent + salaryAllocation.wantsPercent}% penghasilan Anda.
                </span>
              </div>

              {/* Live Preview Alokasi Anggaran */}
              {(() => {
                const incomeVal = Math.max(0, parseFloat(budgetInput) || 0);
                const needsVal = Math.round((incomeVal * (salaryAllocation.needsPercent || 50)) / 100);
                const wantsVal = Math.round((incomeVal * (salaryAllocation.wantsPercent || 30)) / 100);
                const totalSpendingLimit = needsVal + wantsVal;
                const savingsVal = Math.round((incomeVal * (salaryAllocation.savingsPercent || 20)) / 100);

                return (
                  <div className="p-3 rounded-xl bg-surface-container/70 border border-white/5 flex flex-col gap-2 text-xs">
                    <div className="flex items-center justify-between text-on-surface-variant">
                      <span>Kebutuhan ({salaryAllocation.needsPercent}%):</span>
                      <span className="font-num-data text-on-surface font-semibold">{formatRupiah(needsVal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-on-surface-variant">
                      <span>Keinginan ({salaryAllocation.wantsPercent}%):</span>
                      <span className="font-num-data text-on-surface font-semibold">{formatRupiah(wantsVal)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-white/10 text-primary font-bold">
                      <span>Batas Anggaran Belanja:</span>
                      <span className="font-num-data">{formatRupiah(totalSpendingLimit)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-secondary">
                      <span>Tabungan ({salaryAllocation.savingsPercent}%):</span>
                      <span className="font-num-data">{formatRupiah(savingsVal)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[0, 3000000, 5000000, 10000000, 15000000, 20000000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBudgetInput(preset.toString())}
                    className="px-2 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-[10px] text-on-surface font-medium border border-white/5 transition-all"
                  >
                    {preset === 0 ? 'Rp 0' : formatRupiah(preset)}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSavingBudget}
                  onClick={() => setIsEditBudgetOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-surface-container text-on-surface-variant font-semibold text-xs hover:text-on-surface"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingBudget}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-lg shadow-primary/20 hover:opacity-95 flex items-center justify-center gap-1"
                >
                  {isSavingBudget ? (
                    <>
                      <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan & Terapkan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Daftar Transaksi Terakhir (Rata, Simetris, & Terstruktur) */}
      <div className="flex flex-col gap-2.5 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-headline-sm text-sm font-bold text-on-surface">Transaksi Terakhir</span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-caps text-[10px]">
              {recentTransactions.length} Baru
            </span>
          </div>
          <button
            onClick={() => setActiveTab('history')}
            className="font-label-caps text-xs text-primary hover:text-primary-fixed-dim transition-colors flex items-center gap-0.5 font-bold"
          >
            <span>Lihat Semua</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>

        <div className="flex flex-col rounded-2xl bg-surface-container overflow-hidden border border-white/5 shadow-md divide-y divide-white/5">
          {recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-on-surface-variant text-xs">
              Belum ada transaksi tercatat. Tekan tombol + untuk mulai!
            </div>
          ) : (
            recentTransactions.map((tx) => {
              const isIncome = tx.type === 'income';
              const isTransfer = tx.type === 'transfer';
              const cat = categories.find((c) => c.id === tx.categoryId);
              const wallet = wallets.find((w) => w.id === tx.walletId);

              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3.5 hover:bg-surface-container-high/60 transition-colors cursor-pointer"
                >
                  {/* Kolom Kiri: Avatar Icon */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        isIncome
                          ? 'bg-primary-container/20 text-primary shadow-[0_0_8px_rgba(78,222,163,0.3)]'
                          : isTransfer
                          ? 'bg-secondary/20 text-secondary shadow-[0_0_8px_rgba(76,215,246,0.3)]'
                          : 'bg-error-container/25 text-error'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[22px]">
                        {cat?.icon || (isIncome ? 'payments' : isTransfer ? 'sync_alt' : 'shopping_bag')}
                      </span>
                    </div>

                    {/* Kolom Tengah: Judul & Subtitle yang Rata dan Simetris */}
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-body-md text-xs text-on-surface font-semibold truncate">
                        {tx.notes || (isTransfer ? 'Transfer Antar Dompet' : cat?.name || 'Transaksi')}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-body-sm text-[11px] text-on-surface-variant truncate">
                          {formatDate(tx.transactionDate)} • {wallet?.name || 'Dompet'}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded font-label-caps text-[9px] uppercase font-bold shrink-0 ${
                          isIncome ? 'bg-primary/15 text-primary' : isTransfer ? 'bg-secondary/15 text-secondary' : 'bg-surface-container-high text-on-surface-variant'
                        }`}>
                          {cat?.name?.split(' ')[0] || (isIncome ? 'Gaji' : isTransfer ? 'Transfer' : 'Belanja')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Kolom Kanan: Nominal & Status (Rata Kanan Presisi) */}
                  <div className="flex flex-col items-end shrink-0 pl-2">
                    <span
                      className={`font-num-data text-xs font-bold tabular-nums ${
                        isIncome ? 'text-primary' : isTransfer ? 'text-secondary' : 'text-error'
                      }`}
                    >
                      {isIncome ? '+' : isTransfer ? '' : '-'}{formatRupiah(tx.amount)}
                    </span>
                    <span className="font-label-caps text-[10px] text-on-surface-variant mt-0.5">Berhasil</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
