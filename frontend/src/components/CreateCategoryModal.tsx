import React, { useState } from 'react';
import { useFinFlowStore } from '../store/useFinFlowStore';
import { formatRupiah } from '../utils/formatters';
import type { AllocationGroup } from '../types';

export const CreateCategoryModal: React.FC = () => {
  const {
    isCategoryModalOpen,
    setCategoryModalOpen,
    addCategory,
    categories,
    budgets,
    salaryAllocation,
  } = useFinFlowStore();

  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [allocationGroup, setAllocationGroup] = useState<AllocationGroup>('needs');
  const [selectedIcon, setSelectedIcon] = useState('category');
  const [selectedColor, setSelectedColor] = useState('#4EDE93');

  const income = salaryAllocation?.monthlyIncome || 0;
  const needsCap = (income * (salaryAllocation?.needsPercent || 50)) / 100;
  const wantsCap = (income * (salaryAllocation?.wantsPercent || 30)) / 100;
  const savingsCap = (income * (salaryAllocation?.savingsPercent || 20)) / 100;

  const getGroupCap = (grp: AllocationGroup): number => {
    if (grp === 'wants') return wantsCap;
    if (grp === 'savings') return savingsCap;
    return needsCap;
  };

  const getRemainingCap = (grp: AllocationGroup): number => {
    const groupCap = getGroupCap(grp);
    const customAllocated = categories
      .filter((c) => c.type === 'expense' && (c.allocationGroup || 'needs') === grp)
      .reduce((sum, c) => {
        const b = budgets.find((item) => item.categoryId === c.id);
        return sum + (b && b.limitAmount > 0 ? b.limitAmount : 0);
      }, 0);
    return Math.max(0, groupCap - customAllocated);
  };

  if (!isCategoryModalOpen) return null;

  const iconOptions = [
    'restaurant', 'shopping_bag', 'directions_car', 'receipt_long',
    'sports_esports', 'medical_services', 'school', 'payments',
    'laptop_mac', 'trending_up', 'flight_takeoff', 'local_cafe',
    'fitness_center', 'movie', 'pets', 'home', 'savings', 'redeem'
  ];

  const colorOptions = [
    '#4EDE93', '#4CD7F6', '#D0BCFF', '#F6AD55', '#FF8BA7',
    '#38BDF8', '#F43F5E', '#10B981', '#A855F7', '#EAB308'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addCategory({
      name: name.trim(),
      type,
      allocationGroup: type === 'expense' ? allocationGroup : undefined,
      icon: selectedIcon,
      color: selectedColor,
    });

    setName('');
    setSelectedIcon('category');
    setSelectedColor('#4EDE93');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-sm bg-surface-container-low rounded-3xl border border-white/10 p-5 shadow-2xl flex flex-col gap-4 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">category</span>
            <h3 className="font-headline-sm text-base font-bold text-on-surface">Tambah Kategori Baru</h3>
          </div>
          <button 
            onClick={() => setCategoryModalOpen(false)}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Tipe Kategori */}
          <div className="p-1 bg-surface-container-lowest rounded-xl flex items-center gap-1 border border-white/5">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                type === 'expense'
                  ? 'bg-error-container/30 text-error border border-error/20 shadow-sm'
                  : 'text-on-surface-variant'
              }`}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                type === 'income'
                  ? 'bg-primary-container/30 text-primary border border-primary/20 shadow-sm'
                  : 'text-on-surface-variant'
              }`}
            >
              Pemasukan
            </button>
          </div>

          {/* Nama Kategori */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-on-surface-variant font-medium">Nama Kategori</label>
            <input
              type="text"
              required
              placeholder="Contoh: Kopi & Kafe, Asuransi, Hobi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-surface-container px-3.5 py-2.5 rounded-xl text-xs text-on-surface border border-white/10 focus:outline-none focus:border-primary"
            />
          </div>

          {/* Kantong Alokasi Anggaran (Hanya untuk Pengeluaran) */}
          {type === 'expense' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-on-surface-variant font-medium">
                Masuk ke Kantong Alokasi (50/30/20)
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'needs', label: `Kebutuhan (${salaryAllocation?.needsPercent || 50}%)`, color: 'text-secondary' },
                  { id: 'wants', label: `Keinginan (${salaryAllocation?.wantsPercent || 30}%)`, color: 'text-tertiary' },
                  { id: 'savings', label: `Tabungan (${salaryAllocation?.savingsPercent || 20}%)`, color: 'text-primary' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAllocationGroup(item.id as AllocationGroup)}
                    className={`py-2 px-1 rounded-xl text-[10px] font-bold transition-all ${
                      allocationGroup === item.id
                        ? 'bg-surface-container-high border border-white/20 shadow-sm ' + item.color
                        : 'bg-surface-container text-on-surface-variant/70 border border-white/5'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-xl bg-surface-container/60 border border-white/5 mt-1">
                <span className="text-on-surface-variant">Sisa alokasi tersedia:</span>
                <span className={`font-num-data font-bold ${income > 0 ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {income > 0 ? formatRupiah(getRemainingCap(allocationGroup)) : 'Belum diatur (Rp 0)'}
                </span>
              </div>
            </div>
          )}

          {/* Pilih Icon */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-on-surface-variant font-medium">Pilih Icon</label>
            <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto p-1 bg-surface-container-lowest rounded-xl border border-white/5">
              {iconOptions.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    selectedIcon === icon
                      ? 'bg-primary/25 text-primary ring-2 ring-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{icon}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pilih Warna Glow */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-on-surface-variant font-medium">Warna Aksen Glow</label>
            <div className="flex items-center gap-2 overflow-x-auto p-1 bg-surface-container-lowest rounded-xl border border-white/5 no-scrollbar">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-7 h-7 rounded-full shrink-0 transition-transform ${
                    selectedColor === color ? 'scale-125 ring-2 ring-white shadow-lg' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Tombol Simpan */}
          <button
            type="submit"
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-surface-container-lowest font-bold text-sm shadow-lg shadow-primary/25 hover:opacity-95 active:scale-98 transition-all"
          >
            Simpan Kategori
          </button>
        </form>
      </div>
    </div>
  );
};
