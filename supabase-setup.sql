-- ============================================================
-- ONDERDEEL24 — setup tabel produk di Supabase
-- Jalankan seluruh isi file ini di: Supabase Dashboard
-- -> project kamu -> SQL Editor -> New query -> paste -> Run
-- ============================================================

create table if not exists public.products (
  id          bigint generated always as identity primary key,
  name        text not null,
  cat         text not null,
  tag         text not null default 'Aftermarket', -- 'OEM' atau 'Aftermarket'
  price       integer not null default 0,
  stock       integer not null default 0,
  fits        jsonb,                                -- null, atau array [["Toyota","Avanza"], ...]
  created_at  timestamptz not null default now()
);

-- Nyalakan Row Level Security (WAJIB sebelum policy di bawah berlaku)
alter table public.products enable row level security;

-- Siapa saja (termasuk pengunjung situs yang belum login) boleh MEMBACA katalog
create policy "Public read access"
  on public.products
  for select
  using (true);

-- ====== VERSI AMAN: hanya admin yang LOGIN yang boleh tulis ======
-- Tiga policy di bawah ini mensyaratkan auth.role() = 'authenticated',
-- artinya cuma pengguna yang sudah login lewat Supabase Auth (akun
-- admin yang kamu buat sendiri di langkah 5 CARA-SETUP-SUPABASE.md)
-- yang bisa tambah/ubah/hapus produk. Pengunjung biasa (belum login)
-- cuma bisa membaca, sesuai policy "Public read access" di atas.
--
-- PENTING: supaya ini benar-benar aman, matikan pendaftaran akun baru
-- lewat form publik. Di dashboard Supabase: Authentication -> Providers
-- -> Email -> matikan "Allow new users to sign up". Situs ini memang
-- tidak punya form pendaftaran (cuma login), tapi mematikan opsi ini
-- mencegah orang mendaftar langsung lewat API Supabase.

create policy "Authenticated insert access"
  on public.products
  for insert
  to authenticated
  with check (true);

create policy "Authenticated update access"
  on public.products
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated delete access"
  on public.products
  for delete
  to authenticated
  using (true);

