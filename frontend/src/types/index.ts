export type TransactionType = 'expense' | 'income' | 'transfer';

export type WalletType = 'bank' | 'cash' | 'ewallet' | 'investment';

export type AllocationGroup = 'needs' | 'wants' | 'savings';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  currency: string;
}

export interface Wallet {
  id: string;
  userId: string;
  name: string;
  type: WalletType;
  balance: number;
  accountNumber?: string;
  icon: string;
  color: string;
  isActive: boolean;
}

export interface Category {
  id: string;
  userId?: string;
  name: string;
  type: 'expense' | 'income';
  allocationGroup?: AllocationGroup; // 'needs' (50%), 'wants' (30%), 'savings' (20%)
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  destinationWalletId?: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  transactionDate: string;
  notes?: string;
  receiptUrl?: string;
  createdAt: string;
  wallet?: Wallet;
  destinationWallet?: Wallet;
  category?: Category;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  limitAmount: number;
  month: number;
  year: number;
  category?: Category;
  spentAmount?: number;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  icon: string;
  color: string;
  isCompleted: boolean;
}

export interface DateRangeFilter {
  startDate: string | null;
  endDate: string | null;
  preset: 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom' | 'all';
}
