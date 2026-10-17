-- ==========================================================
-- PATCH SCRIPT UNTUK DATABASE SUPABASE YANG SUDAH DIBUAT
-- Jalankan script ini di SQL Editor Supabase jika tabel sudah ada sebelumnya
-- ==========================================================

-- 1. Tambah kolom preferensi budget & gaji di tabel USERS
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS monthly_budget NUMERIC(15, 2) DEFAULT 18000000.00,
ADD COLUMN IF NOT EXISTS monthly_income_target NUMERIC(15, 2) DEFAULT 30000000.00,
ADD COLUMN IF NOT EXISTS needs_percentage NUMERIC(5, 2) DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS wants_percentage NUMERIC(5, 2) DEFAULT 30.00,
ADD COLUMN IF NOT EXISTS savings_percentage NUMERIC(5, 2) DEFAULT 20.00;

-- 2. Tambah kolom allocation_group di tabel CATEGORIES
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS allocation_group VARCHAR(20) DEFAULT 'needs' 
CHECK (allocation_group IN ('needs', 'wants', 'savings') OR allocation_group IS NULL);

-- 3. Tambah kolom auto_debit_amount di tabel SAVINGS_GOALS
ALTER TABLE savings_goals 
ADD COLUMN IF NOT EXISTS auto_debit_amount NUMERIC(15, 2) DEFAULT 0.00;

-- 4. Update data kategori lama agar memiliki grup alokasi yang tepat
UPDATE categories SET allocation_group = 'needs' WHERE name ILIKE '%Makan%' OR name ILIKE '%Transport%' OR name ILIKE '%Tagihan%' OR name ILIKE '%Kesehatan%' OR name ILIKE '%Pendidikan%';
UPDATE categories SET allocation_group = 'wants' WHERE name ILIKE '%Belanja%' OR name ILIKE '%Hiburan%' OR name ILIKE '%Lain%';
UPDATE categories SET allocation_group = 'savings' WHERE name ILIKE '%Investasi%' OR name ILIKE '%Tabungan%';
UPDATE categories SET allocation_group = NULL WHERE type = 'income';
