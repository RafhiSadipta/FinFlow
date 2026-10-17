import type { Transaction, Category, Wallet } from '../types';
import { formatRupiah, formatDate } from './formatters';

export const exportTransactionsToCSV = (
  transactions: Transaction[],
  categories: Category[],
  wallets: Wallet[],
  filenamePrefix = 'FinFlow_Laporan_Transaksi'
): boolean => {
  if (transactions.length === 0) return false;

  const headers = [
    'ID Transaksi',
    'Tanggal',
    'Waktu',
    'Tipe',
    'Kategori',
    'Kantong Alokasi',
    'Dompet / Rekening',
    'Tujuan Transfer',
    'Nominal (IDR)',
    'Catatan / Keterangan',
  ];

  const escapeCSV = (value: string | number | undefined | null) => {
    if (value === undefined || value === null) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = transactions.map((tx) => {
    const d = new Date(tx.transactionDate);
    const dateStr = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
    const timeStr = !isNaN(d.getTime()) ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';

    let typeStr = 'Pengeluaran';
    if (tx.type === 'income') typeStr = 'Pemasukan';
    else if (tx.type === 'transfer') typeStr = 'Transfer';

    const cat = categories.find((c) => c.id === tx.categoryId);
    const wallet = wallets.find((w) => w.id === tx.walletId);
    const destWallet = wallets.find((w) => w.id === tx.destinationWalletId);

    let groupStr = '-';
    if (cat?.allocationGroup === 'needs') groupStr = 'Kebutuhan (50%)';
    else if (cat?.allocationGroup === 'wants') groupStr = 'Keinginan (30%)';
    else if (cat?.allocationGroup === 'savings') groupStr = 'Tabungan (20%)';

    return [
      escapeCSV(tx.id),
      escapeCSV(dateStr),
      escapeCSV(timeStr),
      escapeCSV(typeStr),
      escapeCSV(cat?.name || (tx.type === 'transfer' ? 'Transfer' : 'Umum')),
      escapeCSV(groupStr),
      escapeCSV(wallet?.name || 'Dompet'),
      escapeCSV(destWallet?.name || '-'),
      escapeCSV(tx.amount),
      escapeCSV(tx.notes || '-'),
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  const today = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${today}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
};

export const exportTransactionsToPrintPDF = (
  transactions: Transaction[],
  categories: Category[],
  wallets: Wallet[],
  userName = 'Pengguna FinFlow',
  periodLabel = 'Semua Periode'
): boolean => {
  if (transactions.length === 0) return false;

  const totalInflow = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutflow = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netFlow = totalInflow - totalOutflow;

  const rowsHtml = transactions
    .map((tx, idx) => {
      const isIncome = tx.type === 'income';
      const isTransfer = tx.type === 'transfer';
      const cat = categories.find((c) => c.id === tx.categoryId);
      const wallet = wallets.find((w) => w.id === tx.walletId);
      const destWallet = wallets.find((w) => w.id === tx.destinationWalletId);

      const typeLabel = isIncome ? 'Pemasukan' : isTransfer ? 'Transfer' : 'Pengeluaran';
      const typeColor = isIncome ? '#059669' : isTransfer ? '#0284c7' : '#dc2626';

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 8px 6px; color: #64748b;">${idx + 1}</td>
          <td style="padding: 8px 6px; white-space: nowrap;">${formatDate(tx.transactionDate, 'full')}</td>
          <td style="padding: 8px 6px;">
            <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 10px; background-color: ${typeColor}15; color: ${typeColor};">
              ${typeLabel}
            </span>
          </td>
          <td style="padding: 8px 6px; font-weight: 600;">${cat?.name || (isTransfer ? 'Transfer Antar Dompet' : 'Umum')}</td>
          <td style="padding: 8px 6px; color: #475569;">${wallet?.name || 'Dompet'}${isTransfer && destWallet ? ` ➔ ${destWallet.name}` : ''}</td>
          <td style="padding: 8px 6px; color: #64748b;">${tx.notes || '-'}</td>
          <td style="padding: 8px 6px; text-align: right; font-weight: 700; color: ${typeColor};">
            ${isIncome ? '+' : isTransfer ? '' : '-'}${formatRupiah(tx.amount)}
          </td>
        </tr>
      `;
    })
    .join('');

  const printHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>FinFlow - Laporan Transaksi</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 15mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 20px;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .title { font-size: 20px; font-weight: 800; color: #0f172a; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 2px; }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 20px;
          }
          .card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 12px;
          }
          .card-title { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; }
          .card-value { font-size: 14px; font-weight: 700; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th {
            background: #f1f5f9;
            padding: 8px 6px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            color: #475569;
            text-align: left;
            border-bottom: 1px solid #cbd5e1;
          }
          th.right { text-align: right; }
          .footer {
            margin-top: 24px;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
            font-size: 10px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">FinFlow • Laporan Arus Kas</div>
            <div class="subtitle">Pengguna: ${userName} • Periode: ${periodLabel}</div>
          </div>
          <div style="text-align: right; font-size: 10px; color: #64748b;">
            Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>
            Total Catatan: ${transactions.length} Transaksi
          </div>
        </div>

        <div class="summary-grid">
          <div class="card">
            <div class="card-title">Total Pemasukan</div>
            <div class="card-value" style="color: #059669;">+${formatRupiah(totalInflow)}</div>
          </div>
          <div class="card">
            <div class="card-title">Total Pengeluaran</div>
            <div class="card-value" style="color: #dc2626;">-${formatRupiah(totalOutflow)}</div>
          </div>
          <div class="card">
            <div class="card-title">Arus Kas Bersih (Net)</div>
            <div class="card-value" style="color: ${netFlow >= 0 ? '#0284c7' : '#dc2626'};">${netFlow >= 0 ? '+' : ''}${formatRupiah(netFlow)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 25px;">#</th>
              <th>Tanggal</th>
              <th>Tipe</th>
              <th>Kategori</th>
              <th>Dompet</th>
              <th>Keterangan</th>
              <th class="right">Nominal</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <span>Dicetak otomatis melalui FinFlow - Intelligent Wealth & Cashflow Manager</span>
          <span>Halaman 1</span>
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);

  return true;
};
