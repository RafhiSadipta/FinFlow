import React, { useState } from 'react';
import { useFinFlowStore } from '../store/useFinFlowStore';
import { formatRupiah } from '../utils/formatters';
import type { Wallet, WalletType } from '../types';

const COLOR_PRESETS = [
  { label: 'Emerald', value: '#10B981' },
  { label: 'Cyan', value: '#06B6D4' },
  { label: 'Amber', value: '#F59E0B' },
  { label: 'Purple', value: '#8B5CF6' },
  { label: 'Pink', value: '#EC4899' },
  { label: 'Blue', value: '#3B82F6' },
];

export const WalletManagementModal: React.FC = () => {
  const {
    isWalletModalOpen,
    setWalletModalOpen,
    wallets,
    addWallet,
    updateWallet,
    deleteWallet,
    showToast,
    user,
  } = useFinFlowStore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [walletToDelete, setWalletToDelete] = useState<Wallet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form inputs
  const [name, setName] = useState('');
  const [type, setType] = useState<WalletType>('bank');
  const [balance, setBalance] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [color, setColor] = useState('#10B981');

  if (!isWalletModalOpen) return null;

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  const handleStartCreate = () => {
    setEditingWallet(null);
    setName('');
    setType('bank');
    setBalance('');
    setAccountNumber('');
    setColor('#10B981');
    setIsFormOpen(true);
  };

  const handleStartEdit = (w: Wallet) => {
    setEditingWallet(w);
    setName(w.name);
    setType(w.type);
    setBalance(w.balance.toString());
    setAccountNumber(w.accountNumber ? w.accountNumber.replace('•••• ', '') : '');
    setColor(w.color || '#10B981');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingWallet(null);
    setName('');
    setBalance('');
    setAccountNumber('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let icon = 'account_balance';
    if (type === 'ewallet') icon = 'phone_android';
    else if (type === 'cash') icon = 'payments';
    else if (type === 'investment') icon = 'candlestick_chart';

    const parsedBalance = parseFloat(balance) || 0;
    const formattedAccNum = accountNumber.trim()
      ? accountNumber.trim().length <= 4
        ? accountNumber.trim()
        : `•••• ${accountNumber.trim().slice(-4)}`
      : undefined;

    setIsSubmitting(true);
    try {
      if (editingWallet) {
        await updateWallet(editingWallet.id, {
          name: name.trim(),
          type,
          balance: parsedBalance,
          accountNumber: formattedAccNum,
          icon,
          color,
        });
      } else {
        await addWallet({
          userId: user?.id || '',
          name: name.trim(),
          type,
          balance: parsedBalance,
          accountNumber: formattedAccNum,
          icon,
          color,
          isActive: true,
        });
      }
      handleCloseForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!walletToDelete) return;
    setIsDeleting(true);
    try {
      await deleteWallet(walletToDelete.id);
      setWalletToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-md bg-surface-container-low rounded-t-3xl sm:rounded-3xl border border-white/10 p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">account_balance_wallet</span>
            <div>
              <h3 className="font-headline-sm text-lg font-bold text-on-surface">
                {isFormOpen
                  ? editingWallet
                    ? 'Edit Dompet & Rekening'
                    : 'Tambah Dompet Baru'
                  : 'Kelola Dompet & Rekening'}
              </h3>
              <p className="text-xs text-on-surface-variant">
                {isFormOpen
                  ? editingWallet
                    ? 'Perbarui detail informasi rekening Anda'
                    : 'Tambahkan akun bank, e-wallet, atau kas'
                  : `Total Saldo: ${formatRupiah(totalBalance)}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (isFormOpen) {
                handleCloseForm();
              } else {
                setWalletModalOpen(false);
              }
            }}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Delete Confirmation Dialog */}
        {walletToDelete && (
          <div className="p-4 rounded-2xl bg-error/10 border border-error/20 flex flex-col gap-3 animate-fadeIn">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-error text-[24px] shrink-0 mt-0.5">warning</span>
              <div className="flex flex-col gap-1">
                <span className="font-headline-sm text-sm font-bold text-on-surface">
                  Hapus Dompet "{walletToDelete.name}"?
                </span>
                <span className="text-xs text-on-surface-variant leading-relaxed">
                  Dompet ini akan dihapus dari daftar akun aktif. Transaksi keuangan yang sudah pernah tercatat sebelumnya akan tetap aman dan tersimpan dalam riwayat.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end mt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setWalletToDelete(null)}
                className="px-3 py-1.5 rounded-lg bg-surface-container text-xs text-on-surface-variant font-semibold hover:text-on-surface transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 rounded-lg bg-error text-xs text-white font-bold hover:bg-error/90 transition-all flex items-center gap-1.5 shadow-md shadow-error/20"
              >
                {isDeleting ? (
                  <>
                    <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                    <span>Hapus Dompet</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Wallet List */}
        {!isFormOpen ? (
          <>
            <div className="flex flex-col gap-2.5">
              {wallets.length === 0 ? (
                <div className="p-6 text-center text-xs text-on-surface-variant rounded-2xl bg-surface-container/50 border border-white/5">
                  Belum ada dompet atau rekening yang tercatat. Klik tombol di bawah untuk menambahkan.
                </div>
              ) : (
                wallets.map((wallet) => (
                  <div
                    key={wallet.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-container/70 border border-white/5 hover:border-white/10 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-on-surface shadow-md shrink-0"
                        style={{ backgroundColor: `${wallet.color || '#10B981'}25`, color: wallet.color || '#10B981' }}
                      >
                        <span className="material-symbols-outlined text-[24px]">{wallet.icon}</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-headline-sm text-sm font-semibold text-on-surface truncate">
                          {wallet.name}
                        </span>
                        <span className="text-[11px] text-on-surface-variant capitalize truncate">
                          {wallet.type} {wallet.accountNumber ? `(${wallet.accountNumber})` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="font-num-data font-semibold text-sm text-on-surface block">
                          {formatRupiah(wallet.balance)}
                        </span>
                        <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full font-medium">
                          Aktif
                        </span>
                      </div>

                      {/* Action Buttons: Edit & Delete */}
                      <div className="flex items-center gap-1 ml-1.5 pl-2 border-l border-white/10">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(wallet)}
                          className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-primary flex items-center justify-center transition-all"
                          title="Edit Dompet"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (wallets.length <= 1) {
                              showToast({
                                type: 'error',
                                title: 'Tidak Dapat Dihapus',
                                message: 'FinFlow membutuhkan minimal 1 dompet aktif untuk mencatat transaksi.',
                              });
                              return;
                            }
                            setWalletToDelete(wallet);
                          }}
                          className="w-8 h-8 rounded-lg bg-surface-container hover:bg-error/20 text-on-surface-variant hover:text-error flex items-center justify-center transition-all"
                          title="Hapus Dompet"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={handleStartCreate}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-surface-container-lowest font-bold text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:opacity-95 active:scale-98 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              <span>Tambah Rekening / Dompet Baru</span>
            </button>
          </>
        ) : (
          /* Form Tambah / Edit Dompet */
          <form onSubmit={handleSave} className="flex flex-col gap-3.5 animate-fadeIn">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-on-surface-variant font-medium">Nama Dompet / Rekening</label>
              <input
                type="text"
                required
                placeholder="Contoh: Mandiri Payroll, BCA Utama, GoPay"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-surface-container px-3.5 py-2.5 rounded-xl text-on-surface text-sm border border-white/10 focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-on-surface-variant font-medium">Jenis Akun</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'bank', label: 'Bank Rekening', icon: 'account_balance' },
                  { id: 'ewallet', label: 'E-Wallet', icon: 'phone_android' },
                  { id: 'cash', label: 'Uang Tunai', icon: 'payments' },
                  { id: 'investment', label: 'Investasi', icon: 'candlestick_chart' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setType(item.id as WalletType);
                      if (item.id === 'bank') setColor('#10B981');
                      else if (item.id === 'ewallet') setColor('#06B6D4');
                      else if (item.id === 'cash') setColor('#F59E0B');
                      else if (item.id === 'investment') setColor('#8B5CF6');
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium transition-all ${
                      type === item.id
                        ? 'bg-primary/20 text-primary border border-primary/40 font-semibold'
                        : 'bg-surface-container text-on-surface-variant border border-white/5'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-on-surface-variant font-medium">
                {editingWallet ? 'Saldo Saat Ini (Rp)' : 'Saldo Awal (Rp)'}
              </label>
              <input
                type="number"
                step="any"
                placeholder="0"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="bg-surface-container px-3.5 py-2.5 rounded-xl text-on-surface text-sm border border-white/10 focus:outline-none focus:border-primary font-num-data"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-on-surface-variant font-medium">Nomor Rekening / Akun (Opsional)</label>
              <input
                type="text"
                placeholder="Contoh: 1234567890"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="bg-surface-container px-3.5 py-2.5 rounded-xl text-on-surface text-sm border border-white/10 focus:outline-none focus:border-primary"
              />
            </div>

            {/* Warna Dompet */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-on-surface-variant font-medium">Warna Tema Akun</label>
              <div className="flex items-center gap-2">
                {COLOR_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setColor(p.value)}
                    className={`w-7 h-7 rounded-full transition-all flex items-center justify-center ${
                      color === p.value ? 'ring-2 ring-white ring-offset-2 ring-offset-surface-container-low scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: p.value }}
                    title={p.label}
                  >
                    {color === p.value && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCloseForm}
                className="flex-1 py-3 rounded-xl bg-surface-container text-on-surface-variant font-semibold text-sm hover:text-on-surface transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>{editingWallet ? 'Simpan Perubahan' : 'Simpan Dompet'}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
