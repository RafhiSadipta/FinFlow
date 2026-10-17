import React, { useState } from 'react';
import { useFinFlowStore } from '../store/useFinFlowStore';
import { formatRupiah } from '../utils/formatters';
import confetti from 'canvas-confetti';

export const BudgetsPage: React.FC = () => {
  const {
    user,
    savingsGoals,
    wallets,
    categories,
    transactions,
    addSavingsGoal,
    addDepositToGoal,
    salaryAllocation,
    setSalaryAllocation,
    setMonthlyOverallBudget,
    setActiveTab,
  } = useFinFlowStore();

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false);
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [selectedWalletIdForDeposit, setSelectedWalletIdForDeposit] = useState<string>(wallets[0]?.id || '');

  // Form states for new goal
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');

  // Calculator form states
  const [calcIncome, setCalcIncome] = useState(salaryAllocation.monthlyIncome.toString());
  const [calcNeedsPct, setCalcNeedsPct] = useState(salaryAllocation.needsPercent.toString());
  const [calcWantsPct, setCalcWantsPct] = useState(salaryAllocation.wantsPercent.toString());
  const [calcSavingsPct, setCalcSavingsPct] = useState(salaryAllocation.savingsPercent.toString());

  // Aggregate savings
  const totalSaved = savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const overallSavedPct = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100 * 10) / 10) : 0;

  // Closest target date calculation
  const nowMs = Date.now();
  const upcomingGoalsWithDeadline = savingsGoals
    .filter((g) => g.targetDate && g.currentAmount < g.targetAmount)
    .map((g) => {
      const targetTime = new Date(g.targetDate!).getTime();
      const diffMonths = Math.max(1, Math.round((targetTime - nowMs) / (30 * 86400000)));
      return { ...g, diffMonths };
    })
    .sort((a, b) => a.diffMonths - b.diffMonths);

  const closestGoal = upcomingGoalsWithDeadline[0];

  // 50/30/20 Allocation numbers
  const income = salaryAllocation.monthlyIncome;
  const needsCap = (income * salaryAllocation.needsPercent) / 100;
  const wantsCap = (income * salaryAllocation.wantsPercent) / 100;
  const savingsCap = (income * salaryAllocation.savingsPercent) / 100;

  // Real spent per allocation pocket from transactions
  const needsSpent = transactions
    .filter((t) => {
      if (t.type !== 'expense') return false;
      const cat = categories.find((c) => c.id === t.categoryId);
      return cat?.allocationGroup === 'needs';
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const wantsSpent = transactions
    .filter((t) => {
      if (t.type !== 'expense') return false;
      const cat = categories.find((c) => c.id === t.categoryId);
      return cat?.allocationGroup === 'wants';
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const savingsSpent = transactions
    .filter((t) => {
      if (t.type !== 'expense') return false;
      const cat = categories.find((c) => c.id === t.categoryId);
      return cat?.allocationGroup === 'savings';
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim() || !targetAmount) return;

    let formattedDate = targetDate.trim();
    if (!formattedDate || !formattedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const targetYear = new Date().getFullYear();
      formattedDate = `${targetYear}-12-31`;
    }

    addSavingsGoal({
      userId: user?.id || '',
      name: goalName.trim(),
      targetAmount: parseFloat(targetAmount),
      targetDate: formattedDate,
      icon: 'savings',
      color: '#4EDE93',
    });

    setGoalName('');
    setTargetAmount('');
    setTargetDate('');
    setIsGoalModalOpen(false);
  };

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGoalId || !depositAmount) return;

    const amt = parseFloat(depositAmount);
    addDepositToGoal(activeGoalId, amt, selectedWalletIdForDeposit);

    try {
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignore
    }

    setDepositAmount('');
    setIsDepositModalOpen(false);
  };

  const handleSaveCalculator = (e: React.FormEvent) => {
    e.preventDefault();
    const newIncome = parseFloat(calcIncome) || 0;
    const newNeedsPct = parseFloat(calcNeedsPct) || 50;
    const newWantsPct = parseFloat(calcWantsPct) || 30;
    const newSavingsPct = parseFloat(calcSavingsPct) || 20;

    setSalaryAllocation({
      monthlyIncome: newIncome,
      needsPercent: newNeedsPct,
      wantsPercent: newWantsPct,
      savingsPercent: newSavingsPct,
    });

    // Automatically align overall monthly budget limit = Needs + Wants
    const calculatedBudget = Math.round((newIncome * (newNeedsPct + newWantsPct)) / 100);
    setMonthlyOverallBudget(calculatedBudget);

    setIsCalculatorModalOpen(false);
  };

  return (
    <div className="flex flex-col w-full px-4 pb-28 gap-4 max-w-md mx-auto animate-fadeIn">
      {/* 1. Header Banner & Encouragement Chip */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-primary animate-ping"></span>
          <span className="font-label-caps text-[10px] uppercase tracking-wider text-primary font-bold">
            Rencana Keuangan Prima
          </span>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-num-data border border-white/5 shadow-sm">
          <span className="material-symbols-outlined text-xs text-secondary">
            {savingsGoals.length > 0 ? 'track_changes' : 'savings'}
          </span>
          <span>
            {savingsGoals.length > 0 ? `${overallSavedPct}% Terkumpul` : 'Siap Menabung'}
          </span>
        </div>
      </div>

      {/* 2. Hero Overview: Circular Radial Gauge & Net Savings Tracker */}
      <div className="relative w-full rounded-2xl bg-surface-container-low p-5 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/5">
        {/* Ambient Chromatic Glow */}
        <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-primary/20 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-secondary/20 blur-3xl pointer-events-none"></div>

        <div className="relative flex flex-col items-center text-center">
          <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest mb-1 font-semibold">
            Total Tabungan Aktif
          </span>
          <div className="flex items-baseline gap-1">
            <span className="font-headline-lg text-3xl text-primary font-extrabold tracking-tight tabular-nums drop-shadow-[0_0_12px_rgba(78,222,163,0.3)]">
              {formatRupiah(totalSaved)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-on-surface-variant text-xs font-body-sm">
            <span>dari target akumulasi</span>
            <span className="text-on-surface font-semibold tabular-nums">{formatRupiah(totalTarget)}</span>
          </div>

          {/* Animated SVG Radial Gauge */}
          <div className="relative w-48 h-48 my-3 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
              <circle
                className="stroke-surface-container-highest"
                cx="80"
                cy="80"
                fill="none"
                r="66"
                strokeLinecap="round"
                strokeWidth="12"
              />
              <circle
                className="stroke-primary transition-all duration-700 ease-out"
                cx="80"
                cy="80"
                fill="none"
                r="66"
                strokeDasharray="414.69"
                strokeDashoffset={414.69 - (414.69 * overallSavedPct) / 100}
                strokeLinecap="round"
                strokeWidth="12"
                style={{ filter: 'drop-shadow(0 0 10px rgba(78, 222, 163, 0.6))' }}
              />
            </svg>

            {/* Inner Metric Center Info */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/15 text-primary mb-1 shadow-[0_0_8px_rgba(78,222,163,0.3)]">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  stars
                </span>
              </div>
              <span className="font-headline-lg text-2xl font-extrabold text-on-surface tracking-tight tabular-nums">
                {overallSavedPct}%
              </span>
              <span className="font-label-caps text-[10px] uppercase text-primary font-bold tracking-wider">
                Tercapai
              </span>
            </div>
          </div>

          {/* Estimation Pill Card */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container text-on-surface shadow-sm border border-white/5">
            <span className="material-symbols-outlined text-secondary text-[18px]">timelapse</span>
            <span className="font-body-sm text-xs">
              {closestGoal ? (
                <>
                  Estimasi tuntas <strong className="text-secondary font-semibold">{closestGoal.name}</strong> dalam <strong className="text-secondary font-semibold">{closestGoal.diffMonths} bulan lagi</strong>
                </>
              ) : savingsGoals.length > 0 ? (
                <>Semua target impian telah tercapai 🎉</>
              ) : (
                <>Belum ada target aktif • Buat target impian Anda di bawah</>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Action: Buat Target Baru */}
      <button
        onClick={() => setIsGoalModalOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-surface-container-high active:scale-[0.98] transition-all duration-200 text-primary border border-primary/20 shadow-lg shadow-primary/10 hover:bg-surface-container-highest font-semibold text-sm"
      >
        <span className="material-symbols-outlined text-[20px] font-bold">add_circle</span>
        <span className="font-headline-sm">Buat Target Baru</span>
      </button>

      {/* 4. Section 2: Target Impian Saya (Dream Goals Cards) */}
      <div className="flex flex-col gap-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">flag</span>
            <h2 className="font-headline-sm text-sm font-bold text-on-surface">Target Impian Saya</h2>
          </div>
          <span className="font-label-caps text-[11px] text-on-surface-variant font-medium">
            {savingsGoals.length} Aktif
          </span>
        </div>

        {savingsGoals.map((goal) => {
          const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
          return (
            <div
              key={goal.id}
              className="flex flex-col rounded-2xl bg-surface-container p-4 shadow-md border border-white/5 gap-3 relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner"
                    style={{ backgroundColor: `${goal.color}20`, color: goal.color }}
                  >
                    <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {goal.icon}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-headline-sm text-sm text-on-surface font-bold">{goal.name}</h3>
                    <div className="flex items-center gap-1 text-on-surface-variant text-[11px] mt-0.5">
                      <span className="material-symbols-outlined text-xs">event</span>
                      <span>Deadline: {goal.targetDate || 'Fleksibel'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="px-2.5 py-0.5 rounded-full font-label-caps text-[11px] font-bold tabular-nums"
                    style={{ backgroundColor: `${goal.color}20`, color: goal.color }}
                  >
                    {pct}%
                  </span>
                  <button
                    onClick={() => {
                      setActiveGoalId(goal.id);
                      setIsDepositModalOpen(true);
                    }}
                    className="p-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-secondary transition-all active:scale-90"
                    title="Nabung"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </div>
              </div>

              {/* Linear Progress Bar */}
              <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden border border-white/5">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: goal.color,
                    boxShadow: `0 0 8px ${goal.color}`,
                  }}
                />
              </div>

              <div className="flex justify-between items-center text-xs pt-0.5">
                <div className="flex flex-col">
                  <span className="text-[10px] text-on-surface-variant uppercase font-label-caps">Terkumpul</span>
                  <span className="font-num-data font-bold text-on-surface tabular-nums">
                    {formatRupiah(goal.currentAmount)}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-on-surface-variant uppercase font-label-caps">Target</span>
                  <span className="font-num-data text-on-surface-variant tabular-nums">
                    {formatRupiah(goal.targetAmount)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Section 3: Visual Budgeting 50/30/20 Allocation (Komponen Alokasi Anggaran) */}
      <div className="flex flex-col rounded-2xl bg-surface-container-low p-4 gap-3.5 shadow-xl border border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[22px]">pie_chart</span>
            <div className="flex flex-col">
              <h2 className="font-headline-sm text-sm text-on-surface font-bold">Alokasi Anggaran 50/30/20</h2>
              <span className="font-body-sm text-[11px] text-on-surface-variant">
                Berdasarkan Penghasilan {formatRupiah(salaryAllocation.monthlyIncome)}/bln
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsCalculatorModalOpen(true)}
            className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-secondary transition-colors"
            title="Kustomisasi Alokasi & Gaji"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
          </button>
        </div>

        {/* Proportional Segmented Progress Bar */}
        <div className="flex flex-col gap-1.5">
          <div className="h-4 w-full rounded-full bg-surface-container-highest flex overflow-hidden p-0.5 gap-1 border border-white/5">
            {/* 50% Kebutuhan (Cyan) */}
            <div
              className="h-full rounded-full bg-secondary shadow-[0_0_8px_#4CD7F6] transition-all duration-300"
              style={{ width: `${salaryAllocation.needsPercent}%` }}
              title="Kebutuhan"
            />
            {/* 30% Keinginan (Ungu) */}
            <div
              className="h-full rounded-full bg-tertiary shadow-[0_0_8px_#D0BCFF] transition-all duration-300"
              style={{ width: `${salaryAllocation.wantsPercent}%` }}
              title="Keinginan"
            />
            {/* 20% Tabungan/Investasi (Emerald) */}
            <div
              className="h-full rounded-full bg-primary shadow-[0_0_8px_#4EDE93] transition-all duration-300"
              style={{ width: `${salaryAllocation.savingsPercent}%` }}
              title="Tabungan"
            />
          </div>

          {/* Quick Legend Bar Indicator */}
          <div className="flex justify-between items-center px-1 text-[10px] font-label-caps font-bold">
            <span className="text-secondary">{salaryAllocation.needsPercent}% Kebutuhan</span>
            <span className="text-tertiary">{salaryAllocation.wantsPercent}% Keinginan</span>
            <span className="text-primary">{salaryAllocation.savingsPercent}% Tabungan</span>
          </div>
        </div>

        {/* Detailed 3-Pocket Breakdown List */}
        <div className="flex flex-col gap-2 pt-1">
          {/* Pocket 1: Kebutuhan Pokok */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-secondary shadow-[0_0_6px_#4CD7F6] shrink-0"></div>
              <div className="flex flex-col">
                <span className="font-body-md text-on-surface font-semibold text-xs">
                  Kebutuhan Pokok ({salaryAllocation.needsPercent}%)
                </span>
                <span className="font-body-sm text-[10px] text-on-surface-variant">
                  Tempat tinggal, makan, utilitas
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-num-data text-on-surface text-xs font-bold tabular-nums">
                {formatRupiah(needsSpent)}
              </span>
              <span className="font-body-sm text-[10px] text-on-surface-variant tabular-nums">
                dari {formatRupiah(needsCap)}
              </span>
            </div>
          </div>

          {/* Pocket 2: Keinginan & Lifestyle */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-tertiary shadow-[0_0_6px_#D0BCFF] shrink-0"></div>
              <div className="flex flex-col">
                <span className="font-body-md text-on-surface font-semibold text-xs">
                  Keinginan ({salaryAllocation.wantsPercent}%)
                </span>
                <span className="font-body-sm text-[10px] text-on-surface-variant">
                  Hiburan, belanja santai, kafe
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-num-data text-on-surface text-xs font-bold tabular-nums">
                {formatRupiah(wantsSpent)}
              </span>
              <span className="font-body-sm text-[10px] text-on-surface-variant tabular-nums">
                dari {formatRupiah(wantsCap)}
              </span>
            </div>
          </div>

          {/* Pocket 3: Tabungan & Investasi */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_6px_#4EDE93] shrink-0"></div>
              <div className="flex flex-col">
                <span className="font-body-md text-on-surface font-semibold text-xs">
                  Tabungan & Investasi ({salaryAllocation.savingsPercent}%)
                </span>
                <span className="font-body-sm text-[10px] text-on-surface-variant">
                  Otomatis masuk target aktif
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-num-data text-primary text-xs font-bold tabular-nums">
                {formatRupiah(savingsSpent)}
              </span>
              <span className="font-body-sm text-[10px] text-primary/80 tabular-nums">
                dari {formatRupiah(savingsCap)}
              </span>
            </div>
          </div>

          {/* Quick Link: Atur Limit per Kategori di Analisis */}
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-surface-container/50 hover:bg-surface-container border border-white/5 text-on-surface-variant hover:text-on-surface transition-all group mt-1"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">tune</span>
              <span className="font-body-sm text-xs text-left text-on-surface font-medium">
                Limit per Kategori (Otomatis 50/30/20)
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-primary font-semibold group-hover:translate-x-0.5 transition-transform">
              <span>Atur di Analisis</span>
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </div>
          </button>
        </div>
      </div>

      {/* Modal Buat Target Baru */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-surface-container-low rounded-3xl border border-white/10 p-5 shadow-2xl flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-white/5">
              <h4 className="font-headline-sm text-base font-bold text-on-surface">Target Impian Baru</h4>
              <button onClick={() => setIsGoalModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateGoal} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-on-surface-variant font-medium">Nama Target Impian</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: DP Rumah, MacBook Pro, Umroh"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  className="bg-surface-container px-3.5 py-2.5 rounded-xl text-xs text-on-surface border border-white/10"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-on-surface-variant font-medium">Target Nominal (Rp)</label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 50000000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="bg-surface-container px-3.5 py-2.5 rounded-xl text-xs text-on-surface border border-white/10 font-num-data"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-on-surface-variant font-medium">Deadline / Bulan Target</label>
                <input
                  type="text"
                  placeholder={`Contoh: Des ${new Date().getFullYear()}`}
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="bg-surface-container px-3.5 py-2.5 rounded-xl text-xs text-on-surface border border-white/10"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-surface-container text-xs text-on-surface-variant font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md shadow-primary/25"
                >
                  Simpan Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Deposit / Nabung */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xs bg-surface-container-low rounded-3xl border border-white/10 p-5 shadow-2xl flex flex-col gap-3">
            <h4 className="font-headline-sm text-base font-bold text-on-surface">Tambah Tabungan</h4>
            <form onSubmit={handleDeposit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-on-surface-variant font-medium">Pilih Sumber Dompet</label>
                <select
                  value={selectedWalletIdForDeposit}
                  onChange={(e) => setSelectedWalletIdForDeposit(e.target.value)}
                  className="bg-surface-container px-3 py-2 rounded-xl text-xs text-on-surface border border-white/10 outline-none focus:border-primary"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id} className="bg-surface-container-high text-on-surface">
                      {w.name} ({formatRupiah(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-on-surface-variant font-medium">Nominal Setoran (Rp)</label>
                <input
                  type="number"
                  required
                  placeholder="Nominal Rp (misal 1000000)"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="bg-surface-container px-3.5 py-2.5 rounded-xl text-xs text-on-surface border border-white/10 font-num-data"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-surface-container text-xs text-on-surface-variant"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-surface-container-lowest text-xs font-bold shadow-lg shadow-primary/20"
                >
                  Nabung Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kalkulator Alokasi Anggaran 50/30/20 */}
      {isCalculatorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-surface-container-low rounded-3xl border border-white/10 p-5 shadow-2xl flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">calculate</span>
                <h4 className="font-headline-sm text-base font-bold text-on-surface">Kalkulator Alokasi Anggaran</h4>
              </div>
              <button onClick={() => setIsCalculatorModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveCalculator} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-on-surface-variant font-medium">Penghasilan / Gaji Bulanan (Rp)</label>
                <input
                  type="number"
                  required
                  value={calcIncome}
                  onChange={(e) => setCalcIncome(e.target.value)}
                  className="bg-surface-container px-3.5 py-2 rounded-xl text-xs text-on-surface border border-white/10 font-num-data"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-secondary font-bold">Kebutuhan (%)</label>
                  <input
                    type="number"
                    value={calcNeedsPct}
                    onChange={(e) => setCalcNeedsPct(e.target.value)}
                    className="bg-surface-container px-2.5 py-1.5 rounded-xl text-xs text-on-surface border border-white/10 font-num-data text-center"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-tertiary font-bold">Keinginan (%)</label>
                  <input
                    type="number"
                    value={calcWantsPct}
                    onChange={(e) => setCalcWantsPct(e.target.value)}
                    className="bg-surface-container px-2.5 py-1.5 rounded-xl text-xs text-on-surface border border-white/10 font-num-data text-center"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-primary font-bold">Tabungan (%)</label>
                  <input
                    type="number"
                    value={calcSavingsPct}
                    onChange={(e) => setCalcSavingsPct(e.target.value)}
                    className="bg-surface-container px-2.5 py-1.5 rounded-xl text-xs text-on-surface border border-white/10 font-num-data text-center"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] text-on-surface-variant">Preset:</span>
                <button
                  type="button"
                  onClick={() => {
                    setCalcNeedsPct('50');
                    setCalcWantsPct('30');
                    setCalcSavingsPct('20');
                  }}
                  className="px-2 py-0.5 rounded-lg bg-surface-container text-[10px] text-on-surface font-semibold hover:bg-surface-container-high"
                >
                  50/30/20
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCalcNeedsPct('60');
                    setCalcWantsPct('20');
                    setCalcSavingsPct('20');
                  }}
                  className="px-2 py-0.5 rounded-lg bg-surface-container text-[10px] text-on-surface font-semibold hover:bg-surface-container-high"
                >
                  60/20/20
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCalcNeedsPct('70');
                    setCalcWantsPct('20');
                    setCalcSavingsPct('10');
                  }}
                  className="px-2 py-0.5 rounded-lg bg-surface-container text-[10px] text-on-surface font-semibold hover:bg-surface-container-high"
                >
                  70/20/10
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCalculatorModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-surface-container text-xs text-on-surface-variant font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-on-secondary text-xs font-bold shadow-md shadow-secondary/25"
                >
                  Simpan & Hitung
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
