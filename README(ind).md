# ACON POS — Sistem Kasir & Manajemen Toko

Aplikasi Point of Sale (POS) untuk toko retail, dibangun sebagai proyek portofolio pribadi untuk mempelajari pengembangan aplikasi bisnis full-featured dari front-end murni sampai integrasi database cloud.

Aplikasi ini menangani alur kerja toko dari ujung ke ujung: manajemen stok & merek dengan skema diskon bertingkat, transaksi kasir, piutang/kas bon pelanggan, retur barang, pencatatan pengeluaran operasional, hingga laporan laba-rugi — dioptimalkan untuk digunakan di **tablet dan desktop** (bukan HP, karena konteks penggunaan POS di kasir toko umumnya di device layar besar).

🔗 **Live demo:** https://acon-pos.vercel.app/
📦 **Source code:** repo ini

---

## ✨ Fitur Utama

### 📦 Manajemen Stok & Merek
- CRUD barang lengkap dengan filter merek dan pencarian nama barang secara real-time
- Tabel bisa diurutkan dengan klik header kolom (Merek, Nama, Stok, Modal, Harga Jual)
- Skema diskon bertingkat (3 level) dari harga supplier, sesuai struktur diskon dagang yang umum di distribusi (mis. 20% + 5% + 2%, dihitung berantai bukan dijumlah)
- Kalkulasi otomatis "Modal Akhir" dan estimasi "Untung per Pcs"
- Validasi input di sisi kode (bukan cuma andalan atribut HTML) — stok wajib bilangan bulat non-negatif, diskon 0-100%, dll

### 🛒 Kasir Penjualan
- Pemilihan barang lewat daftar yang bisa difilter per merek & dicari
- Kontrol kuantitas langsung di keranjang (tambah/kurang/hapus)
- Dua metode pembayaran: **Lunas (tunai)** dengan kalkulasi kembalian otomatis, atau **Bon/Kas Bon** dengan validasi wajib nama pelanggan
- Transaksi disimpan **atomik** — insert transaksi dan pengurangan stok terjadi dalam satu operasi database (lihat bagian Arsitektur)

### 🧾 Cetak Struk Thermal
- Layout struk khusus printer thermal 80mm (`@media print`)
- Cetak rangkap otomatis dengan watermark "COPY" — 2 lembar untuk transaksi lunas, 3 lembar untuk transaksi bon
- Semua salinan dicetak dalam satu dialog print (page-break antar halaman)

### 📒 Buku Kas Bon (Piutang)
- Daftar transaksi belum lunas beserta sisa hutang per pelanggan
- Pencatatan cicilan/pembayaran parsial dengan validasi

### 🔄 Retur Barang
- Pencarian transaksi berdasarkan ID nota
- Retur per item dengan validasi kuantitas, otomatis mengembalikan stok dan menyesuaikan total pendapatan & sisa hutang transaksi terkait

### 💸 Pengeluaran Operasional
- Pencatatan pengeluaran harian dengan filter rentang tanggal

### 📊 Laporan Keuangan
- Ringkasan mutasi per periode: total penjualan, piutang, pengeluaran, dan laba bersih (memperhitungkan HPP/modal barang terjual)

### 💾 Backup & Restore
- Export seluruh data toko ke file `.json` sekali klik
- Import kembali data dari file backup — sebagai **lapisan keamanan data tambahan** (data utama sudah tersimpan di database cloud, fitur ini murni jaga-jaga)

### 🛡️ Keamanan & Kualitas Kode
- Semua data yang ditampilkan (nama barang, merek, nama pelanggan, dll) melewati `escapeHtml()` untuk mencegah XSS/HTML injection
- Dialog konfirmasi/notifikasi pakai modal custom (bukan `alert()`/`confirm()`/`prompt()` bawaan browser)
- Logika kalkulasi diskon diekstrak jadi fungsi murni (`calc.js`) yang punya unit test (`calc.test.js`, 12 test case)

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|---|---|
| Struktur | HTML5 |
| Gaya | CSS3 (custom, tanpa framework CSS), responsive breakpoint untuk tablet |
| Logika | JavaScript (Vanilla, ES6+, async/await) |
| Backend & Database | [Supabase](https://supabase.com) (PostgreSQL) |
| Testing | Node.js `assert` module (tanpa framework tambahan) |
| Hosting | [Vercel](https://vercel.com), auto-deploy dari GitHub |

**Tidak ada build step dan tidak ada framework front-end** — murni HTML/CSS/JS yang dimuat langsung oleh browser, plus 1 library eksternal (`@supabase/supabase-js`) via CDN.

---

## 🏗️ Arsitektur & Keputusan Desain

### Kenapa Supabase, bukan localStorage?
Versi awal project ini pakai `localStorage` (data tersimpan di browser). Ini dimigrasikan ke Supabase/PostgreSQL supaya data tersimpan terpusat di cloud — tidak hilang saat cache browser dibersihkan, dan bisa diakses dari device manapun (meski **belum real-time** — perubahan data di satu device baru muncul di device lain setelah halaman di-refresh, bukan otomatis lewat WebSocket/live subscription).

### Transaksi atomik lewat RPC (PL/pgSQL)
Checkout kasir melibatkan 2 operasi yang saling bergantung: insert baris transaksi dan pengurangan stok tiap barang. Kalau dilakukan sebagai 2 request terpisah, ada risiko kondisi "setengah jalan" (transaksi tersimpan tapi stok gagal update, atau sebaliknya) kalau koneksi terputus di tengah proses. Ini diselesaikan dengan fungsi database (`process_sale`, lihat `supabase_atomic_transaction.sql`) yang membungkus kedua operasi itu jadi satu transaksi database — kalau salah satu gagal, semuanya otomatis dibatalkan (rollback).

### `sales.items` disimpan sebagai JSONB, bukan tabel terpisah
Item yang dibeli dalam satu transaksi disimpan sebagai kolom JSON di tabel `sales`, bukan dinormalisasi ke tabel `sale_items` terpisah. Ini pilihan sadar untuk skala toko kecil: query jadi lebih sederhana (ambil 1 transaksi, semua itemnya otomatis ikut, tanpa JOIN) dan performanya cukup baik karena PostgreSQL punya indexing native untuk JSONB. Trade-off-nya: laporan analitik mendalam per-barang (misal ranking barang terlaris lintas transaksi) akan butuh iterasi di sisi aplikasi, bukan query SQL langsung.

### Batasan keamanan yang disengaja (penting dibaca)
Kebijakan Row Level Security (RLS) di database saat ini mengizinkan **siapapun** yang tahu URL & anon key (yang memang selalu terlihat di kode sumber halaman web — ini normal untuk anon key) untuk membaca, menulis, dan menghapus data. Aplikasi ini **belum punya sistem login/autentikasi kasir**. Ini cukup untuk keperluan portofolio dan demo, tapi **belum layak dipakai untuk operasional toko dengan data transaksi uang asli** sampai ditambahkan Supabase Auth dan kebijakan RLS yang membatasi akses hanya untuk user yang sudah login.

---

## 🚀 Cara Menjalankan (Setup Lokal)

1. Clone/download repo ini
2. Buat project baru di [Supabase](https://supabase.com)
3. Jalankan `supabase_schema.sql` di SQL Editor Supabase (membuat 4 tabel: `products`, `sales`, `returns`, `expenses`)
4. Jalankan `supabase_atomic_transaction.sql` di SQL Editor yang sama (membuat fungsi `process_sale` untuk transaksi atomik)
5. Di `script.js`, ganti `SUPABASE_URL` dan `SUPABASE_ANON_KEY` dengan milik project Supabase kamu (Project Settings → API)
6. Buka `index.html` langsung di browser — tidak perlu server/build step apapun

### Menjalankan unit test
```bash
node calc.test.js
```

---

## 📁 Struktur File

```
index.html                        - Struktur halaman
style.css                         - Seluruh styling
script.js                         - Logika aplikasi & pemanggilan Supabase
calc.js                           - Fungsi kalkulasi murni (modal, untung, kembalian), bisa dites tanpa browser
calc.test.js                      - Unit test untuk calc.js
supabase_schema.sql               - DDL pembuatan tabel + kebijakan RLS awal
supabase_atomic_transaction.sql   - Fungsi RPC process_sale untuk transaksi atomik
LICENSE                           - MIT License
```

---

## 💡 Konsep Teknis yang Dipelajari

- Migrasi arsitektur dari client-side storage (`localStorage`) ke backend cloud (PostgreSQL via Supabase), termasuk desain skema database dan mapping data antara format JS (camelCase) dan kolom SQL (snake_case)
- Penulisan fungsi database (PL/pgSQL) untuk menjamin atomicity operasi multi-step, termasuk row locking (`FOR UPDATE`) untuk mencegah race condition saat pengurangan stok
- Row Level Security (RLS) di PostgreSQL/Supabase dan implikasi keamanannya
- Pencegahan XSS lewat output encoding manual (`escapeHtml()`) pada aplikasi tanpa framework yang biasanya menangani ini otomatis
- Unit testing terhadap logika bisnis murni dengan mengekstraknya dari kode yang terikat DOM
- Deployment berkelanjutan (Continuous Deployment) dari GitHub ke Vercel — *catatan: ini CD, bukan CI/CD penuh, karena belum ada proses otomatis yang menjalankan test sebelum deploy*
- Desain UI khusus perangkat tertentu (tablet/desktop) sebagai keputusan sadar berdasarkan konteks penggunaan, bukan "responsive untuk semua device" secara default

---

## 🔭 Kemungkinan Pengembangan Lanjutan

- **Supabase Auth** — login kasir/pemilik toko, dengan kebijakan RLS yang membatasi akses hanya untuk user terautentikasi (saat ini prioritas utama sebelum dipakai operasional nyata)
- **CI (Continuous Integration)** — jalankan `calc.test.js` otomatis lewat GitHub Actions setiap push, sebelum Vercel men-deploy
- Normalisasi `sales.items` ke tabel `sale_items` terpisah, kalau nanti butuh laporan analitik per-barang yang lebih dalam
- Realtime sync sungguhan (Supabase Realtime subscription) supaya perubahan data di satu device otomatis muncul di device lain tanpa refresh manual

---

*Dibuat sebagai proyek portofolio pribadi oleh Jason Alexander Wijaya untuk mempelajari pengembangan aplikasi bisnis (business application development), dari front-end sampai integrasi database.*
