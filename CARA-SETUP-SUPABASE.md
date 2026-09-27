# Cara menghubungkan ONDERDEEL24 ke Supabase

Situs ini mengambil dan menyimpan data produk lewat
[Supabase](https://supabase.com) (database sungguhan). Siapa saja bisa
melihat katalog, tapi cuma admin yang **login** lewat Supabase Auth yang
bisa menambah/ubah/hapus produk — ditegakkan oleh database sendiri
(Row Level Security), bukan cuma dijaga oleh tampilan situs. Ikuti
langkah berikut sebelum situs di-upload.

## 1. Buat project Supabase (gratis)

1. Buka https://supabase.com -> Sign up / Log in.
2. Klik **New project**.
3. Isi nama project (bebas, mis. `onderdeel24`), password database
   (simpan baik-baik, tidak dipakai di kode situs), dan pilih region
   terdekat (mis. Singapore).
4. Tunggu sampai project selesai dibuat (1-2 menit).

## 2. Buat tabel produk + aturan keamanannya

1. Di sidebar project, buka **SQL Editor**.
2. Klik **New query**.
3. Buka file `supabase-setup.sql` (satu paket dengan file ini),
   salin semua isinya, tempel ke SQL Editor.
4. Klik **Run**. Kalau berhasil, tabel `products` sudah ada
   (bisa dicek di menu **Table Editor**), lengkap dengan aturan
   "siapa saja boleh baca, cuma yang login boleh tulis".

## 3. Buat akun admin (Supabase Auth)

Panel admin login pakai akun sungguhan (email + password), bukan
kode akses yang tertulis di kode sumber.

1. Di sidebar, buka **Authentication** -> **Users**.
2. Klik **Add user** -> **Create new user**.
3. Isi email dan password untuk akunmu sendiri (ini yang dipakai
   login di `admin.html`). Centang **Auto Confirm User** supaya tidak
   perlu verifikasi email lebih dulu.
4. Klik **Create user**.
5. **Penting:** buka **Authentication** -> **Providers** -> **Email**,
   lalu matikan **Allow new users to sign up**. Ini mencegah orang lain
   membuat akun sendiri lewat API Supabase — hanya akun yang kamu buat
   manual di langkah 1-4 yang bisa login dan menulis data.

Ulangi langkah 1-4 kalau mau menambah admin lain (misal karyawan toko).
Untuk mencabut akses seseorang, hapus usernya di halaman **Users** yang sama
— begitu dihapus, sesi login mereka akan langsung ditolak database.

## 4. Ambil URL dan anon key

1. Di sidebar, buka **Project Settings** (ikon gerigi) -> **API**.
2. Salin nilai **Project URL**.
3. Salin nilai **anon public** (di bagian "Project API keys").

## 5. Tempel ke kode situs

Buka file `products-data.js`, cari bagian paling atas:

```js
var SUPABASE_URL = "GANTI_DENGAN_PROJECT_URL_SUPABASE_KAMU";
var SUPABASE_ANON_KEY = "GANTI_DENGAN_ANON_KEY_SUPABASE_KAMU";
```

Ganti dua baris itu dengan nilai asli dari langkah 4, misalnya:

```js
var SUPABASE_URL = "https://abcdefghijk.supabase.co";
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9......";
```

Simpan file, lalu upload ulang seluruh situs (termasuk `products-data.js`
yang sudah diisi) ke hosting kamu.

## 6. Coba

- Buka `admin.html`, login pakai email & password akun yang kamu buat
  di langkah 3, lalu tambahkan satu produk.
- Buka `katalog.html` di **perangkat lain / browser lain** (atau mode
  penyamaran) — produk yang baru ditambahkan harus langsung muncul di
  sana juga.
- Coba juga buka `admin.html` di jendela penyamaran **tanpa login** —
  panel tidak akan bisa diakses karena belum ada sesi Supabase Auth.

## Soal keamanan

Dengan setup ini:
- **Baca (lihat katalog)**: terbuka untuk siapa saja, termasuk
  pengunjung yang belum login — memang begitu seharusnya toko online.
- **Tulis (tambah/ubah/hapus produk)**: hanya bisa dilakukan oleh
  pengguna yang sudah login lewat Supabase Auth. Ini ditegakkan oleh
  Row Level Security **di sisi database**, jadi meskipun seseorang
  membaca kode sumber situs dan memanggil Supabase langsung (melewati
  `admin.html` sama sekali), mereka tetap akan ditolak kalau belum login.
- Anon key yang ada di `products-data.js` memang publik dan tertanam
  di kode situs — itu wajar dan aman, karena kekuatan aksesnya diatur
  lewat RLS policy di database, bukan lewat kerahasiaan key itu.
- Jangan lupa langkah 3.5 (matikan "Allow new users to sign up"),
  supaya orang tidak bisa membuat akun sendiri lalu ikut login.

## Kalau ada masalah

- **Produk tidak muncul sama sekali / pesan "Katalog gagal dimuat"**:
  buka Console browser (F12 -> Console). Kalau ada pesan
  "Supabase belum dikonfigurasi", berarti langkah 5 belum dilakukan.
- **Tidak bisa login / "Email atau kata sandi salah"**: pastikan akun
  sudah dibuat di langkah 3 dan "Auto Confirm User" sempat dicentang
  saat pembuatan (kalau tidak, akun perlu verifikasi email dulu).
- **Sudah login tapi tambah/ubah/hapus produk tetap gagal (error izin/RLS)**:
  pastikan `supabase-setup.sql` di langkah 2 sudah dijalankan sampai
  selesai tanpa error, khususnya bagian `create policy ... to authenticated`.
- **Data lama dari localStorage**: karena sumber datanya sekarang
  Supabase, produk lama yang sempat tersimpan di localStorage browser
  (dari versi situs sebelumnya) tidak otomatis ikut pindah. Tambahkan
  lagi manual lewat panel admin, atau beri tahu saya kalau mau dibuatkan
  skrip migrasi satu kali.
