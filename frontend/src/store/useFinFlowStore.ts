import { create } from 'zustand';
import type { User, Wallet, Category, Transaction, Budget, SavingsGoal, DateRangeFilter, TransactionType } from '../types';
import {
  authApi,
  walletApi,
  categoryApi,
  transactionApi,
  budgetApi,
  savingsGoalApi,
} from '../api/client';
import {
  mapUserFromBackend,
  mapWalletFromBackend,
  mapCategoryFromBackend,
  mapTransactionFromBackend,
  mapBudgetFromBackend,
  mapSavingsGoalFromBackend,
} from '../api/mappers';
import { getSavedToken, saveToken, clearSavedToken } from '../utils/cookies';
import { formatRupiah } from '../utils/formatters';

const SALARY_ALLOCATION_STORAGE_KEY = 'finflow_salary_allocation';

const getStoredSalaryAllocation = (): SalaryAllocationRule => {
  try {
    const raw = localStorage.getItem(SALARY_ALLOCATION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.monthlyIncome === 'number') {
        return {
          monthlyIncome: Number(parsed.monthlyIncome) || 0,
          needsPercent: Number(parsed.needsPercent) || 50,
          wantsPercent: Number(parsed.wantsPercent) || 30,
          savingsPercent: Number(parsed.savingsPercent) || 20,
        };
      }
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
  return {
    monthlyIncome: 0,
    needsPercent: 50,
    wantsPercent: 30,
    savingsPercent: 20,
  };
};

const saveStoredSalaryAllocation = (rule: SalaryAllocationRule) => {
  try {
    localStorage.setItem(SALARY_ALLOCATION_STORAGE_KEY, JSON.stringify(rule));
  } catch {
    // Ignore storage quota
  }
};

const clearStoredSalaryAllocation = () => {
  try {
    localStorage.removeItem(SALARY_ALLOCATION_STORAGE_KEY);
  } catch {
    // Ignore
  }
};

export interface SalaryAllocationRule {
  monthlyIncome: number;
  needsPercent: number;    // default 50
  wantsPercent: number;    // default 30
  savingsPercent: number;  // default 20
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface FinFlowState {
  // Toast Notification
  toast: ToastNotification | null;
  showToast: (toast: Omit<ToastNotification, 'id'>) => void;
  hideToast: () => void;

  // Sync & Loading state
  isLoading: boolean;
  isBackendConnected: boolean;

  // Auth state
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  
  // App navigation & Modals
  activeTab: 'dashboard' | 'history' | 'budgets' | 'analytics';
  isRecordModalOpen: boolean;
  recordModalInitialType: TransactionType;
  isDateFilterModalOpen: boolean;
  isWalletModalOpen: boolean;
  isCategoryModalOpen: boolean;
  isAuthModalOpen: boolean;
  isBalanceHidden: boolean;
  
  // Financial data
  wallets: Wallet[];
  categories: Category[];
  deletedCategories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  monthlyOverallBudget: number;
  salaryAllocation: SalaryAllocationRule;
  
  // Filters
  historyFilter: DateRangeFilter;
  searchQuery: string;
  selectedCategoryFilter: string | null;
  selectedHistoryType: 'all' | 'expense' | 'income';
  
  // Actions
  setActiveTab: (tab: 'dashboard' | 'history' | 'budgets' | 'analytics') => void;
  setRecordModalOpen: (open: boolean, type?: TransactionType) => void;
  setDateFilterModalOpen: (open: boolean) => void;
  setWalletModalOpen: (open: boolean) => void;
  setCategoryModalOpen: (open: boolean) => void;
  setAuthModalOpen: (open: boolean) => void;
  toggleBalanceHidden: () => void;
  
  // Filter actions
  setHistoryFilter: (filter: DateRangeFilter) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategoryFilter: (categoryId: string | null) => void;
  setSelectedHistoryType: (type: 'all' | 'expense' | 'income') => void;
  
  // Data hydration & sync
  fetchInitialData: () => Promise<void>;
  
  // Data manipulation
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addWallet: (wallet: Omit<Wallet, 'id'>) => Promise<void>;
  updateWallet: (id: string, wallet: Partial<Wallet>) => Promise<void>;
  deleteWallet: (id: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  deleteCategory: (id: string) => Promise<boolean>;
  restoreCategory: (id: string) => Promise<boolean>;
  fetchDeletedCategories: () => Promise<void>;
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'currentAmount' | 'isCompleted'>) => Promise<void>;
  updateSavingsGoal: (id: string, goal: Partial<SavingsGoal>) => Promise<boolean>;
  deleteSavingsGoal: (id: string) => Promise<boolean>;
  addDepositToGoal: (id: string, amount: number, walletId?: string) => Promise<void>;
  completeSavingsGoal: (id: string, actualAmount: number, walletId: string, categoryId?: string, notes?: string) => Promise<boolean>;
  updateSavingsGoalProgress: (id: string, addedAmount: number) => Promise<void>;
  setBudgetLimit: (categoryId: string, limitAmount: number) => Promise<void>;
  setMonthlyOverallBudget: (limit: number) => Promise<void>;
  setSalaryAllocation: (rule: Partial<SalaryAllocationRule>) => Promise<void>;
  
  // Auth
  login: (user: User, token: string) => void;
  loginWithCredentials: (email: string, password: string) => Promise<boolean>;
  registerWithCredentials: (email: string, password: string, fullName: string) => Promise<boolean>;
  loginAsDemo: () => Promise<boolean>;
  logout: () => void;
}

const initialToken = getSavedToken();

export const useFinFlowStore = create<FinFlowState>((set, get) => ({
  toast: null,
  showToast: (toastData) => {
    const id = `toast-${Date.now()}`;
    set({ toast: { ...toastData, id } });
  },
  hideToast: () => set({ toast: null }),

  isLoading: false,
  isBackendConnected: false,

  user: null,
  isAuthenticated: !!initialToken,
  token: initialToken,
  
  activeTab: 'dashboard',
  isRecordModalOpen: false,
  recordModalInitialType: 'expense',
  isDateFilterModalOpen: false,
  isWalletModalOpen: false,
  isCategoryModalOpen: false,
  isAuthModalOpen: false,
  isBalanceHidden: false,
  
  wallets: [],
  categories: [],
  deletedCategories: [],
  transactions: [],
  budgets: [],
  savingsGoals: [],
  monthlyOverallBudget: 0,
  salaryAllocation: getStoredSalaryAllocation(),
  
  historyFilter: {
    startDate: null,
    endDate: null,
    preset: 'all',
  },
  searchQuery: '',
  selectedCategoryFilter: null,
  selectedHistoryType: 'all',
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  setRecordModalOpen: (open, initialType = 'expense') => set({ isRecordModalOpen: open, recordModalInitialType: initialType }),
  setDateFilterModalOpen: (open) => set({ isDateFilterModalOpen: open }),
  setWalletModalOpen: (open) => set({ isWalletModalOpen: open }),
  setCategoryModalOpen: (open) => set({ isCategoryModalOpen: open }),
  setAuthModalOpen: (open) => set({ isAuthModalOpen: open }),
  toggleBalanceHidden: () => set((state) => ({ isBalanceHidden: !state.isBalanceHidden })),
  
  setHistoryFilter: (filter) => set({ historyFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategoryFilter: (categoryId) => set({ selectedCategoryFilter: categoryId }),
  setSelectedHistoryType: (type) => set({ selectedHistoryType: type }),
  
  // Hydrate all data from backend
  fetchInitialData: async () => {
    const currentToken = getSavedToken();
    if (!currentToken) {
      set({ isLoading: false, isAuthenticated: false, user: null });
      return;
    }

    set({ isLoading: true });
    try {
      // Fetch all endpoints concurrently
      const [profileRes, walletsRes, categoriesRes, deletedCatsRes, txRes, budgetsRes, goalsRes] = await Promise.allSettled([
        authApi.getProfile(),
        walletApi.getAll(),
        categoryApi.getAll(),
        categoryApi.getDeleted(),
        transactionApi.getAll(),
        budgetApi.getBudgets({ month: new Date().getMonth() + 1, year: new Date().getFullYear() }),
        savingsGoalApi.getAll(),
      ]);

      if (profileRes.status !== 'fulfilled' || !profileRes.value.data?.data) {
        // Token expired or invalid
        clearSavedToken();
        set({ token: null, isAuthenticated: false, user: null, isLoading: false });
        return;
      }

      const mapped = mapUserFromBackend(profileRes.value.data.data);
      const user = mapped.user;
      let monthlyOverallBudget = mapped.monthlyOverallBudget;
      let salaryAllocation = mapped.salaryAllocation;

      // Persistence safeguard:
      if (salaryAllocation.monthlyIncome > 0) {
        saveStoredSalaryAllocation(salaryAllocation);
      } else {
        const localCached = getStoredSalaryAllocation();
        if (localCached.monthlyIncome > 0) {
          salaryAllocation = localCached;
          monthlyOverallBudget = Math.round((localCached.monthlyIncome * (localCached.needsPercent + localCached.wantsPercent)) / 100);
          // Sync back to server in background
          authApi.updateProfile({
            monthly_income_target: localCached.monthlyIncome,
            needs_percentage: localCached.needsPercent,
            wants_percentage: localCached.wantsPercent,
            savings_percentage: localCached.savingsPercent,
            monthly_budget: monthlyOverallBudget,
          }).catch(() => {});
        }
      }

      let wallets: Wallet[] = [];
      if (walletsRes.status === 'fulfilled' && walletsRes.value.data?.data?.wallets) {
        wallets = walletsRes.value.data.data.wallets.map(mapWalletFromBackend);
      }

      let categories: Category[] = [];
      if (categoriesRes.status === 'fulfilled' && Array.isArray(categoriesRes.value.data?.data)) {
        categories = categoriesRes.value.data.data.map(mapCategoryFromBackend);
      }

      let deletedCategories: Category[] = [];
      if (deletedCatsRes.status === 'fulfilled' && Array.isArray(deletedCatsRes.value.data?.data)) {
        deletedCategories = deletedCatsRes.value.data.data.map(mapCategoryFromBackend);
      }

      let transactions: Transaction[] = [];
      if (txRes.status === 'fulfilled' && Array.isArray(txRes.value.data?.data)) {
        transactions = txRes.value.data.data.map(mapTransactionFromBackend);
      }

      let budgets: Budget[] = [];
      if (budgetsRes.status === 'fulfilled' && Array.isArray(budgetsRes.value.data?.data)) {
        budgets = budgetsRes.value.data.data.map(mapBudgetFromBackend);
      }

      let savingsGoals: SavingsGoal[] = [];
      if (goalsRes.status === 'fulfilled' && Array.isArray(goalsRes.value.data?.data)) {
        savingsGoals = goalsRes.value.data.data.map(mapSavingsGoalFromBackend);
      }

      set({
        user,
        monthlyOverallBudget,
        salaryAllocation,
        wallets,
        categories,
        deletedCategories,
        transactions,
        budgets,
        savingsGoals,
        isAuthenticated: true,
        isBackendConnected: true,
        isLoading: false,
      });
    } catch (err) {
      console.error('Failed to load FinFlow initial data:', err);
      set({ isLoading: false, isBackendConnected: false });
    }
  },

  login: (user, token) => {
    saveToken(token);
    set({ user, token, isAuthenticated: true, isAuthModalOpen: false });
    get().fetchInitialData();
  },

  loginWithCredentials: async (email, password) => {
    try {
      const res = await authApi.login({ email, password });
      if (res.data?.data?.token) {
        const token = String(res.data.data.token);
        const bUser = res.data.data.user;
        saveToken(token);
        const mapped = mapUserFromBackend(bUser);
        if (mapped.salaryAllocation.monthlyIncome > 0) {
          saveStoredSalaryAllocation(mapped.salaryAllocation);
        }
        set({
          user: mapped.user,
          monthlyOverallBudget: mapped.monthlyOverallBudget,
          salaryAllocation: mapped.salaryAllocation.monthlyIncome > 0 ? mapped.salaryAllocation : getStoredSalaryAllocation(),
          token,
          isAuthenticated: true,
          isAuthModalOpen: false,
        });
        await get().fetchInitialData();
        return true;
      }
      return false;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login gagal. Periksa kembali email dan password.';
      get().showToast({
        type: 'error',
        title: 'Gagal Masuk',
        message: msg,
      });
      return false;
    }
  },

  registerWithCredentials: async (email, password, fullName) => {
    try {
      const res = await authApi.register({ email, password, full_name: fullName });
      if (res.data?.data?.token) {
        const token = String(res.data.data.token);
        const bUser = res.data.data.user;
        saveToken(token);
        const mapped = mapUserFromBackend(bUser);
        if (mapped.salaryAllocation.monthlyIncome > 0) {
          saveStoredSalaryAllocation(mapped.salaryAllocation);
        }
        set({
          user: mapped.user,
          monthlyOverallBudget: mapped.monthlyOverallBudget,
          salaryAllocation: mapped.salaryAllocation.monthlyIncome > 0 ? mapped.salaryAllocation : getStoredSalaryAllocation(),
          token,
          isAuthenticated: true,
          isAuthModalOpen: false,
        });
        await get().fetchInitialData();
        return true;
      }
      return false;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Pendaftaran gagal. Silakan coba kembali.';
      get().showToast({
        type: 'error',
        title: 'Gagal Mendaftar',
        message: msg,
      });
      return false;
    }
  },

  loginAsDemo: async () => {
    try {
      let res;
      try {
        res = await authApi.login({
          email: 'demo@finflow.app',
          password: 'password123',
        });
      } catch {
        res = await authApi.register({
          email: 'demo@finflow.app',
          password: 'password123',
          full_name: 'Raditya Pratama (Demo)',
        });
      }
      if (res.data?.data?.token) {
        const token = String(res.data.data.token);
        saveToken(token);
        set({ token, isAuthenticated: true });
        await get().fetchInitialData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to log in as demo:', err);
      get().showToast({
        type: 'error',
        title: 'Gagal Masuk Akun Demo',
        message: 'Periksa koneksi server backend.',
      });
      return false;
    }
  },

  logout: () => {
    clearSavedToken();
    clearStoredSalaryAllocation();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      salaryAllocation: {
        monthlyIncome: 0,
        needsPercent: 50,
        wantsPercent: 30,
        savingsPercent: 20,
      },
      wallets: [],
      categories: [],
      deletedCategories: [],
      transactions: [],
      budgets: [],
      savingsGoals: [],
      isAuthModalOpen: false,
    });
    get().showToast({
      type: 'info',
      title: 'Berhasil Keluar',
      message: 'Sesi Anda telah diakhiri dengan aman.',
    });
  },

  addTransaction: async (txData) => {
    try {
      const payload: any = {
        wallet_id: txData.walletId,
        type: txData.type,
        amount: txData.amount,
        notes: txData.notes || '',
      };
      if (txData.destinationWalletId) {
        payload.destination_wallet_id = txData.destinationWalletId;
      }
      if (txData.categoryId) {
        payload.category_id = txData.categoryId;
      }
      if (txData.transactionDate) {
        payload.transaction_date = txData.transactionDate;
      }

      const res = await transactionApi.create(payload);
      if (res.data?.data) {
        const newTx = mapTransactionFromBackend(res.data.data);
        
        // Refresh wallets from backend to get verified balance
        try {
          const walletsRes = await walletApi.getAll();
          if (walletsRes.data?.data?.wallets) {
            set({ wallets: walletsRes.data.data.wallets.map(mapWalletFromBackend) });
          }
        } catch {
          // Optimistic fallback for wallet balance
          set((state) => ({
            wallets: state.wallets.map((w) => {
              if (w.id === txData.walletId) {
                if (txData.type === 'expense') return { ...w, balance: w.balance - txData.amount };
                if (txData.type === 'income') return { ...w, balance: w.balance + txData.amount };
                if (txData.type === 'transfer') return { ...w, balance: w.balance - txData.amount };
              }
              if (txData.type === 'transfer' && w.id === txData.destinationWalletId) {
                return { ...w, balance: w.balance + txData.amount };
              }
              return w;
            }),
          }));
        }

        // Prepend transaction & close modal
        set((state) => ({
          transactions: [newTx, ...state.transactions],
          isRecordModalOpen: false,
        }));
      }
    } catch (err: any) {
      console.error('Failed to create transaction on backend:', err);
      get().showToast({
        type: 'error',
        title: 'Gagal Menyimpan Transaksi',
        message: err.response?.data?.message || 'Terjadi kesalahan koneksi server.',
      });
      throw err;
    }
  },

  deleteTransaction: async (id) => {
    try {
      await transactionApi.delete(id);
      
      // Refresh wallets to get updated balance
      const walletsRes = await walletApi.getAll();
      if (walletsRes.data?.data?.wallets) {
        set({
          wallets: walletsRes.data.data.wallets.map(mapWalletFromBackend),
          transactions: get().transactions.filter((t) => t.id !== id),
        });
      } else {
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        }));
      }
    } catch (err: any) {
      console.error('Failed to delete transaction:', err);
      get().showToast({
        type: 'error',
        title: 'Gagal Menghapus Transaksi',
        message: err.response?.data?.message || 'Server gagal memproses penghapusan.',
      });
    }
  },

  addWallet: async (walletData) => {
    try {
      const payload = {
        name: walletData.name,
        type: walletData.type,
        balance: walletData.balance,
        account_number: walletData.accountNumber || null,
        icon: walletData.icon,
        color: walletData.color,
      };
      const res = await walletApi.create(payload);
      if (res.data?.data) {
        const newWallet = mapWalletFromBackend(res.data.data);
        set((state) => ({ wallets: [...state.wallets, newWallet] }));
        get().showToast({
          type: 'success',
          title: 'Dompet Berhasil Ditambahkan',
          message: `${newWallet.name} siap digunakan.`,
        });
      }
    } catch (err: any) {
      console.error('Failed to add wallet:', err);
      get().showToast({
        type: 'error',
        title: 'Gagal Menambah Dompet',
        message: err.response?.data?.message || 'Kesalahan saat menyimpan dompet.',
      });
    }
  },

  updateWallet: async (id, walletData) => {
    try {
      const payload: any = {};
      if (walletData.name !== undefined) payload.name = walletData.name;
      if (walletData.type !== undefined) payload.type = walletData.type;
      if (walletData.balance !== undefined) payload.balance = walletData.balance;
      if (walletData.accountNumber !== undefined) payload.account_number = walletData.accountNumber || null;
      if (walletData.icon !== undefined) payload.icon = walletData.icon;
      if (walletData.color !== undefined) payload.color = walletData.color;
      if (walletData.isActive !== undefined) payload.is_active = walletData.isActive;

      const res = await walletApi.update(id, payload);
      if (res.data?.data) {
        const updated = mapWalletFromBackend(res.data.data);
        set((state) => ({
          wallets: state.wallets.map((w) => (w.id === id ? updated : w)),
        }));
        get().showToast({
          type: 'success',
          title: 'Dompet Berhasil Diperbarui',
          message: `${updated.name} telah disimpan.`,
        });
      }
    } catch (err: any) {
      console.error('Failed to update wallet:', err);
      get().showToast({
        type: 'error',
        title: 'Gagal Memperbarui Dompet',
        message: err.response?.data?.message || 'Kesalahan saat menyimpan perubahan dompet.',
      });
      throw err;
    }
  },

  deleteWallet: async (id) => {
    try {
      const target = get().wallets.find((w) => w.id === id);
      await walletApi.delete(id);
      set((state) => ({
        wallets: state.wallets.filter((w) => w.id !== id),
      }));
      get().showToast({
        type: 'success',
        title: 'Dompet Berhasil Dihapus',
        message: target ? `Dompet "${target.name}" telah dihapus.` : 'Dompet berhasil dihapus.',
      });
    } catch (err: any) {
      console.error('Failed to delete wallet:', err);
      get().showToast({
        type: 'error',
        title: 'Gagal Menghapus Dompet',
        message: err.response?.data?.message || 'Kesalahan saat menghapus dompet.',
      });
      throw err;
    }
  },

  addCategory: async (catData) => {
    try {
      const payload = {
        name: catData.name,
        type: catData.type,
        allocation_group: catData.allocationGroup || null,
        icon: catData.icon,
        color: catData.color,
      };
      const res = await categoryApi.create(payload);
      if (res.data?.data) {
        const newCat = mapCategoryFromBackend(res.data.data);
        set((state) => ({
          categories: [...state.categories, newCat],
          isCategoryModalOpen: false,
        }));
        get().showToast({
          type: 'success',
          title: 'Kategori Berhasil Dibuat',
          message: `Kategori ${newCat.name} telah tersimpan.`,
        });
      }
    } catch (err: any) {
      console.error('Failed to add category:', err);
      get().showToast({
        type: 'error',
        title: 'Gagal Menambah Kategori',
        message: err.response?.data?.message || 'Kesalahan saat menyimpan kategori.',
      });
    }
  },

  deleteCategory: async (id: string) => {
    try {
      const targetCat = get().categories.find((c) => c.id === id);
      await categoryApi.delete(id);

      set((state) => ({
        categories: state.categories.filter((c) => c.id !== id),
      }));

      // Refresh deleted categories in background
      await get().fetchDeletedCategories();

      get().showToast({
        type: 'success',
        title: 'Kategori Dinonaktifkan',
        message: targetCat ? `Kategori "${targetCat.name}" berhasil di-soft delete.` : 'Kategori berhasil dinonaktifkan.',
      });
      return true;
    } catch (err: any) {
      console.error('Failed to delete category:', err);
      get().showToast({
        type: 'error',
        title: 'Gagal Menghapus Kategori',
        message: err.response?.data?.message || 'Server gagal menonaktifkan kategori.',
      });
      return false;
    }
  },

  restoreCategory: async (id: string) => {
    try {
      await categoryApi.restore(id);

      const [catsRes, deletedRes] = await Promise.allSettled([
        categoryApi.getAll(),
        categoryApi.getDeleted(),
      ]);

      if (catsRes.status === 'fulfilled' && Array.isArray(catsRes.value.data?.data)) {
        set({ categories: catsRes.value.data.data.map(mapCategoryFromBackend) });
      }
      if (deletedRes.status === 'fulfilled' && Array.isArray(deletedRes.value.data?.data)) {
        set({ deletedCategories: deletedRes.value.data.data.map(mapCategoryFromBackend) });
      }

      get().showToast({
        type: 'success',
        title: 'Kategori Dipulihkan',
        message: 'Kategori berhasil diaktifkan kembali.',
      });
      return true;
    } catch (err: any) {
      console.error('Failed to restore category:', err);
      get().showToast({
        type: 'error',
        title: 'Gagal Memulihkan Kategori',
        message: err.response?.data?.message || 'Server gagal memulihkan kategori.',
      });
      return false;
    }
  },

  fetchDeletedCategories: async () => {
    try {
      const res = await categoryApi.getDeleted();
      if (res.data?.data && Array.isArray(res.data.data)) {
        set({ deletedCategories: res.data.data.map(mapCategoryFromBackend) });
      }
    } catch (err) {
      console.error('Failed to fetch deleted categories:', err);
    }
  },

  addSavingsGoal: async (goalData) => {
    try {
      let targetDateFormatted = goalData.targetDate || '';
      if (targetDateFormatted && !targetDateFormatted.includes('-')) {
        targetDateFormatted = new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0];
      }

      const payload = {
        name: goalData.name,
        target_amount: goalData.targetAmount,
        current_amount: 0,
        target_date: targetDateFormatted,
        icon: goalData.icon || 'savings',
        color: goalData.color || '#4EDE93',
      };
      const res = await savingsGoalApi.create(payload);
      if (res.data?.data) {
        const newGoal = mapSavingsGoalFromBackend(res.data.data);
        set((state) => ({ savingsGoals: [...state.savingsGoals, newGoal] }));
        get().showToast({
          type: 'success',
          title: 'Target Tabungan Dibuat!',
          message: `Target ${newGoal.name} berhasil ditambahkan.`,
        });
      }
    } catch (err: any) {
      console.error('Failed to add savings goal:', err);
      get().showToast({
        type: 'error',
        title: 'Gagal Menambah Target Tabungan',
        message: err.response?.data?.message || 'Server gagal membuat target tabungan.',
      });
    }
  },

  addDepositToGoal: async (id, amount, walletId) => {
    try {
      const targetWalletId = walletId || get().wallets[0]?.id;
      if (!targetWalletId) {
        get().showToast({
          type: 'error',
          title: 'Gagal Menabung',
          message: 'Pilih dompet sumber dana terlebih dahulu.',
        });
        return;
      }

      const res = await savingsGoalApi.deposit(id, {
        amount,
        wallet_id: targetWalletId,
      });

      if (res.data?.data) {
        const updatedGoal = mapSavingsGoalFromBackend(res.data.data);

        set((state) => ({
          savingsGoals: state.savingsGoals.map((g) => (g.id === id ? updatedGoal : g)),
        }));

        get().showToast({
          type: 'success',
          title: 'Tabungan Ditambahkan!',
          message: `Berhasil mencatat setoran Rp ${formatRupiah(amount, false)} ke "${updatedGoal.name}". Uang tetap tersimpan di akun Anda.`,
        });
      }
    } catch (err: any) {
      console.error('Failed to deposit to goal:', err);
      get().showToast({
        type: 'error',
        title: 'Gagal Menyetor Tabungan',
        message: err.response?.data?.message || 'Server error saat mencatat setoran.',
      });
    }
  },

  completeSavingsGoal: async (id, actualAmount, walletId, categoryId, notes) => {
    try {
      const res = await savingsGoalApi.complete(id, {
        actual_amount: actualAmount,
        wallet_id: walletId,
        category_id: categoryId,
        notes: notes,
      });

      if (res.data?.data) {
        const updatedGoal = mapSavingsGoalFromBackend(res.data.data);

        // Refresh wallets and transactions since money was actually spent!
        const [walletsRes, txRes] = await Promise.allSettled([
          walletApi.getAll(),
          transactionApi.getAll(),
        ]);

        let updatedWallets = get().wallets;
        if (walletsRes.status === 'fulfilled' && walletsRes.value.data?.data?.wallets) {
          updatedWallets = walletsRes.value.data.data.wallets.map(mapWalletFromBackend);
        }

        let updatedTxs = get().transactions;
        if (txRes.status === 'fulfilled' && Array.isArray(txRes.value.data?.data)) {
          updatedTxs = txRes.value.data.data.map(mapTransactionFromBackend);
        }

        set((state) => ({
          savingsGoals: state.savingsGoals.map((g) => (g.id === id ? updatedGoal : g)),
          wallets: updatedWallets,
          transactions: updatedTxs,
        }));

        get().showToast({
          type: 'success',
          title: 'Target Impian Tercapai & Dibeli! 🎉',
          message: `Selamat! "${updatedGoal.name}" tuntas dibeli (${formatRupiah(actualAmount)}). Pengeluaran telah dibukukan.`,
        });
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Failed to complete savings goal:', err);
      get().showToast({
        type: 'error',
        title: 'Gagal Menyelesaikan Target',
        message: err.response?.data?.message || 'Saldo dompet tidak mencukupi atau terjadi kesalahan.',
      });
      return false;
    }
  },

  updateSavingsGoalProgress: async (id: string, addedAmount: number) => {
    const goal = get().savingsGoals.find((g) => g.id === id);
    if (!goal) return;
    const newAmount = goal.currentAmount + addedAmount;
    try {
      const res = await savingsGoalApi.update(id, {
        current_amount: newAmount,
        is_completed: newAmount >= goal.targetAmount,
      });
      if (res.data?.data) {
        const updatedGoal = mapSavingsGoalFromBackend(res.data.data);
        set((state) => ({
          savingsGoals: state.savingsGoals.map((g) => (g.id === id ? updatedGoal : g)),
        }));
      }
    } catch (err) {
      console.error('Failed to update savings goal progress:', err);
    }
  },

  updateSavingsGoal: async (id: string, goalData: Partial<SavingsGoal>) => {
    try {
      const payload: any = {};
      if (goalData.name !== undefined) payload.name = goalData.name;
      if (goalData.targetAmount !== undefined) payload.target_amount = goalData.targetAmount;
      if (goalData.currentAmount !== undefined) payload.current_amount = goalData.currentAmount;
      if (goalData.targetDate !== undefined) {
        let td = goalData.targetDate || '';
        if (td.includes('T')) td = td.split('T')[0];
        payload.target_date = td;
      }
      if (goalData.icon !== undefined) payload.icon = goalData.icon;
      if (goalData.color !== undefined) payload.color = goalData.color;
      if (goalData.isCompleted !== undefined) payload.is_completed = goalData.isCompleted;

      const res = await savingsGoalApi.update(id, payload);
      if (res.data?.data) {
        const updatedGoal = mapSavingsGoalFromBackend(res.data.data);
        set((state) => ({
          savingsGoals: state.savingsGoals.map((g) => (g.id === id ? updatedGoal : g)),
        }));
        get().showToast({
          type: 'success',
          title: 'Target Tabungan Diperbarui',
          message: `Target "${updatedGoal.name}" berhasil diubah.`,
        });
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Failed to update savings goal:', err);
      get().showToast({
        type: 'error',
        title: 'Gagal Memperbarui Target',
        message: err.response?.data?.message || 'Server gagal memperbarui target tabungan.',
      });
      return false;
    }
  },

  deleteSavingsGoal: async (id: string) => {
    try {
      const targetGoal = get().savingsGoals.find((g) => g.id === id);
      await savingsGoalApi.delete(id);
      set((state) => ({
        savingsGoals: state.savingsGoals.filter((g) => g.id !== id),
      }));
      get().showToast({
        type: 'success',
        title: 'Target Tabungan Dihapus',
        message: targetGoal ? `Target "${targetGoal.name}" berhasil dihapus.` : 'Target berhasil dihapus.',
      });
      return true;
    } catch (err: any) {
      console.error('Failed to delete savings goal:', err);
      get().showToast({
        type: 'error',
        title: 'Gagal Menghapus Target',
        message: err.response?.data?.message || 'Server gagal menghapus target tabungan.',
      });
      return false;
    }
  },

  setBudgetLimit: async (categoryId, limitAmount) => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    try {
      await budgetApi.setBudget({
        category_id: categoryId,
        limit_amount: limitAmount,
        month: currentMonth,
        year: currentYear,
      });

      const budgetsRes = await budgetApi.getBudgets({ month: currentMonth, year: currentYear });
      if (budgetsRes.data?.data) {
        set({ budgets: budgetsRes.data.data.map(mapBudgetFromBackend) });
      }

      get().showToast({
        type: 'success',
        title: 'Pagu Anggaran Disimpan',
        message: 'Batas kategori berhasil diperbarui.',
      });
    } catch (err: any) {
      console.error('Failed to set budget limit:', err);
      get().showToast({
        type: 'error',
        title: 'Gagal Menyimpan Anggaran',
        message: err.response?.data?.message || 'Gagal memperbarui pagu anggaran.',
      });
    }
  },

  setMonthlyOverallBudget: async (limit) => {
    set({ monthlyOverallBudget: limit });
    try {
      await authApi.updateProfile({ monthly_budget: limit });
    } catch (err) {
      console.error('Failed to sync monthly budget to backend:', err);
    }
  },

  setSalaryAllocation: async (rule) => {
    const current = get().salaryAllocation;
    const updated: SalaryAllocationRule = {
      monthlyIncome: rule.monthlyIncome !== undefined ? rule.monthlyIncome : current.monthlyIncome,
      needsPercent: rule.needsPercent !== undefined ? rule.needsPercent : current.needsPercent,
      wantsPercent: rule.wantsPercent !== undefined ? rule.wantsPercent : current.wantsPercent,
      savingsPercent: rule.savingsPercent !== undefined ? rule.savingsPercent : current.savingsPercent,
    };
    const autoBudget = Math.round((updated.monthlyIncome * (updated.needsPercent + updated.wantsPercent)) / 100);
    set({ salaryAllocation: updated, monthlyOverallBudget: autoBudget });
    saveStoredSalaryAllocation(updated);

    try {
      await authApi.updateProfile({
        monthly_income_target: updated.monthlyIncome,
        needs_percentage: updated.needsPercent,
        wants_percentage: updated.wantsPercent,
        savings_percentage: updated.savingsPercent,
        monthly_budget: autoBudget,
      });
      get().showToast({
        type: 'success',
        title: 'Alokasi Anggaran Disimpan',
        message: `Batas anggaran bulanan otomatis disesuaikan menjadi ${autoBudget > 0 ? formatRupiah(autoBudget) : 'Rp 0'}.`,
      });
    } catch (err: any) {
      console.error('Failed to sync salary allocation to backend:', err);
      get().showToast({
        type: 'error',
        title: 'Gagal Menyinkronkan ke Server',
        message: err.response?.data?.message || 'Data telah disimpan di memori lokal perangkat Anda.',
      });
    }
  },
}));
