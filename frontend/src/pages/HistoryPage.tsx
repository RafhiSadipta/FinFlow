import React, { useState } from 'react';
import { useFinFlowStore } from '../store/useFinFlowStore';
import { formatRupiah, formatDate } from '../utils/formatters';
import { exportTransactionsToCSV, exportTransactionsToPrintPDF } from '../utils/exportUtils';

export const HistoryPage: React.FC = () => {
  const {
    user,
    transactions,
    wallets,
    categories,
    searchQuery,
    setSearchQuery,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    selectedHistoryType,
    setSelectedHistoryType,
    historyFilter,
    setDateFilterModalOpen,
    deleteTransaction,
    showToast,
  } = useFinFlowStore();

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Summary calculations
  const totalInflow = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutflow = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netFlow = totalInflow - totalOutflow;

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    // History type (Semua, Pengeluaran, Pemasukan)
    if (selectedHistoryType !== 'all') {
      if (selectedHistoryType === 'expense' && tx.type !== 'expense') return false;
      if (selectedHistoryType === 'income' && tx.type !== 'income') return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const notesMatch = tx.notes?.toLowerCase().includes(q);
      const catMatch = categories.find((c) => c.id === tx.categoryId)?.name.toLowerCase().includes(q);
      const walletMatch = wallets.find((w) => w.id === tx.walletId)?.name.toLowerCase().includes(q);
      if (!notesMatch && !catMatch && !walletMatch) return false;
    }

    // Category filter
    if (selectedCategoryFilter && tx.categoryId !== selectedCategoryFilter) {
      return false;
    }

    // Date filter
    if (historyFilter.startDate) {
      if (new Date(tx.transactionDate) < new Date(historyFilter.startDate)) return false;
    }
    if (historyFilter.endDate) {
      if (new Date(tx.transactionDate) > new Date(historyFilter.endDate)) return false;
    }

    return true;
  });

  // Group transactions by date
  const groupedTransactions: { [dateKey: string]: typeof transactions } = {};
  filteredTransactions.forEach((tx) => {
    const dateKey = new Date(tx.transactionDate).toISOString().split('T')[0];
    if (!groupedTransactions[dateKey]) {
      groupedTransactions[dateKey] = [];
    }
    groupedTransactions[dateKey].push(tx);
  });

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => (a < b ? 1 : -1));

  return (
    <div className="flex flex-col w-full px-4 pb-28 gap-4 max-w-md mx-auto animate-fadeIn">
      {/* 1. Search & Filter Bar */}
      <div className="flex items-center gap-2 pt-1">
        <div className="flex-1 flex items-center bg-surface-container-low px-3.5 py-2.5 rounded-2xl border border-white/5 shadow-inner focus-within:bg-surface-container transition-all">
          <span className="material-symbols-outlined text-outline text-[20px] shrink-0 mr-2">search</span>
          <input
            type="text"
            placeholder="Cari transaksi, merchant, nominal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-0 outline-none w-full text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-on-surface-variant hover:text-on-surface p-0.5">
              <span className="material-symbols-outlined text-[16px]">cancel</span>
            </button>
          )}
        </div>
        <button
          onClick={() => setDateFilterModalOpen(true)}
          className="h-11 w-11 rounded-2xl bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center relative transition-all active:scale-95 border border-white/5 shadow-sm"
          title="Filter Tanggal Kalender"
        >
          <span className="material-symbols-outlined text-[20px]">tune</span>
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-secondary shadow-[0_0_6px_#4CD7F6]"></span>
        </button>
      </div>

      {/* 2. Scrollable Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <button
          onClick={() => setSelectedHistoryType('all')}
          className={`px-3.5 py-1.5 rounded-full font-label-caps text-xs whitespace-nowrap shadow-sm transition-all active:scale-95 font-semibold ${
            selectedHistoryType === 'all'
              ? 'bg-primary text-on-primary shadow-[0_0_10px_rgba(78,222,163,0.3)]'
              : 'bg-surface-container-low text-on-surface-variant border border-white/5 hover:bg-surface-container'
          }`}
        >
          Semua
        </button>
        <button
          onClick={() => setSelectedHistoryType('expense')}
          className={`px-3.5 py-1.5 rounded-full font-label-caps text-xs whitespace-nowrap shadow-sm transition-all active:scale-95 font-semibold ${
            selectedHistoryType === 'expense'
              ? 'bg-error text-on-error shadow-[0_0_10px_rgba(255,180,171,0.3)]'
              : 'bg-surface-container-low text-on-surface-variant border border-white/5 hover:bg-surface-container'
          }`}
        >
          Pengeluaran
        </button>
        <button
          onClick={() => setSelectedHistoryType('income')}
          className={`px-3.5 py-1.5 rounded-full font-label-caps text-xs whitespace-nowrap shadow-sm transition-all active:scale-95 font-semibold ${
            selectedHistoryType === 'income'
              ? 'bg-primary text-on-primary shadow-[0_0_10px_rgba(78,222,163,0.3)]'
              : 'bg-surface-container-low text-on-surface-variant border border-white/5 hover:bg-surface-container'
          }`}
        >
          Pemasukan
        </button>
        {categories.slice(0, 4).map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === cat.id ? null : cat.id)}
            className={`px-3 py-1.5 rounded-full font-label-caps text-xs whitespace-nowrap shadow-sm transition-all flex items-center gap-1.5 ${
              selectedCategoryFilter === cat.id
                ? 'bg-secondary text-on-secondary font-bold shadow-[0_0_10px_rgba(76,215,246,0.3)]'
                : 'bg-surface-container-low text-on-surface-variant border border-white/5 hover:bg-surface-container'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }}></span>
            <span>{cat.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* 3. Period Cashflow Summary Card (Ringkasan Arus Kas) */}
      <div className="w-full bg-surface-container-low rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/5 relative overflow-hidden">
        {/* Glow Aura */}
        <div className="absolute -right-10 -top-10 w-36 h-36 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-2">
            <span className="font-label-caps text-[10px] uppercase text-on-surface-variant tracking-wider font-bold">
              Ringkasan Arus Kas
            </span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container font-label-caps text-[10px] text-secondary font-semibold">
              {new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
            </span>
          </div>
          {transactions.length === 0 ? (
            <div className="flex items-center gap-1 text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full border border-white/5">
              <span className="font-label-caps text-[10px] font-bold">0 Transaksi</span>
            </div>
          ) : netFlow > 0 ? (
            <div className="flex items-center gap-1 text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
              <span className="material-symbols-outlined text-[13px]">trending_up</span>
              <span className="font-label-caps text-[10px] font-bold uppercase tracking-wider">Surplus</span>
            </div>
          ) : netFlow < 0 ? (
            <div className="flex items-center gap-1 text-error bg-error/10 px-2 py-0.5 rounded-full border border-error/20">
              <span className="material-symbols-outlined text-[13px]">trending_down</span>
              <span className="font-label-caps text-[10px] font-bold uppercase tracking-wider">Defisit</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-secondary bg-secondary/10 px-2 py-0.5 rounded-full border border-secondary/20">
              <span className="material-symbols-outlined text-[13px]">remove</span>
              <span className="font-label-caps text-[10px] font-bold uppercase tracking-wider">Seimbang</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-3 relative z-10">
          {/* Pemasukan */}
          <div className="bg-surface-container/70 rounded-xl p-3 flex flex-col justify-between border border-white/5 shadow-inner">
            <div className="flex items-center gap-1.5 text-primary mb-1">
              <span className="material-symbols-outlined text-[16px]">arrow_downward_alt</span>
              <span className="font-body-sm text-xs text-on-surface-variant">Pemasukan</span>
            </div>
            <span className="font-num-data text-base text-primary font-bold tracking-tight tabular-nums">
              +{formatRupiah(totalInflow)}
            </span>
          </div>

          {/* Pengeluaran */}
          <div className="bg-surface-container/70 rounded-xl p-3 flex flex-col justify-between border border-white/5 shadow-inner">
            <div className="flex items-center gap-1.5 text-error mb-1">
              <span className="material-symbols-outlined text-[16px]">arrow_upward_alt</span>
              <span className="font-body-sm text-xs text-on-surface-variant">Pengeluaran</span>
            </div>
            <span className="font-num-data text-base text-error font-bold tracking-tight tabular-nums">
              -{formatRupiah(totalOutflow)}
            </span>
          </div>
        </div>

        {/* Net Flow Indicator Line */}
        <div className="pt-2 flex items-center justify-between relative z-10 border-t border-white/5">
          <span className="font-body-sm text-xs text-on-surface-variant">Arus Kas Bersih (Net)</span>
          <span className={`font-num-data text-sm font-extrabold tabular-nums ${
            netFlow >= 0 ? 'text-secondary drop-shadow-[0_0_8px_rgba(76,215,246,0.3)]' : 'text-error'
          }`}>
            {netFlow >= 0 ? '+' : ''}{formatRupiah(netFlow)}
          </span>
        </div>
      </div>

      {/* 4. Section Heading & Export Trigger */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <span className="font-headline-sm text-sm font-bold text-on-surface">Catatan Transaksi</span>
          <span className="w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center font-label-caps text-[10px] text-on-surface-variant font-bold">
            {filteredTransactions.length}
          </span>
        </div>
        <button
          onClick={() => {
            if (filteredTransactions.length === 0) {
              showToast({
                type: 'info',
                title: 'Belum Ada Transaksi',
                message: 'Tidak ada transaksi yang dapat diekspor pada filter saat ini.',
              });
              return;
            }
            setIsExportModalOpen(true);
          }}
          className="flex items-center gap-1 text-secondary text-xs font-semibold hover:underline py-1"
        >
          <span className="material-symbols-outlined text-[16px]">file_download</span>
          <span>Ekspor</span>
        </button>
      </div>

      {/* 5. Grouped Transaction List */}
      {sortedDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[28px]">receipt_long</span>
          </div>
          <p className="font-headline-sm text-xs font-semibold text-on-surface">Tidak ada transaksi ditemukan</p>
          <p className="text-[11px] text-on-surface-variant">Coba ubah kata kunci atau reset filter.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sortedDates.map((dateKey) => {
            const dayTxList = groupedTransactions[dateKey];
            const dayInflow = dayTxList.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            const dayOutflow = dayTxList.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

            return (
              <div key={dateKey} className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <span className="font-label-caps text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">
                    {formatDate(dateKey, 'full')}
                  </span>
                  <div className="flex items-center gap-2 text-[10px] font-bold tabular-nums">
                    {dayInflow > 0 && <span className="text-primary">+{formatRupiah(dayInflow)}</span>}
                    {dayOutflow > 0 && <span className="text-error">-{formatRupiah(dayOutflow)}</span>}
                  </div>
                </div>

                <div className="flex flex-col gap-2 bg-surface-container-low rounded-2xl border border-white/5 p-2 shadow-sm">
                  {dayTxList.map((tx) => {
                    const isIncome = tx.type === 'income';
                    const isTransfer = tx.type === 'transfer';
                    const cat = categories.find((c) => c.id === tx.categoryId);
                    const wallet = wallets.find((w) => w.id === tx.walletId);
                    const destWallet = wallets.find((w) => w.id === tx.destinationWalletId);

                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-container/60 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                              isIncome
                                ? 'bg-primary/15 text-primary shadow-[0_0_8px_rgba(78,222,163,0.3)]'
                                : isTransfer
                                ? 'bg-secondary/15 text-secondary shadow-[0_0_8px_rgba(76,215,246,0.3)]'
                                : 'bg-error/15 text-error'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              {cat?.icon || (isTransfer ? 'sync_alt' : 'payments')}
                            </span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-headline-sm text-xs font-semibold text-on-surface truncate">
                              {tx.notes || cat?.name || (isTransfer ? 'Transfer Antar Dompet' : 'Transaksi')}
                            </span>
                            <span className="text-[11px] text-on-surface-variant truncate">
                              {wallet?.name || 'Dompet'} {isTransfer && destWallet ? `➔ ${destWallet.name}` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`font-num-data text-xs font-bold tabular-nums ${
                              isIncome ? 'text-primary' : isTransfer ? 'text-secondary' : 'text-error'
                            }`}
                          >
                            {isIncome ? '+' : isTransfer ? '' : '-'}{formatRupiah(tx.amount)}
                          </span>

                          <button
                            onClick={() => {
                              deleteTransaction(tx.id);
                              showToast({
                                type: 'info',
                                title: 'Transaksi Dihapus',
                                message: `Transaksi ${formatRupiah(tx.amount)} telah dihapus.`,
                              });
                            }}
                            className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error p-1 transition-opacity"
                            title="Hapus Transaksi"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Pilihan Ekspor Laporan Transaksi */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-surface-container-low rounded-3xl border border-white/10 p-5 shadow-2xl flex flex-col gap-4 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-secondary/20 text-secondary flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[20px]">file_download</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-sm font-bold text-on-surface">Ekspor Laporan Transaksi</h3>
                  <p className="text-[10px] text-on-surface-variant">
                    {filteredTransactions.length} transaksi terpilih sesuai filter
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Ringkasan Data yang Akan Diekspor */}
            <div className="p-3 rounded-xl bg-surface-container/70 border border-white/5 flex flex-col gap-1.5 text-xs">
              <div className="flex items-center justify-between text-on-surface-variant text-[11px]">
                <span>Periode Filter:</span>
                <span className="font-semibold text-on-surface font-num-data">
                  {historyFilter.preset === 'today'
                    ? 'Hari Ini'
                    : historyFilter.preset === 'this_week'
                    ? 'Minggu Ini'
                    : historyFilter.preset === 'this_month'
                    ? 'Bulan Ini'
                    : historyFilter.preset === 'last_month'
                    ? 'Bulan Lalu'
                    : historyFilter.preset === 'custom'
                    ? 'Rentang Kustom'
                    : 'Semua Riwayat'}
                </span>
              </div>
              <div className="flex items-center justify-between text-on-surface-variant text-[11px]">
                <span>Total Pemasukan:</span>
                <span className="font-semibold text-primary font-num-data">+{formatRupiah(totalInflow)}</span>
              </div>
              <div className="flex items-center justify-between text-on-surface-variant text-[11px]">
                <span>Total Pengeluaran:</span>
                <span className="font-semibold text-error font-num-data">-{formatRupiah(totalOutflow)}</span>
              </div>
            </div>

            {/* Opsi Format Ekspor */}
            <div className="flex flex-col gap-2.5">
              {/* 1. Format CSV / Excel */}
              <button
                type="button"
                onClick={() => {
                  const ok = exportTransactionsToCSV(filteredTransactions, categories, wallets);
                  if (ok) {
                    showToast({
                      type: 'success',
                      title: 'Laporan CSV Berhasil Diunduh',
                      message: `${filteredTransactions.length} transaksi disimpan dalam file .csv (kompatibel Excel & Sheets).`,
                    });
                    setIsExportModalOpen(false);
                  }
                }}
                className="flex items-start gap-3 p-3 rounded-2xl bg-surface-container hover:bg-surface-container-high border border-white/5 hover:border-primary/30 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                  <span className="material-symbols-outlined text-[22px]">table_view</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-headline-sm text-xs font-bold text-on-surface">Unduh Spreadsheet CSV</span>
                    <span className="px-1.5 py-0.2 rounded font-label-caps text-[9px] uppercase font-bold bg-primary/20 text-primary">Excel</span>
                  </div>
                  <span className="text-[11px] text-on-surface-variant mt-0.5">
                    Format file .csv standar UTF-8 BOM, siap diolah dan dibuat rumus di Excel / Google Sheets.
                  </span>
                </div>
              </button>

              {/* 2. Format Cetak / Simpan PDF */}
              <button
                type="button"
                onClick={() => {
                  const periodTitle =
                    historyFilter.preset === 'today'
                      ? 'Hari Ini'
                      : historyFilter.preset === 'this_week'
                      ? 'Minggu Ini'
                      : historyFilter.preset === 'this_month'
                      ? 'Bulan Ini'
                      : historyFilter.preset === 'last_month'
                      ? 'Bulan Lalu'
                      : 'Semua Riwayat';

                  const ok = exportTransactionsToPrintPDF(
                    filteredTransactions,
                    categories,
                    wallets,
                    user?.fullName || 'Pengguna FinFlow',
                    periodTitle
                  );
                  if (ok) {
                    showToast({
                      type: 'info',
                      title: 'Membuka Jendela Cetak',
                      message: 'Silakan pilih printer atau opsi "Save as PDF".',
                    });
                    setIsExportModalOpen(false);
                  }
                }}
                className="flex items-start gap-3 p-3 rounded-2xl bg-surface-container hover:bg-surface-container-high border border-white/5 hover:border-secondary/30 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                  <span className="material-symbols-outlined text-[22px]">picture_as_pdf</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-headline-sm text-xs font-bold text-on-surface">Cetak Laporan / Simpan PDF</span>
                    <span className="px-1.5 py-0.2 rounded font-label-caps text-[9px] uppercase font-bold bg-secondary/20 text-secondary">PDF</span>
                  </div>
                  <span className="text-[11px] text-on-surface-variant mt-0.5">
                    Buka tata letak formal A4 siap cetak dengan ringkasan keuangan dan tabel transaksi rapi.
                  </span>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsExportModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-surface-container text-on-surface-variant font-semibold text-xs hover:text-on-surface"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
