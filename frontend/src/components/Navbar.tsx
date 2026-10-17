import React from 'react';
import { useFinFlowStore } from '../store/useFinFlowStore';

export const Navbar: React.FC = () => {
  const { user, setAuthModalOpen, setWalletModalOpen, activeTab } = useFinFlowStore();

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Beranda';
      case 'history':
        return 'Riwayat Transaksi';
      case 'budgets':
        return 'Target & Budget';
      case 'analytics':
        return 'Analisis Finansial';
      default:
        return 'Beranda';
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-40 pt-safe bg-surface-container-lowest/85 backdrop-blur-xl border-b border-white/5 shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
      <div className="max-w-md mx-auto h-16 px-4 flex items-center justify-between gap-2">
        {/* Logo & Status Badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-container to-secondary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
            <span className="material-symbols-outlined text-[22px] text-surface-container-lowest font-bold">
              account_balance_wallet
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-headline-sm text-[17px] font-bold text-on-surface tracking-tight truncate leading-tight">
              FinFlow
            </span>
            <span className="font-body-sm text-[11px] text-on-surface-variant truncate">
              {getPageTitle()}
            </span>
          </div>
        </div>

        {/* Action icons (Wallets, Notifications, Profile) */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Multi-Wallet button */}
          <button
            onClick={() => setWalletModalOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:text-secondary hover:bg-surface-container/60 transition-colors"
            title="Kelola Dompet & Rekening"
          >
            <span className="material-symbols-outlined text-[22px]">account_balance</span>
          </button>

          {/* Profile / Auth trigger */}
          <button
            onClick={() => setAuthModalOpen(true)}
            className="flex items-center p-0.5 rounded-full ring-2 ring-primary/30 hover:ring-primary transition-all active:scale-95"
            title={user ? user.fullName : 'Login Akun'}
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="Profile Avatar"
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                {user?.fullName ? user.fullName.charAt(0) : <span className="material-symbols-outlined text-[18px]">person</span>}
              </div>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
