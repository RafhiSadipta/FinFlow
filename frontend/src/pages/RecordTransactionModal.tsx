import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useFinFlowStore } from '../store/useFinFlowStore';
import { NumericKeypad } from '../components/NumericKeypad';
import { CustomDropdown } from '../components/CustomDropdown';
import { formatRupiah, numberToWordsID } from '../utils/formatters';
import type { TransactionType } from '../types';

export const RecordTransactionModal: React.FC = () => {
  const {
    isRecordModalOpen,
    recordModalInitialType,
    setRecordModalOpen,
    wallets,
    categories,
    savingsGoals,
    addTransaction,
    updateSavingsGoalProgress,
    setCategoryModalOpen,
    showToast,
    user,
  } = useFinFlowStore();

  const [type, setType] = useState<TransactionType>(recordModalInitialType || 'expense');
  const [amountStr, setAmountStr] = useState<string>('0');
  const [selectedWalletId, setSelectedWalletId] = useState<string>(wallets[0]?.id || '');
  const [selectedDestWalletId, setSelectedDestWalletId] = useState<string>(wallets[1]?.id || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || '');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync type & valid wallet selections when modal opens
  useEffect(() => {
    if (isRecordModalOpen) {
      setType(recordModalInitialType || 'expense');
      setSelectedGoalId('');
      if (wallets.length > 0 && (!selectedWalletId || !wallets.some((w) => w.id === selectedWalletId))) {
        setSelectedWalletId(wallets[0].id);
      }
      if (wallets.length > 1 && (!selectedDestWalletId || !wallets.some((w) => w.id === selectedDestWalletId))) {
        setSelectedDestWalletId(wallets[1].id);
      }
    }
  }, [isRecordModalOpen, recordModalInitialType, wallets]);

  // Auto-select savings category when goal is selected
  useEffect(() => {
    if (selectedGoalId) {
      const savingsCat = categories.find(
        (c) =>
          c.allocationGroup === 'savings' ||
          c.name.toLowerCase().includes('tabungan') ||
          c.name.toLowerCase().includes('investasi')
      );
      if (savingsCat) {
        setSelectedCategoryId(savingsCat.id);
      }
    }
  }, [selectedGoalId, categories]);

  // Keep category valid when type or categories change
  useEffect(() => {
    if (isRecordModalOpen) {
      const available = categories.filter((c) => type === 'transfer' || c.type === type);
      if (available.length > 0 && (!selectedCategoryId || !available.some((c) => c.id === selectedCategoryId))) {
        setSelectedCategoryId(available[0].id);
      }
    }
  }, [isRecordModalOpen, type, categories]);

  if (!isRecordModalOpen) return null;

  const currentAmount = parseInt(amountStr, 10) || 0;

  const handleDigitPress = (digit: string) => {
    if (amountStr === '0') {
      if (digit === '000' || digit === '0') return;
      setAmountStr(digit);
    } else {
      if (amountStr.length >= 11) return;
      setAmountStr(amountStr + digit);
    }
  };

  const handleDeletePress = () => {
    if (amountStr.length <= 1) {
      setAmountStr('0');
    } else {
      setAmountStr(amountStr.slice(0, -1));
    }
  };

  const handleClear = () => {
    setAmountStr('0');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentAmount <= 0) {
      showToast({
        type: 'error',
        title: 'Gagal Mencatat Transaksi',
        message: 'Nominal transaksi harus lebih dari Rp 0.',
      });
      return;
    }

    if (!selectedWalletId) {
      showToast({
        type: 'error',
        title: 'Gagal Mencatat Transaksi',
        message: 'Pilih dompet/rekening terlebih dahulu.',
      });
      return;
    }

    const sourceWallet = wallets.find((w) => w.id === selectedWalletId);
    const destWallet = wallets.find((w) => w.id === selectedDestWalletId);
    const targetGoal = selectedGoalId ? savingsGoals.find((g) => g.id === selectedGoalId) : null;
    const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

    setIsSubmitting(true);
    try {
      const isTransfer = type === 'transfer';
      const effectiveCategory = isTransfer && selectedGoalId
        ? (categories.find(c => c.allocationGroup === 'savings' || c.name.toLowerCase().includes('tabungan') || c.name.toLowerCase().includes('investasi'))?.id || selectedCategoryId)
        : selectedCategoryId;

      const txNotes = notes.trim()
        ? notes.trim()
        : isTransfer && targetGoal
        ? `Transfer Tabungan: ${targetGoal.name}`
        : undefined;

      await addTransaction({
        userId: user?.id || '',
        walletId: selectedWalletId,
        destinationWalletId: isTransfer ? selectedDestWalletId : undefined,
        categoryId: effectiveCategory,
        type,
        amount: currentAmount,
        transactionDate: new Date().toISOString(),
        notes: txNotes,
      });

      if (selectedGoalId) {
        await updateSavingsGoalProgress(selectedGoalId, currentAmount);
      }

      let successTitle = 'Pengeluaran Berhasil Dicatat!';
      let successMessage = `${formatRupiah(currentAmount)} • ${selectedCategory?.name || 'Umum'} (${sourceWallet?.name || 'Dompet'})`;

      if (type === 'income') {
        successTitle = 'Pemasukan Berhasil Ditambahkan!';
        successMessage = `+${formatRupiah(currentAmount)} masuk ke ${sourceWallet?.name || 'Dompet'}`;
        try {
          confetti({
            particleCount: 45,
            spread: 60,
            origin: { y: 0.65 },
            colors: ['#4EDE93', '#4CD7F6', '#6FFBBE'],
          });
        } catch {
          // Ignore confetti error
        }
      } else if (type === 'transfer') {
        if (targetGoal) {
          successTitle = 'Transfer & Setoran Target Berhasil!';
          successMessage = `${formatRupiah(currentAmount)} dipindah ke ${destWallet?.name || 'Tujuan'} & disetor ke "${targetGoal.name}"!`;
          try {
            confetti({
              particleCount: 65,
              spread: 70,
              origin: { y: 0.65 },
              colors: ['#4EDE93', '#4CD7F6', '#FFD700'],
            });
          } catch {
            // Ignore confetti error
          }
        } else {
          successTitle = 'Transfer Dompet Berhasil!';
          successMessage = `${formatRupiah(currentAmount)} dari ${sourceWallet?.name || 'Sumber'} ke ${destWallet?.name || 'Tujuan'}`;
        }
      }

      showToast({
        type: 'success',
        title: successTitle,
        message: successMessage,
      });

      setAmountStr('0');
      setNotes('');
    } catch {
      // Error handled by store
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCategories = categories.filter(
    (c) => type === 'transfer' || c.type === type
  );

  const walletOptions = wallets.map((w) => ({
    value: w.id,
    label: w.name,
    sublabel: formatRupiah(w.balance),
    icon: w.icon || 'account_balance_wallet',
    iconColor: w.color || '#4EDE93',
  }));

  const sourceWalletOptions = wallets.map((w) => ({
    value: w.id,
    label: w.name,
    sublabel: formatRupiah(w.balance),
    icon: w.icon || 'account_balance_wallet',
    iconColor: w.color || '#4EDE93',
  }));

  const destWalletOptions = wallets
    .filter((w) => w.id !== selectedWalletId)
    .map((w) => ({
      value: w.id,
      label: w.name,
      sublabel: formatRupiah(w.balance),
      icon: w.icon || 'account_balance_wallet',
      iconColor: w.color || '#4CD7F6',
    }));

  const goalOptions = [
    { value: '', label: '-- Tanpa Target (Transfer Biasa) --', icon: 'remove' },
    ...savingsGoals.map((g) => {
      const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
      return {
        value: g.id,
        label: g.name,
        sublabel: `Terkumpul ${formatRupiah(g.currentAmount)} / ${formatRupiah(g.targetAmount)}`,
        badge: `${pct}%`,
        badgeColor: g.color || '#4EDE93',
        icon: g.icon || 'flag',
        iconColor: g.color || '#4EDE93',
      };
    }),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-md bg-surface-container-low rounded-t-3xl sm:rounded-3xl border border-white/10 p-4 shadow-2xl flex flex-col gap-3 max-h-[96vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="shrink-0 flex items-center justify-between pb-1 border-b border-white/5">
          <button
            type="button"
            onClick={() => setRecordModalOpen(false)}
            className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
            <span>Batal</span>
          </button>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full animate-pulse ${
              type === 'income' ? 'bg-primary shadow-[0_0_8px_#4EDE93]' : type === 'transfer' ? 'bg-secondary shadow-[0_0_8px_#4CD7F6]' : 'bg-error shadow-[0_0_8px_#FFB4AB]'
            }`} />
            <span className="font-headline-sm text-sm font-bold text-on-surface">
              {type === 'expense' ? 'Catat Pengeluaran' : type === 'income' ? 'Catat Pemasukan' : 'Transfer Antar Dompet'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-on-surface-variant hover:text-error font-medium"
          >
            Reset
          </button>
        </div>

        {/* 1. Transaction Type Segmented Switch */}
        <div className="shrink-0 p-1 bg-surface-container-lowest rounded-xl flex items-center gap-1 border border-white/5 shadow-inner">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
              type === 'expense'
                ? 'bg-error-container/35 text-error border border-error/30 shadow-[0_0_10px_rgba(255,180,171,0.25)]'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">arrow_outward</span>
            <span>Pengeluaran</span>
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
              type === 'income'
                ? 'bg-primary-container/35 text-primary border border-primary/30 shadow-[0_0_10px_rgba(78,222,163,0.25)]'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">arrow_downward</span>
            <span>Pemasukan</span>
          </button>
          <button
            type="button"
            onClick={() => setType('transfer')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
              type === 'transfer'
                ? 'bg-secondary-container/35 text-secondary border border-secondary/30 shadow-[0_0_10px_rgba(76,215,246,0.25)]'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">sync_alt</span>
            <span>Transfer</span>
          </button>
        </div>

        {/* 2. HERO NOMINAL DISPLAY CARD (SELALU TAMPIL JELAS DI SEMUA MODE: PENGELUARAN, PEMASUKAN, TRANSFER) */}
        <div className="shrink-0 p-4 rounded-2xl bg-surface-container relative overflow-hidden border border-white/10 shadow-lg min-h-[96px] flex flex-col justify-between">
          {/* Ambient Glow */}
          <div
            className={`absolute -right-8 -top-8 w-36 h-36 rounded-full blur-2xl pointer-events-none transition-colors duration-300 ${
              type === 'income' ? 'bg-primary/25' : type === 'transfer' ? 'bg-secondary/25' : 'bg-error/25'
            }`}
          />
          <div className="flex items-center justify-between text-on-surface-variant mb-1 relative z-10">
            <span className="font-label-caps text-[11px] uppercase tracking-wider font-semibold">
              Nominal Transaksi ({type === 'expense' ? 'Pengeluaran' : type === 'income' ? 'Pemasukan' : 'Transfer'})
            </span>
            <span className="text-[10px] bg-surface-container-high px-2 py-0.5 rounded-full font-medium text-on-surface-variant/90 border border-white/5">
              IDR (Rupiah)
            </span>
          </div>
          <div className="flex items-center justify-between py-1 relative z-10">
            <div className="flex items-baseline gap-2 flex-1 min-w-0">
              <span
                className={`font-headline-md text-2xl font-bold shrink-0 ${
                  type === 'income' ? 'text-primary' : type === 'transfer' ? 'text-secondary' : 'text-error'
                }`}
              >
                Rp
              </span>
              <div className="flex items-baseline overflow-x-auto no-scrollbar">
                <span className="font-headline-lg text-3xl sm:text-4xl font-extrabold text-on-surface tracking-tight tabular-nums">
                  {currentAmount === 0 ? '0' : formatRupiah(currentAmount, false)}
                </span>
                <span
                  className={`w-0.5 h-7 rounded-full ml-1.5 animate-pulse shrink-0 ${
                    type === 'income' ? 'bg-primary' : type === 'transfer' ? 'bg-secondary' : 'bg-error'
                  }`}
                />
              </div>
            </div>
            {currentAmount > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="text-on-surface-variant hover:text-on-surface p-1 active:scale-90 transition-transform shrink-0 ml-2"
                title="Hapus nominal"
              >
                <span className="material-symbols-outlined text-[20px]">cancel</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 relative z-10">
            <span className="text-xs text-on-surface-variant">Terbilang:</span>
            <span className="text-xs text-primary-fixed-dim font-medium italic truncate">
              {numberToWordsID(currentAmount)}
            </span>
          </div>
        </div>

        {/* 3. Dompet & Rekening Selector */}
        {type !== 'transfer' ? (
          <div className="shrink-0 flex items-center gap-2">
            <CustomDropdown
              label={type === 'income' ? 'Masuk ke Rekening/Dompet:' : 'Sumber Dana Rekening/Dompet:'}
              options={walletOptions}
              value={selectedWalletId}
              onChange={setSelectedWalletId}
              variant="primary"
            />
          </div>
        ) : (
          <div className="shrink-0 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <CustomDropdown
                label="Dari Dompet (Sumber):"
                options={sourceWalletOptions}
                value={selectedWalletId}
                onChange={setSelectedWalletId}
                variant="secondary"
              />

              <CustomDropdown
                label="Ke Dompet (Tujuan):"
                options={destWalletOptions}
                value={selectedDestWalletId}
                onChange={setSelectedDestWalletId}
                variant="secondary"
              />
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary text-[11px]">
              <span className="material-symbols-outlined text-[16px]">info</span>
              <span>Pindah saldo antar rekening (Net Worth tetap aman).</span>
            </div>

            {/* Tautkan ke Target Tabungan / Goal (Opsional) */}
            {savingsGoals.length > 0 && (
              <div className="flex flex-col gap-1 pt-0.5">
                <CustomDropdown
                  label="🎯 Tautkan ke Target Tabungan (Opsional):"
                  options={goalOptions}
                  value={selectedGoalId}
                  onChange={setSelectedGoalId}
                  variant="primary"
                />
              </div>
            )}
          </div>
        )}

        {/* 4. Category Selector (Horizontal Scrollable Chips Compact agar Hero Nominal selalu kelihatan) */}
        <div className="shrink-0 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">
              {type === 'expense'
                ? 'Kategori Pengeluaran'
                : type === 'income'
                ? 'Kategori Pemasukan'
                : 'Kategori / Pos Transfer'}
            </span>
            <button
              type="button"
              onClick={() => setCategoryModalOpen(true)}
              className="text-[11px] text-secondary font-medium hover:underline flex items-center gap-0.5"
            >
              <span>+ Buat Kategori</span>
              <span className="material-symbols-outlined text-[13px]">tune</span>
            </button>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {filteredCategories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                    isSelected
                      ? 'bg-surface-container-high border border-primary text-primary shadow-[0_0_8px_rgba(78,222,163,0.35)] scale-102'
                      : 'bg-surface-container text-on-surface-variant border border-white/5 hover:bg-surface-container-high'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]" style={{ color: cat.color }}>
                    {cat.icon}
                  </span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Catatan / Notes */}
        <div className="shrink-0 flex flex-col gap-1">
          <input
            type="text"
            placeholder={type === 'transfer' ? 'Catatan transfer (opsional)...' : 'Catatan transaksi (opsional)...'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-surface-container px-3 py-2 rounded-xl text-xs text-on-surface border border-white/10 focus:outline-none focus:border-primary placeholder:text-on-surface-variant/50"
          />
        </div>

        {/* 6. Custom Numeric Keypad */}
        <NumericKeypad
          onDigitPress={handleDigitPress}
          onDeletePress={handleDeletePress}
          onClearPress={handleClear}
        />

        {/* 7. Action Button */}
        <button
          type="button"
          disabled={currentAmount <= 0 || isSubmitting}
          onClick={handleSubmit}
          className={`shrink-0 w-full py-3.5 rounded-xl font-bold text-sm shadow-lg transition-all ${
            currentAmount > 0 && !isSubmitting
              ? 'bg-gradient-to-r from-primary to-secondary text-surface-container-lowest shadow-primary/30 hover:opacity-95 active:scale-98 cursor-pointer'
              : 'bg-surface-container text-on-surface-variant/40 cursor-not-allowed'
          }`}
        >
          {isSubmitting
            ? 'Menyimpan ke Server...'
            : type === 'expense'
            ? `Simpan Pengeluaran (${formatRupiah(currentAmount)})`
            : type === 'income'
            ? `Simpan Pemasukan (${formatRupiah(currentAmount)})`
            : `Kirim / Transfer (${formatRupiah(currentAmount)})`}
        </button>
      </div>
    </div>
  );
};
