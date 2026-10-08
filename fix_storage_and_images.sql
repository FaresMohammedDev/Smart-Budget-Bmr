-- =====================================================================
--  Smart Budget — Fathalla Market
--  إعداد مخزن الصور (Supabase Storage: meal-images) وحل مشكلة 400 Bad Request
--  شغّل هذا الكود في Supabase Dashboard -> SQL Editor
-- =====================================================================

-- 1) إنشاء الـ Bucket المسمى meal-images وتفعيله كـ Public
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-images', 'meal-images', true, 5242880, array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

-- 2) تفعيل سياسات الأمان للقراءة العامة للصور
drop policy if exists "meal_images_public_read" on storage.objects;
create policy "meal_images_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'meal-images');

-- 3) السماح برفع الصور لجميع المستخدمين (الأدمن وطاقم العمل)
drop policy if exists "meal_images_public_insert" on storage.objects;
create policy "meal_images_public_insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'meal-images');

-- 4) السماح بتعديل وتحديث الصور
drop policy if exists "meal_images_public_update" on storage.objects;
create policy "meal_images_public_update" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'meal-images')
  with check (bucket_id = 'meal-images');

-- 5) السماح بحذف الصور
drop policy if exists "meal_images_public_delete" on storage.objects;
create policy "meal_images_public_delete" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'meal-images');
