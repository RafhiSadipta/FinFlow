import type { User, Wallet, Category, Transaction, Budget, SavingsGoal } from '../types';
import type { SalaryAllocationRule } from '../store/useFinFlowStore';

export function mapUserFromBackend(data: any): { user: User; monthlyOverallBudget: number; salaryAllocation: SalaryAllocationRule } {
  return {
    user: {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      avatarUrl: data.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      currency: data.currency || 'IDR',
    },
    monthlyOverallBudget: data.monthly_budget !== undefined && data.monthly_budget !== null ? Number(data.monthly_budget) : 0,
    salaryAllocation: {
      monthlyIncome: data.monthly_income_target !== undefined && data.monthly_income_target !== null ? Number(data.monthly_income_target) : 0,
      needsPercent: Number(data.needs_percentage) || 50,
      wantsPercent: Number(data.wants_percentage) || 30,
      savingsPercent: Number(data.savings_percentage) || 20,
    },
  };
}

export function mapWalletFromBackend(data: any): Wallet {
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    type: data.type,
    balance: Number(data.balance) || 0,
    accountNumber: data.account_number || undefined,
    icon: data.icon || 'account_balance',
    color: data.color || '#10B981',
    isActive: data.is_active !== false,
  };
}

export function mapCategoryFromBackend(data: any): Category {
  return {
    id: data.id,
    userId: data.user_id || undefined,
    name: data.name,
    type: data.type,
    allocationGroup: data.allocation_group || undefined,
    icon: data.icon || 'category',
    color: data.color || '#4EDE93',
  };
}

export function mapTransactionFromBackend(data: any): Transaction {
  return {
    id: data.id,
    userId: data.user_id,
    walletId: data.wallet_id,
    destinationWalletId: data.destination_wallet_id || undefined,
    categoryId: data.category_id || undefined,
    type: data.type,
    amount: Number(data.amount) || 0,
    transactionDate: data.transaction_date,
    notes: data.notes || undefined,
    receiptUrl: data.receipt_url || undefined,
    createdAt: data.created_at || data.transaction_date,
    wallet: data.wallet ? mapWalletFromBackend(data.wallet) : undefined,
    destinationWallet: data.destination_wallet ? mapWalletFromBackend(data.destination_wallet) : undefined,
    category: data.category ? mapCategoryFromBackend(data.category) : undefined,
  };
}

export function mapBudgetFromBackend(data: any): Budget {
  return {
    id: data.id,
    userId: data.user_id || '',
    categoryId: data.category_id,
    limitAmount: Number(data.limit_amount) || 0,
    spentAmount: Number(data.spent_amount) || 0,
    month: data.month,
    year: data.year,
    category: data.category_name ? {
      id: data.category_id,
      name: data.category_name,
      icon: data.category_icon || 'category',
      color: data.category_color || '#4EDE93',
      type: 'expense',
    } : undefined,
  };
}

export function mapSavingsGoalFromBackend(data: any): SavingsGoal {
  let cleanTargetDate = data.target_date;
  if (cleanTargetDate && typeof cleanTargetDate === 'string') {
    cleanTargetDate = cleanTargetDate.split('T')[0].split(' ')[0].trim();
  }

  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    targetAmount: Number(data.target_amount) || 0,
    currentAmount: Number(data.current_amount) || 0,
    targetDate: cleanTargetDate || undefined,
    icon: data.icon || 'savings',
    color: data.color || '#4EDE93',
    isCompleted: !!data.is_completed,
  };
}
