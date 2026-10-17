import React, { useState } from 'react';
import { useFinFlowStore } from '../store/useFinFlowStore';

export const LandingPage: React.FC = () => {
  const {
    loginWithCredentials,
    registerWithCredentials,
    loginAsDemo,
    showToast,
  } = useFinFlowStore();

  const [isAuthSheetOpen, setIsAuthSheetOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const openAuth = (mode: 'register' | 'login') => {
    setAuthMode(mode);
    setIsAuthSheetOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (authMode === 'register' && !fullName.trim()) return;

    setIsSubmitting(true);
    try {
      if (authMode === 'register') {
        const ok = await registerWithCredentials(email.trim(), password, fullName.trim());
        if (ok) {
          showToast({
            type: 'success',
            title: 'Selamat Datang di FinFlow!',
            message: `Akun atas nama ${fullName} berhasil dibuat.`,
          });
        }
      } else {
        const ok = await loginWithCredentials(email.trim(), password);
        if (ok) {
          showToast({
            type: 'success',
            title: 'Selamat Datang Kembali!',
            message: 'Sesi Anda telah tersimpan dengan aman.',
          });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoAccess = async () => {
    setIsDemoLoading(true);
    try {
      await loginAsDemo();
      showToast({
        type: 'success',
        title: 'Masuk Mode Demo',
        message: 'Menjelajahi FinFlow dengan akun demo.',
      });
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-surface text-on-surface flex flex-col justify-between items-center p-6 relative overflow-hidden">
      {/* Subtle Ambient Radial Glows */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-80 h-80 bg-secondary/15 rounded-full blur-[90px] pointer-events-none"></div>

      {/* Top Spacer */}
      <div className="w-full pt-4 flex justify-end">
        <button
          onClick={() => openAuth('login')}
          className="text-xs font-semibold text-on-surface-variant hover:text-on-surface px-3 py-1.5 rounded-full bg-surface-container-high/40 border border-white/5 transition-all"
        >
          Masuk Akun
        </button>
      </div>

      {/* Center: Minimal Logo & Pesan Singkat */}
      <div className="flex flex-col items-center text-center gap-5 my-auto max-w-xs animate-fadeIn">
        {/* Luxury App Icon */}
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-primary via-[#3dd893] to-secondary flex items-center justify-center shadow-[0_0_40px_rgba(78,222,163,0.35)] ring-1 ring-white/20">
            <span className="material-symbols-outlined text-[48px] text-surface-container-lowest font-bold">
              account_balance_wallet
            </span>
          </div>
          {/* Subtle Sparkle Badge */}
          <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-surface-container border border-primary/40 flex items-center justify-center text-primary shadow-md">
            <span className="material-symbols-outlined text-[15px] font-bold">star</span>
          </span>
        </div>

        {/* Brand Name */}
        <div className="flex flex-col gap-1">
          <h1 className="font-headline-lg text-3xl font-extrabold tracking-tight text-on-surface">
            Fin<span className="text-primary">Flow</span>
          </h1>
          {/* Pesan Singkat */}
          <p className="font-body-md text-sm text-on-surface-variant leading-relaxed px-2">
            Kelola kekayaan dan capai kebebasan finansialmu dengan cerdas.
          </p>
        </div>
      </div>

      {/* Bottom Area: Tombol Mulai Sekarang & Akses Cepat */}
      <div className="w-full max-w-xs flex flex-col gap-3 pb-6 animate-fadeIn">
        {/* Tombol Utama: Mulai Sekarang */}
        <button
          onClick={() => openAuth('register')}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-surface-container-lowest font-headline-sm text-base font-bold shadow-[0_0_24px_rgba(78,222,163,0.35)] hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Mulai Sekarang</span>
          <span className="material-symbols-outlined text-[20px] font-bold">arrow_forward</span>
        </button>

        {/* Akses Cepat Demo */}
        <button
          onClick={handleDemoAccess}
          disabled={isDemoLoading}
          className="w-full py-2.5 text-xs text-on-surface-variant hover:text-on-surface font-medium flex items-center justify-center gap-1.5 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px] text-secondary">bolt</span>
          <span>{isDemoLoading ? 'Membuka brankas...' : 'Coba Akun Demo Langsung'}</span>
        </button>
      </div>

      {/* Clean Auth Sheet / Modal (Opens when tapping Mulai Sekarang / Masuk) */}
      {isAuthSheetOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsAuthSheetOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-surface-container-low rounded-t-3xl sm:rounded-3xl border border-white/10 p-6 shadow-2xl flex flex-col gap-4 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Sheet Glow */}
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-primary/20 rounded-full blur-2xl pointer-events-none"></div>

            {/* Handle Bar & Close */}
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">lock_open</span>
                <h3 className="font-headline-sm text-base font-bold text-on-surface">
                  {authMode === 'register' ? 'Buat Akun FinFlow' : 'Masuk ke FinFlow'}
                </h3>
              </div>
              <button
                onClick={() => setIsAuthSheetOpen(false)}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            {/* Switcher Tab */}
            <div className="p-1 bg-surface-container-lowest rounded-xl flex items-center border border-white/5">
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  authMode === 'register'
                    ? 'bg-primary text-surface-container-lowest shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Daftar Baru
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  authMode === 'login'
                    ? 'bg-primary text-surface-container-lowest shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Masuk
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {authMode === 'register' && (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-on-surface-variant font-medium">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Raditya Pratama"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-surface-container px-3.5 py-2.5 rounded-xl text-xs text-on-surface border border-white/10 focus:outline-none focus:border-primary"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-on-surface-variant font-medium">Email</label>
                <input
                  type="email"
                  required
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-surface-container px-3.5 py-2.5 rounded-xl text-xs text-on-surface border border-white/10 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-on-surface-variant font-medium">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-surface-container px-3.5 py-2.5 rounded-xl text-xs text-on-surface border border-white/10 focus:outline-none focus:border-primary"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-surface-container-lowest font-bold text-xs shadow-lg shadow-primary/20 hover:opacity-95 active:scale-98 transition-all disabled:opacity-50"
              >
                {isSubmitting
                  ? 'Memproses...'
                  : authMode === 'register'
                  ? 'Daftar Sekarang'
                  : 'Masuk Akun'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
