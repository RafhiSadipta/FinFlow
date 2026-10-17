import React, { useState } from 'react';
import { useFinFlowStore } from '../store/useFinFlowStore';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setAuthModalOpen,
    user,
    isAuthenticated,
    loginWithCredentials,
    registerWithCredentials,
    logout,
    showToast,
  } = useFinFlowStore();
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (isRegister && !fullName.trim()) return;

    setIsSubmitting(true);
    try {
      if (isRegister) {
        const ok = await registerWithCredentials(email.trim(), password, fullName.trim());
        if (ok) {
          showToast({
            type: 'success',
            title: 'Akun Berhasil Dibuat!',
            message: `Selamat datang di FinFlow, ${fullName}!`,
          });
          setEmail('');
          setPassword('');
          setFullName('');
        }
      } else {
        const ok = await loginWithCredentials(email.trim(), password);
        if (ok) {
          showToast({
            type: 'success',
            title: 'Masuk Berhasil!',
            message: 'Selamat datang kembali di FinFlow.',
          });
          setEmail('');
          setPassword('');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-sm bg-surface-container-low rounded-3xl border border-white/10 p-6 shadow-2xl flex flex-col gap-4 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Glows */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-secondary/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button 
          onClick={() => setAuthModalOpen(false)}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {isAuthenticated && user ? (
          /* User Profile View */
          <div className="flex flex-col items-center text-center gap-3 pt-2">
            <div className="relative">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-primary/30 shadow-xl"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/20 text-primary flex items-center justify-center font-extrabold text-2xl uppercase ring-4 ring-primary/30 shadow-xl">
                  {user.fullName ? user.fullName.charAt(0) : <span className="material-symbols-outlined text-[32px]">person</span>}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-surface-container-lowest">
                <span className="material-symbols-outlined text-[14px] font-bold">verified</span>
              </span>
            </div>
            
            <div className="flex flex-col">
              <h3 className="font-headline-sm text-lg font-bold text-on-surface">{user.fullName}</h3>
              <p className="text-xs text-on-surface-variant">{user.email}</p>
              <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <span>Obsidian Tier Member</span>
              </div>
            </div>

            <div className="w-full pt-4 flex flex-col gap-2">
              <button
                onClick={logout}
                className="w-full py-3 rounded-xl bg-error/15 text-error hover:bg-error/25 font-bold text-sm transition-all"
              >
                Keluar (Logout)
              </button>
            </div>
          </div>
        ) : (
          /* Auth Form (Login / Register) */
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-secondary mx-auto flex items-center justify-center text-surface-container-lowest shadow-lg shadow-primary/30 mb-2">
                <span className="material-symbols-outlined text-[28px] font-bold">account_balance_wallet</span>
              </div>
              <h3 className="font-headline-sm text-xl font-bold text-on-surface">
                {isRegister ? 'Buat Akun FinFlow' : 'Masuk ke FinFlow'}
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {isRegister ? 'Mulai kelola kekayaanmu dengan cerdas' : 'Akses brankas keuangan pribadimu'}
              </p>
            </div>

            {isRegister && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-on-surface-variant font-medium">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Raditya Pratama"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-surface-container px-3.5 py-2.5 rounded-xl text-on-surface text-sm border border-white/10 focus:outline-none focus:border-primary"
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs text-on-surface-variant font-medium">Email</label>
              <input
                type="email"
                required
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-surface-container px-3.5 py-2.5 rounded-xl text-on-surface text-sm border border-white/10 focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-on-surface-variant font-medium">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-surface-container px-3.5 py-2.5 rounded-xl text-on-surface text-sm border border-white/10 focus:outline-none focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-surface-container-lowest font-bold text-sm shadow-lg shadow-primary/25 hover:opacity-95 active:scale-98 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Memproses...' : isRegister ? 'Daftar Sekarang' : 'Masuk Akun'}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="text-xs text-secondary hover:underline font-medium"
              >
                {isRegister
                  ? 'Sudah punya akun? Masuk di sini'
                  : 'Belum punya akun? Daftar gratis'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
