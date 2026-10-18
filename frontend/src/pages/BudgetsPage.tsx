import React, { useState } from 'react';
import { useFinFlowStore } from '../store/useFinFlowStore';
import { formatRupiah } from '../utils/formatters';
import confetti from 'canvas-confetti';
import { CustomDropdown } from '../components/CustomDropdown';
import { CustomDatePicker } from '../components/CustomDatePicker';

const formatDeadlineText = (targetDate?: string) => {
  if (!targetDate || !targetDate.trim()) return 'Fleksibel';

  // Clean time and ISO 'T' timestamp if present (e.g., '2026-12-31T00:00:00Z' -> '2026-12-31')
  const cleanDateStr = targetDate.split('T')[0].split(' ')[0].trim();

  if (cleanDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const parts = cleanDateStr.split('-');
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const d = parseInt(parts[2], 10);
    const m = MONTHS[parseInt(parts[1], 10) - 1];
    const y = parts[0];
    return `${d} ${m} ${y}`;
  }

  // Fallback if parsing through standard JS Date
  const d = new Date(targetDate);
  if (!isNaN(d.getTime())) {
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  return cleanDateStr || 'Fleksibel';
};

export const BudgetsPage: React.FC = () => {
  const {
    user,
    savingsGoals,
    wallets,
    categories,
    transactions,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    addDepositToGoal,
    completeSavingsGoal,
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

  // Form states for editing goal
  const [isEditGoalModalOpen, setIsEditGoalModalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalName, setEditGoalName] = useState('');
  const [editTargetAmount, setEditTargetAmount] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');

  // Delete goal confirmation state
  const [goalToDelete, setGoalToDelete] = useState<{ id: string; name: string } | null>(null);

  // Complete & Buy Goal state
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [goalToComplete, setGoalToComplete] = useState<any | null>(null);
  const [actualPurchaseAmount, setActualPurchaseAmount] = useState('');
  const [selectedWalletForComplete, setSelectedWalletForComplete] = useState<string>(wallets[0]?.id || '');
  const [selectedCategoryForComplete, setSelectedCategoryForComplete] = useState<string>('');
  const [purchaseNotes, setPurchaseNotes] = useState('');

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
      const diffMonths = isNaN(targetTime) ? 999 : Math.max(1, Math.round((targetTime - nowMs) / (30 * 86400000)));
      return { ...g, diffMonths };
    })
    .filter((g) => g.diffMonths < 900)
    .sort((a, b) => a.diffMonths - b.diffMonths);

  const closestGoal = upcomingGoalsWithDeadline[0];

  // 50/30/20 Allocation numbers
  const income = salaryAllocation.monthlyIncome;
  const needsCap = (income * salaryAllocation.needsPercent) / 100;
  const wantsCap = (income * salaryAllocation.wantsPercent) / 100;
  const savingsCap = (income * salaryAllocation.savingsPercent) / 100;

  // Real spent per allocation pocket from transactions in current month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const isCurrentMonthTx = (t: any) => {
    const d = new Date(t.transactionDate);
    return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  };

  const needsSpent = transactions
    .filter((t) => {
      if (!isCurrentMonthTx(t) || t.type !== 'expense') return false;
      const cat = categories.find((c) => c.id === t.categoryId);
      return cat?.allocationGroup === 'needs';
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const wantsSpent = transactions
    .filter((t) => {
      if (!isCurrentMonthTx(t) || t.type !== 'expense') return false;
      const cat = categories.find((c) => c.id === t.categoryId);
      return cat?.allocationGroup === 'wants';
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const savingsSpent = transactions
    .filter((t) => {
      if (!isCurrentMonthTx(t)) return false;
      const cat = categories.find((c) => c.id === t.categoryId);
      const isSavingsGroup =
        cat?.allocationGroup === 'savings' ||
        cat?.name?.toLowerCase().includes('tabungan') ||
        (cat?.type === 'expense' && cat?.name?.toLowerCase().includes('investasi'));

      if (t.type === 'expense' && isSavingsGroup) return true;
      if (t.type === 'transfer' && isSavingsGroup) return true;
      return false;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  // Dana komitmen pada target impian yang sedang aktif
  const activeGoalSavings = savingsGoals
    .filter((g) => !g.isCompleted)
    .reduce((sum, g) => sum + g.currentAmount, 0);

  // Total alokasi tabungan & investasi (investasi riil + tabungan target aktif)
  const totalSavingsAllocation = savingsSpent + activeGoalSavings;

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim() || !targetAmount) return;

    const formattedDate = targetDate.trim();

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

  const handleOpenEditModal = (goal: any) => {
    setEditingGoalId(goal.id);
    setEditGoalName(goal.name);
    setEditTargetAmount(goal.targetAmount.toString());
    setEditTargetDate(goal.targetDate || '');
    setIsEditGoalModalOpen(true);
  };

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoalId || !editGoalName.trim() || !editTargetAmount) return;

    await updateSavingsGoal(editingGoalId, {
      name: editGoalName.trim(),
      targetAmount: parseFloat(editTargetAmount),
      targetDate: editTargetDate.trim(),
    });

    setIsEditGoalModalOpen(false);
    setEditingGoalId(null);
  };

  const handleConfirmDeleteGoal = async () => {
    if (!goalToDelete) return;
    await deleteSavingsGoal(goalToDelete.id);
    setGoalToDelete(null);
  };

  const handleOpenCompleteModal = (goal: any) => {
    setGoalToComplete(goal);
    // Prefill purchase price: use targetAmount if > 0, otherwise currentAmount
    const defaultAmount = goal.targetAmount > 0 ? goal.targetAmount : goal.currentAmount;
    setActualPurchaseAmount(defaultAmount.toString());
    setSelectedWalletForComplete(wallets[0]?.id || '');

    // Default category: find a 'wants' or 'belanja' expense category
    const defaultCat = categories.find((c) => c.type === 'expense' && (c.allocationGroup === 'wants' || c.name.toLowerCase().includes('belanja')));
    setSelectedCategoryForComplete(defaultCat ? defaultCat.id : categories[0]?.id || '');
    setPurchaseNotes(`Pembelian Target Impian: ${goal.name}`);
    setIsCompleteModalOpen(true);
  };

  const handleCompleteGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalToComplete || !actualPurchaseAmount || !selectedWalletForComplete) return;

    const amt = parseFloat(actualPurchaseAmount);
    if (isNaN(amt) || amt <= 0) return;

    const success = await completeSavingsGoal(
      goalToComplete.id,
      amt,
      selectedWalletForComplete,
      selectedCategoryForComplete || undefined,
      purchaseNotes.trim()
    );

    if (success) {
      try {
        confetti({
          particleCount: 140,
          spread: 100,
          origin: { y: 0.6 },
        });
      } catch {
        // Ignore
      }
      setIsCompleteModalOpen(false);
      setGoalToComplete(null);
    }
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
                      <span>Deadline: {formatDeadlineText(goal.targetDate)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {goal.isCompleted ? (
                    <span className="px-2.5 py-1 rounded-xl font-label-caps text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 flex items-center gap-1 shadow-[0_0_8px_rgba(78,222,163,0.2)]">
                      <span className="material-symbols-outlined text-[13px]">check_circle</span>
                      <span>Tuntas & Dibeli 🎉</span>
                    </span>
                  ) : (
                    <>
                      <span
                        className="px-2.5 py-0.5 rounded-full font-label-caps text-[11px] font-bold tabular-nums"
                        style={{ backgroundColor: `${goal.color}20`, color: goal.color }}
                      >
                        {pct}%
                      </span>
                      {pct < 100 && (
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
                      )}
                      <button
                        onClick={() => handleOpenCompleteModal(goal)}
                        className={`px-2.5 py-1 rounded-xl font-label-caps text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-[0_0_8px_rgba(78,222,163,0.25)] ${
                          pct >= 100
                            ? 'bg-primary text-surface-container-lowest font-extrabold shadow-[0_0_12px_rgba(78,222,163,0.5)] ring-1 ring-primary'
                            : 'bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30'
                        }`}
                        title="Beli & Tuntaskan Target"
                      >
                        <span className="material-symbols-outlined text-[15px]">shopping_cart_checkout</span>
                        <span>{pct >= 100 ? 'Beli Sekarang!' : 'Beli'}</span>
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(goal)}
                        className="p-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-all active:scale-90"
                        title="Edit Target"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setGoalToDelete({ id: goal.id, name: goal.name })}
                    className="p-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-error transition-all active:scale-90"
                    title="Hapus Target"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
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
                  {activeGoalSavings > 0
                    ? `Investasi ${formatRupiah(savingsSpent)} • Target ${formatRupiah(activeGoalSavings)}`
                    : 'Investasi & Target Tabungan Aktif'}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-num-data text-primary text-xs font-bold tabular-nums">
                {formatRupiah(totalSavingsAllocation)}
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
              <CustomDatePicker
                value={targetDate}
                onChange={setTargetDate}
                label="Deadline Target"
                placeholder="Pilih tanggal deadline (opsional)"
                allowClear={true}
              />
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

      {/* Modal Edit Target Impian */}
      {isEditGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-surface-container-low rounded-3xl border border-white/10 p-5 shadow-2xl flex flex-col gap-3.5 animate-slideUp">
            <div className="flex items-center justify-between pb-1 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center border border-secondary/20">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </div>
                <h4 className="font-headline-sm text-base font-bold text-on-surface">Edit Target Impian</h4>
              </div>
              <button onClick={() => setIsEditGoalModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={handleUpdateGoal} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-on-surface-variant font-medium">Nama Target Impian</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: DP Rumah, MacBook Pro"
                  value={editGoalName}
                  onChange={(e) => setEditGoalName(e.target.value)}
                  className="bg-surface-container px-3.5 py-2.5 rounded-xl text-xs text-on-surface border border-white/10"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-on-surface-variant font-medium">Target Nominal (Rp)</label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 50000000"
                  value={editTargetAmount}
                  onChange={(e) => setEditTargetAmount(e.target.value)}
                  className="bg-surface-container px-3.5 py-2.5 rounded-xl text-xs text-on-surface border border-white/10 font-num-data"
                />
              </div>
              <CustomDatePicker
                value={editTargetDate}
                onChange={setEditTargetDate}
                label="Deadline Target"
                placeholder="Pilih tanggal deadline (opsional)"
                allowClear={true}
              />
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditGoalModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-surface-container text-xs text-on-surface-variant font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-surface-container-lowest text-xs font-bold shadow-md shadow-secondary/25 hover:brightness-110 transition-all active:scale-95"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Target */}
      {goalToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-surface-container-low rounded-3xl border border-white/10 p-5 shadow-2xl flex flex-col gap-3.5 animate-slideUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-error/15 text-error flex items-center justify-center shrink-0 border border-error/25">
                <span className="material-symbols-outlined text-[22px]">delete_forever</span>
              </div>
              <div className="flex flex-col">
                <h4 className="font-headline-sm text-base font-bold text-on-surface">Hapus Target Impian?</h4>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Apakah Anda yakin ingin menghapus <strong className="text-on-surface">"{goalToDelete.name}"</strong>? Tabungan yang sudah terkumpul di dompet Anda tetap aman.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGoalToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-surface-container text-xs text-on-surface-variant font-bold hover:bg-surface-container-high transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteGoal}
                className="flex-1 py-2.5 rounded-xl bg-error text-surface-container-lowest text-xs font-bold shadow-md shadow-error/25 hover:brightness-110 transition-all active:scale-95"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Deposit / Nabung */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xs bg-surface-container-low rounded-3xl border border-white/10 p-5 shadow-2xl flex flex-col gap-3">
            <h4 className="font-headline-sm text-base font-bold text-on-surface">Tambah Tabungan</h4>
            <form onSubmit={handleDeposit} className="flex flex-col gap-3">
              <CustomDropdown
                label="Pilih Sumber Dompet"
                options={wallets.map((w) => ({
                  value: w.id,
                  label: w.name,
                  sublabel: formatRupiah(w.balance),
                  icon: w.icon || 'account_balance_wallet',
                  iconColor: w.color || '#4EDE93',
                }))}
                value={selectedWalletIdForDeposit}
                onChange={setSelectedWalletIdForDeposit}
                variant="primary"
              />

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
                <span className="text-[10px] text-on-surface-variant/70">
                  Uang tetap aman di rekening Anda (belum dipotong sebagai belanja) sampai target selesai Anda beli.
                </span>
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
                  Tambah Tabungan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Realisasi & Beli Target Impian */}
      {isCompleteModalOpen && goalToComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-surface-container-low rounded-3xl border border-white/10 p-5 shadow-2xl flex flex-col gap-3.5 animate-slideUp">
            <div className="flex items-center justify-between pb-1 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center border border-primary/30 shadow-[0_0_8px_rgba(78,222,163,0.3)]">
                  <span className="material-symbols-outlined text-[18px]">shopping_cart_checkout</span>
                </div>
                <div>
                  <h4 className="font-headline-sm text-base font-bold text-on-surface">Beli & Tuntaskan Target 🎉</h4>
                  <p className="text-[10px] text-on-surface-variant">Catat pengeluaran nyata saat membeli barang ini</p>
                </div>
              </div>
              <button onClick={() => setIsCompleteModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Target Info Box */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container border border-white/5">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-label-caps text-on-surface-variant font-bold">Barang Target</span>
                <span className="font-headline-sm text-sm font-bold text-on-surface">{goalToComplete.name}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase font-label-caps text-on-surface-variant font-bold">Target Nominal</span>
                <span className="font-num-data text-xs font-bold text-primary">{formatRupiah(goalToComplete.targetAmount)}</span>
              </div>
            </div>

            <form onSubmit={handleCompleteGoal} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-on-surface-variant font-medium">Harga Beli Aktual (Rp)</label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 1000000"
                  value={actualPurchaseAmount}
                  onChange={(e) => setActualPurchaseAmount(e.target.value)}
                  className="bg-surface-container px-3.5 py-2.5 rounded-xl text-xs text-on-surface border border-white/10 font-num-data text-primary font-bold"
                />
                <span className="text-[10px] text-on-surface-variant/70">
                  Saldo dompet akan dipotong sebesar nominal belanja nyata ini.
                </span>
              </div>

              <CustomDropdown
                label="Pilih Dompet Pembayaran"
                options={wallets.map((w) => ({
                  value: w.id,
                  label: w.name,
                  sublabel: `Saldo: ${formatRupiah(w.balance)}`,
                  icon: w.icon || 'account_balance_wallet',
                  iconColor: w.color || '#4EDE93',
                }))}
                value={selectedWalletForComplete}
                onChange={setSelectedWalletForComplete}
                variant="primary"
              />

              {/* Real-time Wallet Balance Alert */}
              {(() => {
                const selectedWallet = wallets.find((w) => w.id === selectedWalletForComplete);
                const purchaseAmt = parseFloat(actualPurchaseAmount || '0');
                if (selectedWallet && purchaseAmt > 0 && purchaseAmt > selectedWallet.balance) {
                  return (
                    <div className="p-2.5 rounded-xl bg-error/10 border border-error/20 flex items-start gap-2 text-error text-[11px]">
                      <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">warning</span>
                      <span>
                        Saldo dompet <strong>{selectedWallet.name}</strong> ({formatRupiah(selectedWallet.balance)}) kurang dari nominal pembayaran ({formatRupiah(purchaseAmt)}).
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              <CustomDropdown
                label="Kategori Pengeluaran"
                options={categories
                  .filter((c) => c.type === 'expense')
                  .map((c) => ({
                    value: c.id,
                    label: c.name,
                    sublabel: c.allocationGroup ? `Grup: ${c.allocationGroup}` : undefined,
                    icon: c.icon || 'category',
                    iconColor: c.color || '#4EDE93',
                  }))}
                value={selectedCategoryForComplete}
                onChange={setSelectedCategoryForComplete}
                variant="secondary"
              />

              <div className="flex flex-col gap-1">
                <label className="text-xs text-on-surface-variant font-medium">Catatan Pembelian (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Beli Sepatu Adidas di Mall"
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  className="bg-surface-container px-3.5 py-2.5 rounded-xl text-xs text-on-surface border border-white/10"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCompleteModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-surface-container text-xs text-on-surface-variant font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={(() => {
                    const selectedWallet = wallets.find((w) => w.id === selectedWalletForComplete);
                    const purchaseAmt = parseFloat(actualPurchaseAmount || '0');
                    return !purchaseAmt || purchaseAmt <= 0 || (!!selectedWallet && purchaseAmt > selectedWallet.balance);
                  })()}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-surface-container-lowest text-xs font-bold shadow-md shadow-primary/25 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Bayar & Selesaikan</span>
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
