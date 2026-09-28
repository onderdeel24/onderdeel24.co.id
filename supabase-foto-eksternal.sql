-- ============================================================
-- ONDERDEEL24 — penyimpanan foto produk eksternal (Supabase Storage)
-- Jalankan SEKALI di: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Aman dijalankan ulang (idempotent). Data produk yang sudah ada tidak diubah.
-- ============================================================

-- 1. Kolom untuk menyimpan URL foto di tiap produk
alter table public.products add column if not exists image text;

-- 2. Bucket publik "product-images" (foto bisa dilihat siapa saja lewat URL)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 3. Hanya admin yang login yang boleh unggah / ganti / hapus foto.
--    (Membaca foto lewat URL publik tidak butuh policy.)
drop policy if exists "Authenticated upload product images" on storage.objects;
create policy "Authenticated upload product images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images');

drop policy if exists "Authenticated update product images" on storage.objects;
create policy "Authenticated update product images"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images')
  with check (bucket_id = 'product-images');

drop policy if exists "Authenticated delete product images" on storage.objects;
create policy "Authenticated delete product images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images');
