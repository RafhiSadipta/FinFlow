# FinFlow 💸✨
> **Modern Personal Wealth & Finance Tracker**  
> *Track, budget, and optimize your financial health with an obsidian glassmorphic aesthetic.*

[![Golang](https://img.shields.io/badge/Backend-Golang%201.22+-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev/)
[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Capacitor](https://img.shields.io/badge/Mobile-Capacitor%206-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)](https://capacitorjs.com/)

---

## 🌟 Overview

**FinFlow** adalah aplikasi pelacak kekayaan dan manajemen keuangan pribadi (*personal wealth tracker*) yang dirancang dengan arsitektur modern berstandar industri. Menggabungkan kecepatan dan ketangguhan backend **Golang (Go Fiber)** dengan antarmuka **React 19 + Tailwind CSS** bertema *Obsidian Dark Glassmorphism*, FinFlow memberikan pengalaman pencatatan keuangan yang cepat, aman, dan intuitif.

Aplikasi ini dirancang *cross-platform* (Web & Mobile Android) menggunakan **Capacitor**, serta mengeliminasi ketergantungan pada data statis/dummy dengan formula kalkulasi finansial 100% riil.

---

## 🚀 Fitur Unggulan

### 1. 💼 Manajemen Multi-Dompet & Rekening (Full CRUD)
- Tambah, ubah, dan kelola berbagai instrumen rekening: Bank, Dompet Digital (*E-Wallet*), dan Tunai (*Cash*).
- Saldo terhitung otomatis secara konsisten dan *real-time* berdasarkan seluruh arus kas transaksi.
- Proteksi penghapusan dompet yang memiliki riwayat transaksi aktif.

### 2. 📊 Analitik & Visualisasi Arus Kas Dinamis
- **Arus Kas Mingguan**: Grafik batang interaktif yang memetakan pemasukan vs pengeluaran per hari berjalan.
- **Donut Expense Chart**: Visualisasi proporsi pengeluaran per kategori yang bersih tanpa tumpang tindih teks.
- **Breakdown 50/30/20**: Evaluasi kesehatan alokasi pendapatan (*Needs*, *Wants*, *Savings*).
- **Indikator Arus Kas Bersih**: Deteksi status otomatis (**SURPLUS**, **DEFISIT**, atau **SEIMBANG**).

### 3. 🎯 Pagu Anggaran & Target Tabungan (*Savings Goals*)
- Penetapan batas anggaran bulanan per kategori dengan indikator persentase pemakaian.
- Target tabungan multi-tujuan (e.g., Dana Darurat, Liburan, Gadget) lengkap dengan fitur setor langsung dari saldo rekening.

### 4. 📅 Filter Rentang Tanggal Kustom (Bespoke Calendar)
- Modal kalender interaktif buatan sendiri dengan *highlight connected range*, navigasi bulan yang fleksibel, dan tombol pintas (7 Hari, 30 Hari, Bulan Ini).

### 5. 📑 Ekspor Laporan Finansial
- **CSV (Excel-Ready)**: Ekspor catatan transaksi terfilter dengan encoding UTF-8 BOM untuk kompatibilitas sempurna di Microsoft Excel.
- **Laporan PDF (A4 Clean Print Layout)**: Cetak laporan keuangan siap pakai lengkap dengan ringkasan arus kas, filter aktif, dan stempel waktu.

### 6. 📱 Dukungan Mobile Android (Capacitor)
- Siap dibungkus (*packaged*) menjadi file APK native menggunakan Capacitor 6.
- Mendukung integrasi CI/CD GitHub Actions untuk kompilasi APK otomatis.

---

## 🏗️ Arsitektur Sistem

Aplikasi ini dibangun menggunakan arsitektur berlapis (*Clean Architecture* & *Separation of Concerns*):

```
+-------------------------------------------------------------+
|                     Client Application                      |
|       [ React 19 + TypeScript + Tailwind CSS + Zustand ]     |
|            (Web Browser / Android Native via Capacitor)     |
+------------------------------+------------------------------+
                               |
                               | REST API (HTTP / JSON / JWT)
                               v
+-------------------------------------------------------------+
|                     Backend Golang API                      |
|               [ Go Fiber v2 REST Framework ]                |
|  +--------------------+--------------------+--------------+  |
|  | Handlers / Routing | Services (Logic)   | Repositories |  |
|  +--------------------+--------------------+--------------+  |
+------------------------------+------------------------------+
                               |
                               | PostgreSQL Protocol (SSL / Pooler)
                               v
+-------------------------------------------------------------+
|                      Database Cloud                         |
|             [ Supabase Cloud - PostgreSQL 15+ ]             |
|    Users • Wallets • Categories • Transactions • Budgets    |
+-------------------------------------------------------------+
```

---

## 🛠️ Tech Stack

| Lapisan | Teknologi | Deskripsi |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite 5 | SPA responsif dengan ekosistem modern |
| **State Management** | Zustand | Penyimpanan *state* global ringan dan reaktif |
| **Styling** | Tailwind CSS 3 | Desain *Obsidian Dark Theme* dengan nuansa glassmorphism |
| **Icons & Charts** | Material Symbols & Recharts | Visualisasi data grafik dan tipografi Google Fonts |
| **Backend** | Golang 1.22+, Go Fiber v2 | RESTful API cepat dengan *clean layered architecture* |
| **Database** | PostgreSQL 15+ (Supabase) | Database relasional dengan skema terindeks |
| **Mobile Runtime** | Capacitor 6 | Bridge native untuk membungkus web app ke Android APK |
| **Automated Test** | Node.js E2E Test Suite | Pengujian terintegrasi 21 langkah (100% Success) |

---

## 📁 Struktur Direktori

```
FinFlow/
├── backend/                  # Golang REST API Service
│   ├── cmd/api/main.go       # Entrypoint server & routing
│   ├── config/               # Database pooler & environment config
│   ├── internal/
│   │   ├── handler/          # HTTP Request & Response handlers
│   │   ├── middleware/       # JWT Auth & Security middlewares
│   │   ├── models/           # Data structs & database entities
│   │   ├── repository/       # Direct SQL / GORM database queries
│   │   ├── service/          # Business logic, math & analytics calculations
│   │   └── utils/            # Helper responses & password hashing
│   └── migrations/           # Database migration SQL files
│
├── frontend/                 # React 19 + Vite Frontend Application
│   ├── src/
│   │   ├── api/              # Axios HTTP client & DTO mappers
│   │   ├── components/       # UI Modals, Navbar, Navigation, Calendar
│   │   ├── pages/            # Dashboard, History, Budgets, Analytics
│   │   ├── store/            # Zustand global financial state store
│   │   ├── types/            # TypeScript interfaces & types
│   │   └── utils/            # CSV/PDF exporters, currency formatters
│   ├── tailwind.config.js    # Obsidian dark color tokens & font scales
│   └── vite.config.ts        # Vite build configurations
│
└── README.md                 # Dokumentasi utama proyek
```

---

## ⚡ Panduan Instalasi Lokal (*Quick Start*)

### Prasyarat
- [Node.js](https://nodejs.org/) (v18+)
- [Go](https://go.dev/) (v1.22+)
- Akun [Supabase](https://supabase.com/) (atau PostgreSQL lokal)

### 1. Clone Repository
```bash
git clone https://github.com/<username>/finflow.git
cd finflow
```

### 2. Konfigurasi Backend
Masuk ke folder `backend/`, salin file `.env.example`:
```bash
cd backend
cp .env.example .env
```
Sesuaikan variabel pada file `.env`:
```env
PORT=8080
APP_ENV=development
DATABASE_URL=postgresql://postgres.<ref>:<password>@<host>:6543/postgres?sslmode=require
JWT_SECRET=your-secure-jwt-secret
```
Jalankan server backend:
```bash
go run ./cmd/api
```
Server akan aktif di `http://127.0.0.1:8080`.

### 3. Konfigurasi Frontend
Buka terminal baru, masuk ke folder `frontend/`:
```bash
cd frontend
npm install
npm run dev
```
Buka peramban di `http://localhost:3000` untuk mulai menggunakan FinFlow.

---

## 🧪 Pengujian End-to-End (E2E)

FinFlow dilengkapi dengan pengujian alur terintegrasi (*Automated E2E Test Suite*) yang memverifikasi 21 tahapan operasional dari registrasi, mutasi dompet, transaksi pemasukan/pengeluaran, pemotongan pagu anggaran, setoran tabungan, hingga kalkulasi analitik kekayaan bersih:

```bash
# Hasil pengujian internal:
✅ Health Check -> PASS
✅ User Registration & JWT -> PASS
✅ Wallet & Category CRUD -> PASS
✅ Inflow/Outflow Math Calculation -> PASS
✅ Real-time Balance Recalculation -> PASS
✅ Budget Progress & Goal Deposits -> PASS
✅ Deep Analytics Breakdown (Net Worth & Savings Rate) -> PASS

🎉 ALL 21 END-TO-END STEPS PASSED WITH 100% SUCCESS!
```

---

## 📄 Lisensi
Didistribusikan di bawah lisensi **MIT License**. Silakan gunakan dan kembangkan untuk kebutuhan pribadi maupun portofolio profesional.
