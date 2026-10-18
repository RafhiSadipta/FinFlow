import React, { useState } from 'react';
import { useFinFlowStore } from '../store/useFinFlowStore';
import { formatRupiah } from '../utils/formatters';
import type { Category } from '../types';

// Catmull-Rom to Cubic Bezier smooth path generator
function getSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;

  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

export const AnalyticsPage: React.FC = () => {
  const {
    transactions,
    categories,
    deletedCategories,
    budgets,
    savingsGoals,
    salaryAllocation,
    setBudgetLimit,
    deleteCategory,
    restoreCategory,
    setCategoryModalOpen,
  } = useFinFlowStore();

  const [activeSegment, setActiveSegment] = useState<'month' | 'quarter' | 'year'>('month');

  // Modal edit category limit state
  const [selectedCategoryToEdit, setSelectedCategoryToEdit] = useState<Category | null>(null);
  const [editLimitInput, setEditLimitInput] = useState<string>('');
  const [isSavingLimit, setIsSavingLimit] = useState<boolean>(false);

  // Soft delete category state
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState<boolean>(false);
  const [showDeletedSection, setShowDeletedSection] = useState<boolean>(false);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 - 11 (0=Jan, 9=Okt, 11=Des)
  const currentQuarter = Math.floor(currentMonth / 3) + 1; // 1 - 4
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Previous period reference for comparison
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const prevQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
  const prevQuarterYear = currentQuarter === 1 ? currentYear - 1 : currentYear;
  const prevYear = currentYear - 1;

  // Helper to determine if transaction counts towards expense or savings allocation in analytics
  const isAnalyzedTransaction = (t: any) => {
    if (t.type === 'expense') return true;
    if (t.type === 'transfer' && t.categoryId) {
      const cat = categories.find((c) => c.id === t.categoryId);
      return (
        cat?.allocationGroup === 'savings' ||
        cat?.name?.toLowerCase().includes('tabungan') ||
        (cat?.type === 'expense' && cat?.name?.toLowerCase().includes('investasi'))
      );
    }
    return false;
  };

  // Filter current & previous period transactions (expenses and savings transfers)
  const currentPeriodTxs = transactions.filter((t) => {
    if (!isAnalyzedTransaction(t)) return false;
    const d = new Date(t.transactionDate);
    if (isNaN(d.getTime())) return false;
    if (activeSegment === 'month') {
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }
    if (activeSegment === 'quarter') {
      const q = Math.floor(d.getMonth() / 3) + 1;
      return d.getFullYear() === currentYear && q === currentQuarter;
    }
    return d.getFullYear() === currentYear;
  });

  const prevPeriodTxs = transactions.filter((t) => {
    if (!isAnalyzedTransaction(t)) return false;
    const d = new Date(t.transactionDate);
    if (isNaN(d.getTime())) return false;
    if (activeSegment === 'month') {
      return d.getFullYear() === prevMonthYear && d.getMonth() === prevMonth;
    }
    if (activeSegment === 'quarter') {
      const q = Math.floor(d.getMonth() / 3) + 1;
      return d.getFullYear() === prevQuarterYear && q === prevQuarter;
    }
    return d.getFullYear() === prevYear;
  });

  const currentPeriodTotal = currentPeriodTxs.reduce((sum, t) => sum + t.amount, 0);
  const prevPeriodTotal = prevPeriodTxs.reduce((sum, t) => sum + t.amount, 0);

  const hasCurrentData = currentPeriodTotal > 0;
  const hasPrevData = prevPeriodTotal > 0;

  // Dynamic Comparison Badge
  let comparisonBadge = 'Bulan Pertama';
  let comparisonBadgePositive = true;

  if (hasCurrentData && hasPrevData) {
    const diff = currentPeriodTotal - prevPeriodTotal;
    const pct = Math.abs(Math.round((diff / prevPeriodTotal) * 100));
    const unit = activeSegment === 'month' ? 'MoM' : activeSegment === 'quarter' ? 'QoQ' : 'YoY';
    if (diff <= 0) {
      comparisonBadge = `-${pct}% ${unit} (Hemat)`;
      comparisonBadgePositive = true;
    } else {
      comparisonBadge = `+${pct}% ${unit}`;
      comparisonBadgePositive = false;
    }
  } else if (!hasCurrentData && !hasPrevData) {
    comparisonBadge = 'Belum Ada Transaksi';
    comparisonBadgePositive = true;
  } else if (hasCurrentData && !hasPrevData) {
    comparisonBadge = 'Bulan Pertama';
    comparisonBadgePositive = true;
  } else if (!hasCurrentData && hasPrevData) {
    comparisonBadge = 'Rp 0 • Belum Ada Pengeluaran';
    comparisonBadgePositive = true;
  }

  // Dynamic Month Ticks (Tgl 1, 7, 14, 21, 28, dan akhir bulan)
  const monthTicks = [1, 7, 14, 21, 28, daysInCurrentMonth];
  const monthLabels = monthTicks.map((d) => `Tgl ${d}`);
  let activeMonthTickIndex = 0;
  for (let i = 0; i < monthTicks.length; i++) {
    if (now.getDate() >= monthTicks[i]) {
      activeMonthTickIndex = i;
    }
  }

  // Dynamic Quarter Month Names (e.g. Okt, Nov, Des for Q4)
  const quarterStartMonth = (currentQuarter - 1) * 3;
  const quarterMonthNames = [0, 1, 2].map((offset) => {
    const d = new Date(currentYear, quarterStartMonth + offset, 1);
    return d.toLocaleDateString('id-ID', { month: 'short' });
  });
  const activeQuarterMonthIndex = currentMonth - quarterStartMonth;
  const activeYearQuarterIndex = currentQuarter - 1;

  // Real-time progress ratio across the active segment
  const monthRatio = Math.max(0.06, Math.min(0.94, (now.getDate() - 1) / (daysInCurrentMonth - 1)));
  const quarterStartDate = new Date(currentYear, quarterStartMonth, 1).getTime();
  const quarterEndDate = new Date(currentYear, quarterStartMonth + 3, 0).getTime();
  const quarterRatio = Math.max(0.06, Math.min(0.94, (now.getTime() - quarterStartDate) / (quarterEndDate - quarterStartDate)));
  const yearStartDate = new Date(currentYear, 0, 1).getTime();
  const yearEndDate = new Date(currentYear, 11, 31).getTime();
  const yearRatio = Math.max(0.06, Math.min(0.94, (now.getTime() - yearStartDate) / (yearEndDate - yearStartDate)));

  // Dynamic budget cap for scaling the Y axis
  const income = salaryAllocation?.monthlyIncome || 0;
  const segmentMultiplier = activeSegment === 'month' ? 1 : activeSegment === 'quarter' ? 3 : 12;
  const periodBudgetCap = (income * ((salaryAllocation?.needsPercent || 50) + (salaryAllocation?.wantsPercent || 30)) / 100) * segmentMultiplier;
  const maxY = Math.max(periodBudgetCap, currentPeriodTotal, prevPeriodTotal, 100000);

  // Cumulative series points for current & previous periods
  let currentPoints: { x: number; y: number }[] = [];
  let prevPoints: { x: number; y: number }[] = [];
  let pinpointX = 160;
  let pinpointY = 135;
  let currentCumulativeAmount = 0;

  if (activeSegment === 'month') {
    const currentDay = Math.min(now.getDate(), daysInCurrentMonth);
    pinpointX = Math.round(15 + ((currentDay - 1) / (daysInCurrentMonth - 1)) * 290);

    if (hasCurrentData) {
      let running = 0;
      for (let day = 1; day <= currentDay; day++) {
        const dayTxs = currentPeriodTxs.filter((t) => new Date(t.transactionDate).getDate() === day);
        const daySum = dayTxs.reduce((sum, t) => sum + t.amount, 0);
        running += daySum;
        const x = Math.round(15 + ((day - 1) / (daysInCurrentMonth - 1)) * 290);
        const y = Math.round(135 - (running / maxY) * 110);
        currentPoints.push({ x, y });
      }
      currentCumulativeAmount = running;
      pinpointY = currentPoints[currentPoints.length - 1].y;
    } else {
      pinpointY = 135;
      currentPoints = [
        { x: 15, y: 135 },
        { x: pinpointX, y: 135 },
      ];
    }

    if (hasPrevData) {
      const prevDaysInMonth = new Date(prevMonthYear, prevMonth + 1, 0).getDate();
      let prevRunning = 0;
      for (let day = 1; day <= prevDaysInMonth; day++) {
        const dayTxs = prevPeriodTxs.filter((t) => new Date(t.transactionDate).getDate() === day);
        const daySum = dayTxs.reduce((sum, t) => sum + t.amount, 0);
        prevRunning += daySum;
        const x = Math.round(15 + ((day - 1) / (prevDaysInMonth - 1)) * 290);
        const y = Math.round(135 - (prevRunning / maxY) * 110);
        prevPoints.push({ x, y });
      }
    }
  } else if (activeSegment === 'quarter') {
    pinpointX = Math.round(15 + quarterRatio * 290);

    if (hasCurrentData) {
      let running = 0;
      const qStartMonth = (currentQuarter - 1) * 3;
      for (let mIdx = 0; mIdx <= activeQuarterMonthIndex; mIdx++) {
        const monthNum = qStartMonth + mIdx;
        const mTxs = currentPeriodTxs.filter((t) => new Date(t.transactionDate).getMonth() === monthNum);
        const mSum = mTxs.reduce((sum, t) => sum + t.amount, 0);
        running += mSum;
        const x = Math.round(15 + (mIdx / 2) * 290);
        const y = Math.round(135 - (running / maxY) * 110);
        currentPoints.push({ x, y });
      }
      currentCumulativeAmount = running;
      pinpointY = currentPoints[currentPoints.length - 1].y;
    } else {
      pinpointY = 135;
      currentPoints = [
        { x: 15, y: 135 },
        { x: pinpointX, y: 135 },
      ];
    }

    if (hasPrevData) {
      let prevRunning = 0;
      const prevQStartMonth = (prevQuarter - 1) * 3;
      for (let mIdx = 0; mIdx < 3; mIdx++) {
        const monthNum = prevQStartMonth + mIdx;
        const mTxs = prevPeriodTxs.filter((t) => new Date(t.transactionDate).getMonth() === monthNum);
        const mSum = mTxs.reduce((sum, t) => sum + t.amount, 0);
        prevRunning += mSum;
        const x = Math.round(15 + (mIdx / 2) * 290);
        const y = Math.round(135 - (prevRunning / maxY) * 110);
        prevPoints.push({ x, y });
      }
    }
  } else {
    // year
    pinpointX = Math.round(15 + yearRatio * 290);

    if (hasCurrentData) {
      let running = 0;
      for (let qIdx = 0; qIdx <= activeYearQuarterIndex; qIdx++) {
        const qNum = qIdx + 1;
        const qTxs = currentPeriodTxs.filter((t) => {
          const d = new Date(t.transactionDate);
          return Math.floor(d.getMonth() / 3) + 1 === qNum;
        });
        const qSum = qTxs.reduce((sum, t) => sum + t.amount, 0);
        running += qSum;
        const x = Math.round(15 + (qIdx / 3) * 290);
        const y = Math.round(135 - (running / maxY) * 110);
        currentPoints.push({ x, y });
      }
      currentCumulativeAmount = running;
      pinpointY = currentPoints[currentPoints.length - 1].y;
    } else {
      pinpointY = 135;
      currentPoints = [
        { x: 15, y: 135 },
        { x: pinpointX, y: 135 },
      ];
    }

    if (hasPrevData) {
      let prevRunning = 0;
      for (let qIdx = 0; qIdx < 4; qIdx++) {
        const qNum = qIdx + 1;
        const qTxs = prevPeriodTxs.filter((t) => {
          const d = new Date(t.transactionDate);
          return Math.floor(d.getMonth() / 3) + 1 === qNum;
        });
        const qSum = qTxs.reduce((sum, t) => sum + t.amount, 0);
        prevRunning += qSum;
        const x = Math.round(15 + (qIdx / 3) * 290);
        const y = Math.round(135 - (prevRunning / maxY) * 110);
        prevPoints.push({ x, y });
      }
    }
  }

  // Smooth SVG paths
  let currentCurvePath = '';
  let currentAreaPath = '';
  if (hasCurrentData && currentPoints.length >= 2) {
    currentCurvePath = getSmoothPath(currentPoints);
    currentAreaPath = `${currentCurvePath} L ${currentPoints[currentPoints.length - 1].x},135 L ${currentPoints[0].x},135 Z`;
  } else if (hasCurrentData && currentPoints.length === 1) {
    currentCurvePath = `M 15,135 L ${currentPoints[0].x},${currentPoints[0].y}`;
    currentAreaPath = `${currentCurvePath} L ${currentPoints[0].x},135 L 15,135 Z`;
  } else {
    currentCurvePath = `M 15,135 L 305,135`;
    currentAreaPath = '';
  }

  const prevCurvePath = hasPrevData && prevPoints.length >= 2 ? getSmoothPath(prevPoints) : '';

  // Dynamic configuration per active segment
  const segmentConfig = {
    month: {
      label: 'Bulan Ini',
      periodTitle: now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      comparisonLabel: 'Bulan Ini vs Bulan Lalu',
      comparisonBadge,
      comparisonBadgePositive,
      xAxis: monthLabels,
      activeXIndex: activeMonthTickIndex,
      pinpointLabel: `Tgl ${now.getDate()} (${now.toLocaleDateString('id-ID', { weekday: 'short' })})`,
      pinpointValue: hasCurrentData ? formatRupiah(currentCumulativeAmount) : 'Rp 0',
      multiplier: 1,
    },
    quarter: {
      label: `Kuartal (Q${currentQuarter})`,
      periodTitle: `Kuartal ${currentQuarter} • ${currentYear}`,
      comparisonLabel: `Q${currentQuarter} vs Q${prevQuarter}`,
      comparisonBadge,
      comparisonBadgePositive,
      xAxis: quarterMonthNames,
      activeXIndex: activeQuarterMonthIndex,
      pinpointLabel: `${now.toLocaleDateString('id-ID', { month: 'long' })} (Bulan Ini)`,
      pinpointValue: hasCurrentData ? formatRupiah(currentCumulativeAmount) : 'Rp 0',
      multiplier: 3,
    },
    year: {
      label: `Tahun ${currentYear}`,
      periodTitle: `Tahun Berjalan ${currentYear}`,
      comparisonLabel: `Tahun ${currentYear} vs ${prevYear}`,
      comparisonBadge,
      comparisonBadgePositive,
      xAxis: ['Q1', 'Q2', 'Q3', 'Q4'],
      activeXIndex: activeYearQuarterIndex,
      pinpointLabel: `Kuartal ${currentQuarter} (${currentYear})`,
      pinpointValue: hasCurrentData ? formatRupiah(currentCumulativeAmount) : 'Rp 0',
      multiplier: 12,
    },
  };

  const config = segmentConfig[activeSegment];

  // 1. Prepare active categories (use real categories from store, fallback to standard if empty)
  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const activeCategories: Category[] = expenseCategories.length > 0 ? expenseCategories : [
    { id: 'cat-1', name: 'Makanan & Minuman', type: 'expense', allocationGroup: 'needs', icon: 'restaurant', color: '#4EDE93' },
    { id: 'cat-2', name: 'Belanja & Gaya Hidup', type: 'expense', allocationGroup: 'wants', icon: 'shopping_bag', color: '#D0BCFF' },
    { id: 'cat-3', name: 'Transportasi', type: 'expense', allocationGroup: 'needs', icon: 'directions_car', color: '#4CD7F6' },
    { id: 'cat-4', name: 'Tagihan & Utilitas', type: 'expense', allocationGroup: 'needs', icon: 'receipt_long', color: '#F6AD55' },
    { id: 'cat-5', name: 'Hiburan & Rekreasi', type: 'expense', allocationGroup: 'wants', icon: 'sports_esports', color: '#FF8BA7' },
  ];

  // 2. 50/30/20 salary budget calculation
  const needsCap = (income * (salaryAllocation?.needsPercent || 50)) / 100;
  const wantsCap = (income * (salaryAllocation?.wantsPercent || 30)) / 100;
  const savingsCap = (income * (salaryAllocation?.savingsPercent || 20)) / 100;

  const getGroupCap = (group: string | undefined): number => {
    if (group === 'wants') return wantsCap;
    if (group === 'savings') return savingsCap;
    return needsCap;
  };

  const getGroupName = (group: string | undefined): string => {
    if (group === 'wants') return `Keinginan (${salaryAllocation?.wantsPercent || 30}%)`;
    if (group === 'savings') return `Tabungan (${salaryAllocation?.savingsPercent || 20}%)`;
    return `Kebutuhan (${salaryAllocation?.needsPercent || 50}%)`;
  };

  const getCategoryCustomLimit = (catId: string): number | null => {
    const b = budgets.find((item) => item.categoryId === catId);
    return b && b.limitAmount > 0 ? b.limitAmount : null;
  };

  // Total custom allocated by user per pocket
  const customAllocatedPerGroup = {
    needs: activeCategories
      .filter((c) => (c.allocationGroup || 'needs') === 'needs' && getCategoryCustomLimit(c.id) !== null)
      .reduce((sum, c) => sum + (getCategoryCustomLimit(c.id) || 0), 0),
    wants: activeCategories
      .filter((c) => c.allocationGroup === 'wants' && getCategoryCustomLimit(c.id) !== null)
      .reduce((sum, c) => sum + (getCategoryCustomLimit(c.id) || 0), 0),
    savings: activeCategories
      .filter((c) => c.allocationGroup === 'savings' && getCategoryCustomLimit(c.id) !== null)
      .reduce((sum, c) => sum + (getCategoryCustomLimit(c.id) || 0), 0),
  };

  // Remaining uncustomized capacity per pocket
  const remainingCapPerGroup = {
    needs: Math.max(0, needsCap - customAllocatedPerGroup.needs),
    wants: Math.max(0, wantsCap - customAllocatedPerGroup.wants),
    savings: Math.max(0, savingsCap - customAllocatedPerGroup.savings),
  };

  // Count of uncustomized categories per pocket
  const uncustomizedCatsCountPerGroup = {
    needs: activeCategories.filter((c) => (c.allocationGroup || 'needs') === 'needs' && getCategoryCustomLimit(c.id) === null).length,
    wants: activeCategories.filter((c) => c.allocationGroup === 'wants' && getCategoryCustomLimit(c.id) === null).length,
    savings: activeCategories.filter((c) => c.allocationGroup === 'savings' && getCategoryCustomLimit(c.id) === null).length,
  };

  // Calculates dynamic auto limit for categories that are not customized (distributes remaining group cap)
  const getDefaultLimitForCategory = (cat: Category): number => {
    const group = (cat.allocationGroup || 'needs') as 'needs' | 'wants' | 'savings';
    const remaining = remainingCapPerGroup[group] || 0;
    const count = uncustomizedCatsCountPerGroup[group] || 1;
    if (remaining <= 0) return 0;
    return Math.max(0, Math.round((remaining / count) / 50000) * 50000);
  };

  // Calculates the MAXIMUM limit this specific category can be assigned without exceeding the pocket cap
  const getCategoryMaxAllowedLimit = (cat: Category): number => {
    const group = (cat.allocationGroup || 'needs') as 'needs' | 'wants' | 'savings';
    const groupCap = getGroupCap(group);

    // Sum of custom limits of other categories in this group (excluding this category)
    const otherCustomAllocated = activeCategories
      .filter((c) => c.id !== cat.id && (c.allocationGroup || 'needs') === group && getCategoryCustomLimit(c.id) !== null)
      .reduce((sum, c) => sum + (getCategoryCustomLimit(c.id) || 0), 0);

    return Math.max(0, groupCap - otherCustomAllocated);
  };

  const getSubtext = (cat: Category): string => {
    if (cat.allocationGroup === 'needs') return `Alokasi Kebutuhan (${salaryAllocation?.needsPercent || 50}%)`;
    if (cat.allocationGroup === 'wants') return `Alokasi Keinginan (${salaryAllocation?.wantsPercent || 30}%)`;
    if (cat.allocationGroup === 'savings') return `Alokasi Tabungan (${salaryAllocation?.savingsPercent || 20}%)`;
    return 'Kategori Pengeluaran';
  };

  // Handlers for editing category limit
  const handleOpenEditLimit = (cat: Category, currentMonthlyLimit: number) => {
    setSelectedCategoryToEdit(cat);
    const maxAllowed = getCategoryMaxAllowedLimit(cat);
    // Initial value clamped to max allowed
    const initialVal = Math.min(currentMonthlyLimit, maxAllowed);
    setEditLimitInput(initialVal.toString());
  };

  const handleSaveCategoryLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryToEdit) return;

    const parsedLimit = parseFloat(editLimitInput) || 0;
    const maxAllowed = getCategoryMaxAllowedLimit(selectedCategoryToEdit);

    if (parsedLimit > maxAllowed) {
      return;
    }

    setIsSavingLimit(true);
    try {
      await setBudgetLimit(selectedCategoryToEdit.id, parsedLimit);
      setSelectedCategoryToEdit(null);
    } finally {
      setIsSavingLimit(false);
    }
  };

  // Dana komitmen tabungan target impian yang masih aktif berjalan
  const activeGoalSavings = savingsGoals
    .filter((g) => !g.isCompleted)
    .reduce((sum, g) => sum + g.currentAmount, 0);

  // Kategori tabungan / investasi utama
  const primarySavingsCatId = activeCategories.find(
    (c) => c.allocationGroup === 'savings' || c.name.toLowerCase().includes('tabungan')
  )?.id;

  // Dynamically calculate category statistics with real recorded transactions for active period
  const categoryStats = activeCategories.map((cat) => {
    // Check if user set a custom budget for this category
    const customBudget = budgets.find((b) => b.categoryId === cat.id);
    const isCustom = !!customBudget && customBudget.limitAmount > 0;
    const baseMonthlyLimit = isCustom ? customBudget.limitAmount : getDefaultLimitForCategory(cat);

    // User transactions in this category for active period
    const userRealSpent = currentPeriodTxs
      .filter((t) => t.categoryId === cat.id)
      .reduce((sum, t) => sum + t.amount, 0);

    const isPrimarySavings = cat.id === primarySavingsCatId;
    const goalSavingsForCat = isPrimarySavings ? activeGoalSavings : 0;
    const calculatedSpent = userRealSpent + goalSavingsForCat;
    const calculatedLimit = Math.round(baseMonthlyLimit * config.multiplier);
    const percentage = calculatedLimit > 0 ? Math.min(100, Math.round((calculatedSpent / calculatedLimit) * 100)) : 0;

    let status = 'Aman';
    let statusColor = 'bg-primary/15 text-primary border-primary/30';
    if (calculatedSpent === 0) {
      status = 'Rp 0';
      statusColor = 'bg-surface-container-high text-on-surface-variant border-white/5';
    } else if (percentage >= 100) {
      status = 'Melebihi Limit';
      statusColor = 'bg-error/15 text-error border-error/30';
    } else if (percentage >= 80) {
      status = 'Mendekati Limit';
      statusColor = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    }

    return {
      ...cat,
      subtext: isPrimarySavings && activeGoalSavings > 0
        ? `${getSubtext(cat)} • Target: ${formatRupiah(activeGoalSavings)}`
        : getSubtext(cat),
      baseMonthlyLimit,
      isCustom,
      spent: calculatedSpent,
      goalSavings: goalSavingsForCat,
      limit: calculatedLimit,
      percentage,
      status,
      statusColor,
    };
  });

  // Calculate total expense dynamically
  const totalExpense = categoryStats.reduce((sum, c) => sum + c.spent, 0);

  // Donut chart radial geometry
  const DONUT_RADIUS = 46;
  const CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS; // ~289.03
  const CX = 180;
  const CY = 110;

  const hasExpenseData = totalExpense > 0;
  const activeExpenseItems = hasExpenseData
    ? categoryStats.filter((c) => c.spent > 0)
    : categoryStats;

  const totalLimitSum = activeExpenseItems.reduce((sum, c) => sum + (c.baseMonthlyLimit || 1), 0) || 1;

  let accumulatedOffset = 0;
  const rawDonutSegments = activeExpenseItems.map((item) => {
    const fraction = hasExpenseData
      ? item.spent / totalExpense
      : (item.baseMonthlyLimit || 1) / totalLimitSum;

    const strokeDash = Math.max(2, fraction * CIRCUMFERENCE);
    const strokeGap = Math.max(0, CIRCUMFERENCE - strokeDash);
    const offset = -accumulatedOffset;

    const startAngleDeg = (accumulatedOffset / CIRCUMFERENCE) * 360;
    const spanAngleDeg = fraction * 360;
    const midAngleDeg = startAngleDeg + spanAngleDeg / 2;
    accumulatedOffset += strokeDash;

    const percentageShare = hasExpenseData
      ? Math.round((item.spent / totalExpense) * 100)
      : 0;

    const mathAngleRad = (midAngleDeg - 90) * (Math.PI / 180);

    const rArc = DONUT_RADIUS + 7.5;
    const xArc = CX + rArc * Math.cos(mathAngleRad);
    const yArc = CY + rArc * Math.sin(mathAngleRad);

    const isRightSide = Math.cos(mathAngleRad) >= 0;

    const rElbow = 72;
    const xElbow = CX + rElbow * Math.cos(mathAngleRad);
    const yElbow = CY + rElbow * Math.sin(mathAngleRad);

    const xExt = isRightSide ? Math.min(265, Math.max(xElbow + 15, 235)) : Math.max(85, Math.min(xElbow - 15, 115));
    const xText = isRightSide ? xExt + 4 : xExt - 4;

    return {
      ...item,
      fraction,
      dasharray: `${strokeDash.toFixed(1)} ${strokeGap.toFixed(1)}`,
      offset: offset.toFixed(1),
      percentageShare,
      midAngleDeg,
      xArc,
      yArc,
      xElbow,
      yElbow,
      yLabel: yElbow,
      xExt,
      xText,
      isRightSide,
    };
  });

  const adjustLabelY = (items: typeof rawDonutSegments) => {
    if (items.length <= 1) return items;
    const sorted = [...items].sort((a, b) => a.yElbow - b.yElbow);
    const minYGap = 24;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].yLabel - sorted[i - 1].yLabel < minYGap) {
        sorted[i].yLabel = sorted[i - 1].yLabel + minYGap;
      }
    }
    const maxY = 195;
    if (sorted[sorted.length - 1].yLabel > maxY) {
      const shift = sorted[sorted.length - 1].yLabel - maxY;
      for (let i = 0; i < sorted.length; i++) {
        sorted[i].yLabel = Math.max(20, sorted[i].yLabel - shift);
      }
    }
    return sorted;
  };

  const rightSideSegments = adjustLabelY(rawDonutSegments.filter((s) => s.isRightSide));
  const leftSideSegments = adjustLabelY(rawDonutSegments.filter((s) => !s.isRightSide));
  const donutSegmentsWithCallouts = [...rightSideSegments, ...leftSideSegments];

  return (
    <div className="flex flex-col w-full px-4 pb-28 gap-4 max-w-md mx-auto animate-fadeIn">
      {/* 1. Header & Segmented Time Filter */}
      <section className="flex flex-col gap-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
              Ringkasan Analitik
            </span>
            <h2 className="font-headline-sm text-lg font-bold text-on-surface tracking-tight">
              Struktur Pengeluaran
            </h2>
          </div>
          <button
            onClick={() => setCategoryModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-xs text-primary border border-primary/20 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span>Kategori</span>
          </button>
        </div>

        {/* Time Filter Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-surface-container-low border border-white/5 shadow-inner">
          {(['month', 'quarter', 'year'] as const).map((segmentId) => (
            <button
              key={segmentId}
              onClick={() => setActiveSegment(segmentId)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSegment === segmentId
                  ? 'bg-surface-container-high text-on-surface shadow-sm border border-white/10'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {segmentConfig[segmentId].label}
            </button>
          ))}
        </div>
      </section>

      {/* 2. Donut Chart Pengeluaran Visual dengan Radial Callout Dotted Lines */}
      <section className="bg-surface-container rounded-2xl p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/5 relative overflow-hidden">
        {/* Glow Halos */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-primary/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-secondary/15 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header di Paling Atas Kotak (Rapi, Luas, & Tidak Menimpa Diagram) */}
        <div className="relative z-10 flex items-start justify-between w-full pb-3 border-b border-white/5">
          <div className="flex flex-col gap-0.5">
            <span className="font-label-caps text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">
              Total Pengeluaran
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight tabular-nums drop-shadow-md">
                {formatRupiah(totalExpense)}
              </span>
            </div>
            <span className="font-body-sm text-[11px] text-on-surface-variant">
              {config.periodTitle}
            </span>
          </div>

          {/* Badge Perbandingan MoM / Periode */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm ${
            config.comparisonBadgePositive
              ? 'bg-primary/10 border-primary/20 text-primary'
              : 'bg-error/10 border-error/20 text-error'
          }`}>
            <span className="material-symbols-outlined text-[14px]">
              {config.comparisonBadgePositive ? 'trending_down' : 'trending_up'}
            </span>
            <span className="font-label-caps text-[10px] font-bold">
              {config.comparisonBadge}
            </span>
          </div>
        </div>

        <div className="relative flex flex-col items-center w-full pt-2">
          {/* Radial Donut SVG with Dotted Callout Leader Lines */}
          <div className="relative w-full max-w-[370px] flex items-center justify-center">
            <svg
              className="w-full h-auto overflow-visible select-none"
              viewBox="0 0 360 220"
            >
              {/* Defs for Glow Filter */}
              <defs>
                <filter id="donutGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Background Base Ring */}
              <circle
                cx={CX}
                cy={CY}
                r={DONUT_RADIUS}
                fill="none"
                opacity="0.18"
                stroke="#313540"
                strokeWidth="14"
              />

              {/* Donut Colored Arcs (Rotated -90deg so starts at 12 o'clock) */}
              <g transform={`rotate(-90 ${CX} ${CY})`}>
                {donutSegmentsWithCallouts.map((item) => (
                  <circle
                    key={`arc-${item.id}`}
                    cx={CX}
                    cy={CY}
                    fill="none"
                    r={DONUT_RADIUS}
                    stroke={item.color}
                    strokeOpacity={hasExpenseData ? 1 : 0.4}
                    strokeDasharray={item.dasharray}
                    strokeDashoffset={item.offset}
                    strokeLinecap="round"
                    strokeWidth="13"
                    className="transition-all duration-700 ease-out hover:stroke-[16px] cursor-pointer"
                    style={{ filter: hasExpenseData ? `drop-shadow(0 0 6px ${item.color}80)` : 'none' }}
                  />
                ))}
              </g>

              {/* Dotted Callout Leader Lines, Dots, and Category Labels */}
              {donutSegmentsWithCallouts.map((item) => {
                const leaderPath = `M ${item.xArc.toFixed(1)},${item.yArc.toFixed(1)} L ${item.xElbow.toFixed(1)},${item.yLabel.toFixed(1)} L ${item.xExt.toFixed(1)},${item.yLabel.toFixed(1)}`;
                const displayName = item.name.length > 18 ? item.name.slice(0, 16) + '...' : item.name;

                return (
                  <g key={`callout-${item.id}`} className="transition-all duration-500">
                    {/* Dotted Leader Line */}
                    <path
                      d={leaderPath}
                      fill="none"
                      stroke={item.color}
                      strokeDasharray="2.5 2"
                      strokeWidth="1.2"
                      opacity={hasExpenseData ? 0.85 : 0.5}
                    />

                    {/* Anchor Dot on the Donut Arc */}
                    <circle cx={item.xArc} cy={item.yArc} r="2.5" fill={item.color} opacity={hasExpenseData ? 1 : 0.6} />
                    <circle cx={item.xArc} cy={item.yArc} r="1" fill="#FFFFFF" opacity={hasExpenseData ? 1 : 0.6} />

                    {/* Category Name Label */}
                    <text
                      x={item.xText}
                      y={item.yLabel - 3}
                      textAnchor={item.isRightSide ? 'start' : 'end'}
                      className="font-headline-sm text-[10px] font-bold fill-on-surface"
                    >
                      {displayName}
                    </text>

                    {/* Percentage & Nominal Label */}
                    <text
                      x={item.xText}
                      y={item.yLabel + 10}
                      textAnchor={item.isRightSide ? 'start' : 'end'}
                      className="font-num-data text-[10px] font-extrabold"
                      fill={item.color}
                    >
                      {item.percentageShare}%
                      {hasExpenseData && item.spent > 0 ? ` • ${formatRupiah(item.spent)}` : ''}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Donut Center Elegant Badge (Rapi, Pas di Tengah Lubang Donut, Tidak Menimpa Garis Arc) */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none text-center">
              <div className="w-10 h-10 rounded-full bg-surface-container-highest/70 border border-white/5 flex items-center justify-center text-primary shadow-sm mb-0.5">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  pie_chart
                </span>
              </div>
              <span className="font-label-caps text-[9px] text-on-surface-variant font-semibold">
                {hasExpenseData ? `${activeExpenseItems.length} Kategori` : '0 Transaksi'}
              </span>
            </div>
          </div>

          {!hasExpenseData && (
            <p className="text-[10px] text-on-surface-variant text-center mt-2">
              Belum ada transaksi pengeluaran (seluruh kategori 0%). Persentase riil akan terbentuk saat transaksi dicatat.
            </p>
          )}
        </div>
      </section>

      {/* 3. Interactive Dual Spline Line Chart (Tren Komparasi Kumulatif) */}
      <section className="bg-surface-container rounded-2xl p-4 shadow-lg border border-white/5 flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-headline-sm text-sm font-bold text-on-surface">Tren Komparasi Kumulatif</span>
            <span className="font-body-sm text-[11px] text-on-surface-variant">
              {config.comparisonLabel}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-primary rounded-full shadow-[0_0_8px_#4EDE93]"></span>
              <span className="font-label-caps text-[10px] text-on-surface font-semibold">
                {activeSegment === 'month' ? 'Bulan Ini' : activeSegment === 'quarter' ? `Q${currentQuarter}` : `Tahun ${currentYear}`}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-3 h-0.5 rounded-full ${hasPrevData ? 'bg-outline' : 'bg-outline/40'}`}></span>
              <span className="font-label-caps text-[10px] text-on-surface-variant">
                {hasPrevData ? 'Lalu' : 'Bulan Pertama'}
              </span>
            </div>
          </div>
        </div>

        {/* Spline Canvas SVG with Glowing Dropshadow */}
        <div className="relative w-full h-44 mt-3">
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 320 150">
            <defs>
              <linearGradient id="areaGradientPrimary" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#4EDE93" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#4EDE93" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="strokeGradientPrimary" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#4CD7F6" />
                <stop offset="100%" stopColor="#4EDE93" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line opacity="0.3" stroke="#313540" strokeDasharray="3 3" x1="0" x2="320" y1="30" y2="30" />
            <line opacity="0.3" stroke="#313540" strokeDasharray="3 3" x1="0" x2="320" y1="75" y2="75" />
            <line opacity="0.3" stroke="#313540" strokeDasharray="3 3" x1="0" x2="320" y1="120" y2="120" />

            {/* Area under current period */}
            {currentAreaPath && (
              <path d={currentAreaPath} fill="url(#areaGradientPrimary)" />
            )}

            {/* Previous Period Dashed Line (Only rendered when previous period data exists) */}
            {hasPrevData && prevCurvePath && (
              <path
                d={prevCurvePath}
                fill="none"
                opacity="0.65"
                stroke="#86948A"
                strokeDasharray="5 4"
                strokeWidth="2"
              />
            )}

            {/* Current Period Glowing Emerald Spline (Dynamic Cumulative Line) */}
            <path
              className="drop-shadow-[0_2px_10px_rgba(78,222,163,0.7)] transition-all duration-500"
              d={currentCurvePath}
              fill="none"
              stroke="url(#strokeGradientPrimary)"
              strokeLinecap="round"
              strokeWidth="3.5"
            />

            {/* Projection / plateau line for remaining days in period */}
            {hasCurrentData && pinpointX < 305 && (
              <line
                opacity="0.35"
                stroke="#4EDE93"
                strokeDasharray="3 3"
                strokeWidth="1.5"
                x1={pinpointX}
                x2={305}
                y1={pinpointY}
                y2={pinpointY}
              />
            )}

            {/* Data Point: Current Focus */}
            <line opacity="0.7" stroke="#4EDE93" strokeDasharray="2 2" strokeWidth="1.5" x1={pinpointX} x2={pinpointX} y1="20" y2="145" />
            <circle cx={pinpointX} cy={pinpointY} fill="#0F131D" r="6" stroke="#4EDE93" strokeWidth="3" className="shadow-lg transition-all duration-300" />
            <circle cx={pinpointX} cy={pinpointY} fill="#FFFFFF" r="2.5" />
          </svg>

          {/* Pinpoint Overlay Annotation */}
          <div
            className="absolute top-1 transform -translate-x-1/2 bg-surface-container-highest/95 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 shadow-lg flex flex-col items-center pointer-events-none transition-all duration-300"
            style={{ left: `${Math.max(14, Math.min(86, (pinpointX / 320) * 100)).toFixed(1)}%` }}
          >
            <span className="font-label-caps text-[9px] text-on-surface-variant uppercase font-semibold whitespace-nowrap">
              {config.pinpointLabel}
            </span>
            <span className="font-num-data text-xs text-primary font-bold whitespace-nowrap">
              {config.pinpointValue}
            </span>
          </div>
        </div>

        {/* X-Axis Labels */}
        <div className="flex justify-between items-center mt-2 px-1 text-on-surface-variant font-label-caps text-[10px]">
          {config.xAxis.map((label, idx) => {
            const isActive = idx === config.activeXIndex;
            return (
              <span
                key={idx}
                className={isActive ? 'text-primary font-bold drop-shadow-[0_0_8px_#4edea3]' : ''}
              >
                {label}
              </span>
            );
          })}
        </div>

        {/* Empty state hint when no expense transactions exist yet */}
        {!hasCurrentData && (
          <div className="mt-3 flex items-start gap-2.5 p-3 rounded-xl bg-surface-container-low/90 border border-white/5 text-xs text-on-surface-variant animate-fadeIn">
            <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">query_stats</span>
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-on-surface text-[11px]">Belum Ada Pengeluaran di Periode Ini</span>
              <span className="text-[10px] leading-relaxed text-on-surface-variant">
                Grafik komparasi kumulatif menghitung total akumulasi pengeluaran Anda dari hari ke hari dibanding periode lalu. Karena ini akun baru / belum ada input pengeluaran, garis tren berada mendatar di Rp 0 dan akan naik secara otomatis setiap kali Anda mencatat pengeluaran.
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 4. Interactive Category Breakdown Cards (Dengan Limit / Batas Kategori) */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex flex-col">
            <span className="font-headline-sm text-sm font-bold text-on-surface">Rincian & Batas Kategori</span>
            <span className="font-body-sm text-[11px] text-on-surface-variant">
              Limit otomatis 50/30/20 • Klik ikon pensil untuk atur limit khusus
            </span>
          </div>
          <button
            onClick={() => setCategoryModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-xs text-primary border border-primary/20 shadow-sm transition-all shrink-0"
          >
            <span className="material-symbols-outlined text-[15px]">add</span>
            <span>Kategori</span>
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {categoryStats.map((item) => (
            <div
              key={item.id}
              onClick={() => handleOpenEditLimit(item, item.baseMonthlyLimit)}
              className="bg-surface-container rounded-2xl p-4 shadow-md border border-white/5 flex flex-col gap-2 transition-all hover:border-white/10 active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md"
                    style={{ backgroundColor: `${item.color}20`, color: item.color }}
                  >
                    <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-headline-sm text-xs font-bold text-on-surface truncate">{item.name}</span>
                      {item.isCustom ? (
                        <span className="px-1.5 py-0.2 rounded-md font-label-caps text-[9px] font-bold bg-primary/15 text-primary border border-primary/30 shrink-0">
                          Kustom
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded-md font-label-caps text-[9px] font-bold bg-surface-container-high text-on-surface-variant/80 border border-white/5 shrink-0">
                          Auto 50/30/20
                        </span>
                      )}
                    </div>
                    <span className="font-body-sm text-[11px] text-on-surface-variant">{item.subtext}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`px-2.5 py-0.5 rounded-full font-label-caps text-[10px] font-bold border ${item.statusColor}`}>
                    {item.status}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditLimit(item, item.baseMonthlyLimit);
                    }}
                    className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-primary flex items-center justify-center transition-all ml-0.5"
                    title="Ubah Limit Kategori"
                  >
                    <span className="material-symbols-outlined text-[15px]">edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCategoryToDelete(item);
                    }}
                    className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-error/20 text-on-surface-variant hover:text-error flex items-center justify-center transition-all"
                    title="Nonaktifkan Kategori"
                  >
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                  </button>
                </div>
              </div>

              {/* Ratio & Budget Values */}
              <div className="flex items-baseline justify-between mt-1">
                <span className="font-num-data text-xs text-on-surface font-bold tabular-nums">
                  {formatRupiah(item.spent)}
                </span>
                <span className="font-body-sm text-[11px] text-on-surface-variant">
                  Limit {formatRupiah(item.limit)} ({item.percentage}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden border border-white/5">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.color,
                    boxShadow: `0 0 8px ${item.color}`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Section Kategori Terhapus / Diarsipkan (Soft-deleted categories) */}
        {deletedCategories.length > 0 && (
          <div className="mt-2 flex flex-col gap-2 p-3.5 rounded-2xl bg-surface-container-low border border-white/5">
            <button
              type="button"
              onClick={() => setShowDeletedSection(!showDeletedSection)}
              className="flex items-center justify-between text-xs text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-tertiary">archive</span>
                <span className="font-semibold">Kategori Dinonaktifkan ({deletedCategories.length})</span>
              </div>
              <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${showDeletedSection ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            {showDeletedSection && (
              <div className="flex flex-col gap-2 pt-2 border-t border-white/5 animate-fadeIn">
                {deletedCategories.map((delCat) => (
                  <div
                    key={delCat.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container border border-white/5 opacity-80 hover:opacity-100 transition-opacity"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 grayscale opacity-70"
                        style={{ backgroundColor: `${delCat.color}20`, color: delCat.color }}
                      >
                        <span className="material-symbols-outlined text-[18px]">{delCat.icon}</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-headline-sm text-xs font-bold text-on-surface line-through decoration-white/40 truncate">
                          {delCat.name}
                        </span>
                        <span className="font-body-sm text-[10px] text-on-surface-variant">
                          {delCat.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'} • Dinonaktifkan
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => restoreCategory(delCat.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-primary/20 text-on-surface-variant hover:text-primary text-[11px] font-semibold border border-white/5 transition-all active:scale-95 shrink-0"
                      title="Pulihkan Kategori"
                    >
                      <span className="material-symbols-outlined text-[15px]">restore</span>
                      <span>Pulihkan</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 5. Modal Atur Limit Kategori */}
      {selectedCategoryToEdit && (() => {
        const currentCatGroup = (selectedCategoryToEdit.allocationGroup || 'needs') as 'needs' | 'wants' | 'savings';
        const catGroupCap = getGroupCap(currentCatGroup);
        const catMaxAllowed = getCategoryMaxAllowedLimit(selectedCategoryToEdit);
        const catOtherAllocated = Math.max(0, catGroupCap - catMaxAllowed);
        const currentEnteredVal = parseFloat(editLimitInput) || 0;
        const isExceedingCap = currentEnteredVal > catMaxAllowed;

        // Visual bar percentages
        const otherPct = Math.min(100, Math.round((catOtherAllocated / catGroupCap) * 100));
        const thisPct = Math.min(100 - otherPct, Math.round((Math.min(currentEnteredVal, catMaxAllowed) / catGroupCap) * 100));
        const overflowPct = isExceedingCap ? Math.min(100, Math.round(((currentEnteredVal - catMaxAllowed) / catGroupCap) * 100)) : 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div
              className="w-full max-w-sm bg-surface-container-low rounded-3xl border border-white/10 p-5 shadow-2xl flex flex-col gap-4 relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md"
                    style={{ backgroundColor: `${selectedCategoryToEdit.color}20`, color: selectedCategoryToEdit.color }}
                  >
                    <span className="material-symbols-outlined text-[20px]">{selectedCategoryToEdit.icon}</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h4 className="font-headline-sm text-sm font-bold text-on-surface truncate">
                      Atur Limit: {selectedCategoryToEdit.name}
                    </h4>
                    <span className="font-body-sm text-[11px] text-on-surface-variant">
                      {getSubtext(selectedCategoryToEdit)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCategoryToEdit(null)}
                  className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Card Batasan Alokasi Kantong 50/30/20 */}
              <div className="p-3.5 rounded-2xl bg-surface-container/70 border border-white/5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                    Kantong: {getGroupName(currentCatGroup)}
                  </span>
                  <span className="font-num-data font-bold text-on-surface">
                    Total: {formatRupiah(catGroupCap)}
                  </span>
                </div>

                {/* Segmented Constraint Progress Bar */}
                <div className="w-full h-3 rounded-full bg-surface-container-highest flex overflow-hidden p-0.5 gap-0.5 border border-white/5">
                  {otherPct > 0 && (
                    <div
                      className="h-full rounded-l-full bg-surface-container-high transition-all"
                      style={{ width: `${otherPct}%` }}
                      title={`Kategori Lain: ${formatRupiah(catOtherAllocated)}`}
                    />
                  )}
                  {thisPct > 0 && (
                    <div
                      className="h-full bg-primary shadow-[0_0_8px_#4EDE93] transition-all"
                      style={{ width: `${thisPct}%` }}
                      title={`Kategori Ini: ${formatRupiah(currentEnteredVal)}`}
                    />
                  )}
                  {overflowPct > 0 && (
                    <div
                      className="h-full bg-error animate-pulse shadow-[0_0_8px_#EF4444] transition-all"
                      style={{ width: `${overflowPct}%` }}
                      title="Melebihi Kapasitas Kantong!"
                    />
                  )}
                </div>

                <div className="flex justify-between items-center text-[10px] font-label-caps">
                  <span className="text-on-surface-variant/80">
                    Kategori lain: <strong className="text-on-surface">{formatRupiah(catOtherAllocated)}</strong>
                  </span>
                  <span className="text-primary font-bold">
                    Maks. Bisa Diatur: <strong>{formatRupiah(catMaxAllowed)}</strong>
                  </span>
                </div>
              </div>

              {/* Input Form */}
              <form onSubmit={handleSaveCategoryLimit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-on-surface-variant font-medium">
                      Batas Pengeluaran Bulanan (Rp)
                    </label>
                    <span className="text-[10px] text-on-surface-variant font-medium">
                      Maks. <strong className="text-primary">{formatRupiah(catMaxAllowed)}</strong>
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={catMaxAllowed}
                    step="any"
                    required
                    placeholder="Contoh: 1000000"
                    value={editLimitInput}
                    onChange={(e) => setEditLimitInput(e.target.value)}
                    className={`bg-surface-container px-3.5 py-2.5 rounded-xl text-xs text-on-surface border transition-colors font-num-data ${
                      isExceedingCap ? 'border-error focus:border-error' : 'border-white/10 focus:border-primary'
                    }`}
                  />
                  <div className="flex items-center justify-between text-[11px] font-num-data">
                    <span className={isExceedingCap ? 'text-error font-bold' : 'text-secondary font-medium'}>
                      {editLimitInput ? formatRupiah(currentEnteredVal) : 'Rp 0'}
                    </span>
                    {isExceedingCap && (
                      <span className="text-error text-[10px] font-bold">
                        Melebihi alokasi!
                      </span>
                    )}
                  </div>
                </div>

                {/* Warning Chip if exceeding */}
                {isExceedingCap && (
                  <div className="p-2.5 rounded-xl bg-error/15 border border-error/30 flex items-center justify-between gap-2 animate-fadeIn">
                    <div className="flex items-center gap-1.5 text-[11px] text-error font-medium">
                      <span className="material-symbols-outlined text-[15px] shrink-0">error</span>
                      <span>Maksimal yang tersedia di kantong ini adalah {formatRupiah(catMaxAllowed)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditLimitInput(catMaxAllowed.toString())}
                      className="px-2 py-0.5 rounded-lg bg-error text-on-error font-bold text-[10px] shrink-0 active:scale-95 transition-all"
                    >
                      Sesuaikan
                    </button>
                  </div>
                )}

                {/* Quick Preset Buttons */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-on-surface-variant uppercase font-semibold tracking-wider">
                    Opsi Cepat
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditLimitInput(catMaxAllowed.toString())}
                      className="py-1.5 px-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs text-primary border border-primary/20 flex items-center justify-center gap-1 font-medium transition-all"
                    >
                      <span className="material-symbols-outlined text-[15px]">vertical_align_top</span>
                      <span>Alokasikan Sisa ({formatRupiah(catMaxAllowed)})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditLimitInput(Math.min(catMaxAllowed, getDefaultLimitForCategory(selectedCategoryToEdit)).toString())}
                      className="py-1.5 px-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs text-on-surface-variant hover:text-on-surface border border-white/5 flex items-center justify-center gap-1 font-medium transition-all"
                    >
                      <span className="material-symbols-outlined text-[15px]">auto_fix_high</span>
                      <span>Otomatis Sisa</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 mt-0.5">
                    {[100000, 250000, 500000, 1000000].map((delta) => (
                      <button
                        key={delta}
                        type="button"
                        disabled={currentEnteredVal + delta > catMaxAllowed}
                        onClick={() => {
                          const nextVal = Math.min(catMaxAllowed, currentEnteredVal + delta);
                          setEditLimitInput(nextVal.toString());
                        }}
                        className="py-1.5 px-1 rounded-xl bg-surface-container hover:bg-surface-container-high text-[10px] text-on-surface-variant font-medium text-center border border-white/5 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
                      >
                        +{delta >= 1000000 ? `${delta / 1000000}jt` : `${delta / 1000}rb`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryToEdit(null)}
                    className="flex-1 py-2.5 rounded-xl bg-surface-container text-xs text-on-surface-variant font-bold hover:bg-surface-container-high transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingLimit || isExceedingCap}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md shadow-primary/25 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSavingLimit ? 'Menyimpan...' : 'Simpan Limit'}
                  </button>
                </div>

                {/* Danger Zone: Soft Delete button inside modal */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-on-surface-variant/70">Ingin sembunyikan kategori ini?</span>
                  <button
                    type="button"
                    onClick={() => {
                      const toDelete = selectedCategoryToEdit;
                      setSelectedCategoryToEdit(null);
                      setCategoryToDelete(toDelete);
                    }}
                    className="flex items-center gap-1 text-[11px] text-error hover:underline transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                    <span>Nonaktifkan Kategori</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* 6. Modal Konfirmasi Soft Delete Kategori */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div
            className="w-full max-w-sm bg-surface-container-low rounded-3xl border border-white/10 p-5 shadow-2xl flex flex-col gap-4 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-error/15 text-error flex items-center justify-center shrink-0 border border-error/20">
                <span className="material-symbols-outlined text-[24px]">delete</span>
              </div>
              <div className="flex flex-col min-w-0">
                <h4 className="font-headline-sm text-base font-bold text-on-surface">
                  Nonaktifkan Kategori?
                </h4>
                <span className="font-body-sm text-xs text-on-surface-variant truncate">
                  {categoryToDelete.name}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-container/70 border border-white/5 text-xs text-on-surface-variant leading-relaxed">
              <p>
                Kategori ini akan di-<strong className="text-on-surface font-semibold">soft delete</strong> (disembunyikan dari anggaran aktif dan pencatatan baru).
              </p>
              <div className="mt-2.5 flex items-start gap-1.5 text-primary text-[11px] font-medium bg-primary/10 p-2 rounded-xl border border-primary/20">
                <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">verified_user</span>
                <span>Seluruh riwayat transaksi masa lalu tetap 100% aman tersimpan dan Anda dapat memulihkannya kapan saja.</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-surface-container text-xs text-on-surface-variant font-bold hover:bg-surface-container-high transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingCategory}
                onClick={async () => {
                  setIsDeletingCategory(true);
                  try {
                    await deleteCategory(categoryToDelete.id);
                    setCategoryToDelete(null);
                  } finally {
                    setIsDeletingCategory(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-error text-on-error text-xs font-bold shadow-md shadow-error/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                {isDeletingCategory ? 'Menghapus...' : 'Ya, Nonaktifkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
