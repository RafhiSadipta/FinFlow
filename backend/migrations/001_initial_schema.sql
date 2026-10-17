-- ==========================================================
-- FINFLOW DATABASE INITIAL SCHEMA (SUPABASE POSTGRESQL)
-- Versi: 1.2.0 (Includes Soft Delete, 50/30/20 Allocation Groups & User Budget Preferences)
-- ==========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABEL USERS (Profil, Preferensi Budget & Gaji)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    currency VARCHAR(10) DEFAULT 'IDR',
    monthly_budget NUMERIC(15, 2) DEFAULT 18000000.00,        -- Batas anggaran bulanan total
    monthly_income_target NUMERIC(15, 2) DEFAULT 30000000.00, -- Target gaji / basis kalkulator 50/30/20
    needs_percentage NUMERIC(5, 2) DEFAULT 50.00,             -- Default 50% Kebutuhan
    wants_percentage NUMERIC(5, 2) DEFAULT 30.00,             -- Default 30% Keinginan
    savings_percentage NUMERIC(5, 2) DEFAULT 20.00,           -- Default 20% Tabungan
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 2. TABEL WALLETS (Dompet / Akun Bank / E-Wallet)
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'bank', -- 'bank', 'cash', 'ewallet', 'investment'
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    account_number VARCHAR(100),
    icon VARCHAR(50) DEFAULT 'account_balance_wallet',
    color VARCHAR(20) DEFAULT '#10B981',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 3. TABEL CATEGORIES (Kategori Transaksi dengan 50/30/20 Allocation Group)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL jika kategori bawaan sistem
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income')),
    allocation_group VARCHAR(20) DEFAULT 'needs' CHECK (allocation_group IN ('needs', 'wants', 'savings') OR allocation_group IS NULL),
    icon VARCHAR(50) NOT NULL DEFAULT 'category',
    color VARCHAR(20) DEFAULT '#06B6D4',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 4. TABEL TRANSACTIONS (Pencatatan Keuangan & Transfer)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    destination_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL, -- Hanya jika type = 'transfer'
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 5. TABEL BUDGETS (Pagu Anggaran per Kategori Bulanan)
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    limit_amount NUMERIC(15, 2) NOT NULL CHECK (limit_amount > 0),
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    CONSTRAINT unique_user_category_budget_month UNIQUE (user_id, category_id, month, year)
);

-- 6. TABEL SAVINGS GOALS (Target Tabungan Impian)
CREATE TABLE IF NOT EXISTS savings_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    target_amount NUMERIC(15, 2) NOT NULL CHECK (target_amount > 0),
    current_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    target_date VARCHAR(50), -- Fleksibel untuk format seperti 'Des 2026' atau tanggal YYYY-MM-DD
    auto_debit_amount NUMERIC(15, 2) DEFAULT 0.00,
    icon VARCHAR(50) DEFAULT 'savings',
    color VARCHAR(20) DEFAULT '#4EDE93',
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- ==========================================================
-- INDEXING UNTUK PERFORMA QUERY TINGGI
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_wallets_user_deleted ON wallets(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_categories_user_deleted ON categories(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON budgets(user_id, month, year) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_goals_user ON savings_goals(user_id) WHERE deleted_at IS NULL;

-- ==========================================================
-- SEED DATA: KATEGORI DEFAULT SISTEM DENGAN ALOKASI 50/30/20
-- ==========================================================
INSERT INTO categories (name, type, allocation_group, icon, color) VALUES
-- Pengeluaran (Expense) -> Kebutuhan Pokok (Needs - 50%)
('Makanan & Minuman', 'expense', 'needs', 'restaurant', '#4EDE93'),
('Transportasi', 'expense', 'needs', 'directions_car', '#4CD7F6'),
('Tagihan & Utilitas', 'expense', 'needs', 'receipt_long', '#F6AD55'),
('Kesehatan', 'expense', 'needs', 'medical_services', '#10B981'),
('Pendidikan', 'expense', 'needs', 'school', '#3B82F6'),

-- Pengeluaran (Expense) -> Keinginan & Lifestyle (Wants - 30%)
('Belanja & Gaya Hidup', 'expense', 'wants', 'shopping_bag', '#D0BCFF'),
('Hiburan & Rekreasi', 'expense', 'wants', 'sports_esports', '#FF8BA7'),
('Lain-lain (Pengeluaran)', 'expense', 'wants', 'more_horiz', '#64748B'),

-- Pengeluaran (Expense) -> Tabungan & Investasi (Savings - 20%)
('Investasi & Saham', 'expense', 'savings', 'trending_up', '#14B8A6'),

-- Pemasukan (Income)
('Gaji Utama', 'income', NULL, 'payments', '#4EDE93'),
('Bonus & THR', 'income', NULL, 'redeem', '#34D399'),
('Freelance & Side Job', 'income', NULL, 'laptop_mac', '#4CD7F6'),
('Hasil Investasi / Dividen', 'income', NULL, 'candlestick_chart', '#D0BCFF'),
('Hadiah & Hibah', 'income', NULL, 'card_giftcard', '#F43F5E'),
('Lain-lain (Pemasukan)', 'income', NULL, 'account_balance_wallet', '#64748B')
ON CONFLICT DO NOTHING;
