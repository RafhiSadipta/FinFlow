import React from 'react';
import { useFinFlowStore } from '../store/useFinFlowStore';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, setRecordModalOpen } = useFinFlowStore();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pb-safe pointer-events-none">
      <div className="max-w-md mx-auto px-4 pb-3">
        <nav className="pointer-events-auto flex items-center justify-around h-16 rounded-2xl bg-surface-container-low/90 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.6)] px-2">
          {/* 1. Beranda */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              activeTab === 'dashboard'
                ? 'text-primary scale-105 font-semibold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[24px]">
              {activeTab === 'dashboard' ? 'home' : 'home'}
            </span>
            <span className="text-[11px] font-medium mt-0.5">Beranda</span>
            {activeTab === 'dashboard' && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5 shadow-sm shadow-primary"></span>
            )}
          </button>

          {/* 2. Riwayat */}
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              activeTab === 'history'
                ? 'text-primary scale-105 font-semibold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[24px]">receipt_long</span>
            <span className="text-[11px] font-medium mt-0.5">Riwayat</span>
            {activeTab === 'history' && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5 shadow-sm shadow-primary"></span>
            )}
          </button>

          {/* 3. Center Floating Action Button (FAB: Catat Transaksi) */}
          <div className="flex-1 flex items-center justify-center -mt-6">
            <button
              onClick={() => setRecordModalOpen(true)}
              className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-secondary text-surface-container-lowest flex items-center justify-center shadow-lg shadow-primary/35 hover:scale-105 active:scale-95 transition-all group"
              title="Catat Transaksi Baru"
            >
              <span className="material-symbols-outlined text-[30px] font-bold group-hover:rotate-90 transition-transform duration-300">
                add
              </span>
            </button>
          </div>

          {/* 4. Budget & Goals */}
          <button
            onClick={() => setActiveTab('budgets')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              activeTab === 'budgets'
                ? 'text-primary scale-105 font-semibold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[24px]">savings</span>
            <span className="text-[11px] font-medium mt-0.5">Target</span>
            {activeTab === 'budgets' && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5 shadow-sm shadow-primary"></span>
            )}
          </button>

          {/* 5. Analisis */}
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              activeTab === 'analytics'
                ? 'text-primary scale-105 font-semibold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[24px]">insights</span>
            <span className="text-[11px] font-medium mt-0.5">Analisis</span>
            {activeTab === 'analytics' && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5 shadow-sm shadow-primary"></span>
            )}
          </button>
        </nav>
      </div>
    </div>
  );
};
