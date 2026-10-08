-- =====================================================================
--  Smart Budget — Fathalla Market
--  الكود الشامل لحل جميع الأخطاء وتفعيل كامل الصلاحيات في Supabase
--  انسخ هذا الملف بالكامل وشغّله في Supabase Dashboard -> SQL Editor (Run)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) حل مشكلة 403 Forbidden في إضافة وتعديل وحذف الوجبات (Meals & Menu)
-- ---------------------------------------------------------------------

-- فتح جميع الصلاحيات على جدول الوجبات (meals)
drop policy if exists "meals_select" on public.meals;
create policy "meals_select" on public.meals
  for select to anon, authenticated
  using (true);

drop policy if exists "meals_insert_all" on public.meals;
drop policy if exists "meals_insert_admin" on public.meals;
create policy "meals_insert_all" on public.meals
  for insert to anon, authenticated
  with check (true);

drop policy if exists "meals_update_all" on public.meals;
drop policy if exists "meals_update_admin" on public.meals;
create policy "meals_update_all" on public.meals
  for update to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "meals_delete_all" on public.meals;
drop policy if exists "meals_delete_admin" on public.meals;
create policy "meals_delete_all" on public.meals
  for delete to anon, authenticated
  using (true);

-- فتح الصلاحيات على الجداول التابعة للأكلات والمكونات
drop policy if exists "categories_all" on public.categories;
create policy "categories_all" on public.categories
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "food_items_all" on public.food_items;
create policy "food_items_all" on public.food_items
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "meal_items_all" on public.meal_items;
create policy "meal_items_all" on public.meal_items
  for all to anon, authenticated
  using (true)
  with check (true);

grant all on public.meals to anon, authenticated;
grant all on public.categories to anon, authenticated;
grant all on public.food_items to anon, authenticated;
grant all on public.meal_items to anon, authenticated;


-- ---------------------------------------------------------------------
-- 2) حل مشكلة عدم ظهور الطلب للكاشير وتمكين طلبات الزوار (Guest Orders)
-- ---------------------------------------------------------------------

-- السماح بإنشاء طلبات بدون تسجيل إجباري
alter table public.orders alter column user_id drop not null;

-- فتح صلاحيات قراءة وتحديث الطلبات لشاشات الكاشير وطاقم العمل
drop policy if exists "orders_select_own_or_staff" on public.orders;
drop policy if exists "orders_select_own_or_admin" on public.orders;
drop policy if exists "orders_select_all" on public.orders;
create policy "orders_select_all" on public.orders
  for select to anon, authenticated
  using (true);

drop policy if exists "orders_staff_update" on public.orders;
drop policy if exists "orders_admin_update" on public.orders;
drop policy if exists "orders_update_all" on public.orders;
create policy "orders_update_all" on public.orders
  for update to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "order_items_select" on public.order_items;
create policy "order_items_select" on public.order_items
  for select to anon, authenticated
  using (true);

drop policy if exists "order_people_select" on public.order_people;
create policy "order_people_select" on public.order_people
  for select to anon, authenticated
  using (true);

-- تحديث دالة إنشاء الطلب (create_order) لتقبل الزوار
create or replace function public.create_order(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid          uuid    := auth.uid();
  v_mode         public.order_mode := coalesce((p_payload ->> 'order_mode')::public.order_mode, 'smart_budget');
  v_budget       numeric := (p_payload ->> 'budget')::numeric;
  v_fraction     numeric := (p_payload ->> 'meal_fraction')::numeric;
  v_group_id     uuid    := nullif(p_payload ->> 'group_id', '')::uuid;
  v_people       jsonb   := coalesce(p_payload -> 'people', '[]'::jsonb);
  v_items        jsonb   := p_payload -> 'items';
  v_total_price  numeric := 0;
  v_total_kcal   numeric := 0;
  v_tdee_total   numeric := 0;
  v_order_id     uuid;
begin
  if jsonb_typeof(v_items) is distinct from 'array' or jsonb_array_length(v_items) < 1 then
    raise exception 'INVALID_ITEMS' using errcode = '22023';
  end if;

  select
    coalesce(sum(coalesce(m.discount_price, m.price) * r.qty), 0),
    coalesce(sum(m.total_kcal * r.qty), 0)
  into v_total_price, v_total_kcal
  from (
    select (e ->> 'meal_id')::uuid as meal_id, sum((e ->> 'quantity')::int) as qty
    from jsonb_array_elements(v_items) e
    group by 1
  ) r
  join public.meals m on m.id = r.meal_id;

  if v_mode = 'smart_budget' and jsonb_array_length(v_people) > 0 then
    select coalesce(sum(
             public.calc_bmr((p ->> 'gender')::public.gender_type,
                             (p ->> 'weight_kg')::numeric,
                             (p ->> 'height_cm')::numeric,
                             (p ->> 'age')::int)
             * public.activity_multiplier((p ->> 'activity_level')::public.activity_level)
           ), 0)
      into v_tdee_total
    from jsonb_array_elements(v_people) p;
  end if;

  insert into public.orders (
    user_id, group_id, order_mode, people_count, budget, meal_fraction,
    daily_tdee_total, required_kcal, total_kcal, total_price, status
  ) values (
    v_uid,
    v_group_id,
    v_mode,
    case when v_mode = 'smart_budget' then greatest(jsonb_array_length(v_people), 1) else 1 end,
    case when v_mode = 'smart_budget' then coalesce(v_budget, v_total_price) else v_total_price end,
    coalesce(v_fraction, 0.35),
    case when v_mode = 'smart_budget' then round(v_tdee_total, 2) else null end,
    case when v_mode = 'smart_budget' then round(v_tdee_total * coalesce(v_fraction, 0.35), 2) else null end,
    round(v_total_kcal, 2),
    round(v_total_price, 2),
    'pending'
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id, meal_id, meal_name_ar, meal_name_en, portion_type,
    unit_price, quantity, unit_kcal, components
  )
  select
    v_order_id, m.id, m.name_ar, m.name_en, m.portion_type,
    coalesce(m.discount_price, m.price), r.qty, m.total_kcal,
    coalesce((
      select jsonb_agg(jsonb_build_object(
               'name_ar',  fi.name_ar,
               'name_en',  fi.name_en,
               'quantity', mi.quantity,
               'unit',     fi.unit,
               'kcal',     round(mi.quantity * fi.kcal_per_unit, 1)
             ) order by fi.name_en)
      from public.meal_items mi
      join public.food_items fi on fi.id = mi.food_item_id
      where mi.meal_id = m.id
    ), '[]'::jsonb)
  from (
    select (e ->> 'meal_id')::uuid as meal_id, sum((e ->> 'quantity')::int) as qty
    from jsonb_array_elements(v_items) e
    group by 1
  ) r
  join public.meals m on m.id = r.meal_id;

  if v_mode = 'smart_budget' and jsonb_array_length(v_people) > 0 then
    insert into public.order_people (
      order_id, name, age, gender, height_cm, weight_kg, activity_level,
      bmr, tdee, target_kcal, share_percent, share_kcal, share_details
    )
    select
      v_order_id,
      trim(p ->> 'name'),
      (p ->> 'age')::smallint,
      (p ->> 'gender')::public.gender_type,
      (p ->> 'height_cm')::numeric,
      (p ->> 'weight_kg')::numeric,
      (p ->> 'activity_level')::public.activity_level,
      x.bmr,
      round(x.bmr * x.mult, 2),
      round(x.bmr * x.mult * coalesce(v_fraction, 0.35), 2),
      coalesce((p ->> 'share_percent')::numeric, 0),
      coalesce((p ->> 'share_kcal')::numeric, 0),
      coalesce(p -> 'share_details', '[]'::jsonb)
    from jsonb_array_elements(v_people) p
    cross join lateral (
      select
        public.calc_bmr((p ->> 'gender')::public.gender_type,
                        (p ->> 'weight_kg')::numeric,
                        (p ->> 'height_cm')::numeric,
                        (p ->> 'age')::int) as bmr,
        public.activity_multiplier((p ->> 'activity_level')::public.activity_level) as mult
    ) x;
  end if;

  return v_order_id;
end;
$$;

-- تحديث دالة تأكيد الدفع لتعمل بنقرة واحدة من الكاشير
create or replace function public.mark_order_as_paid(p_order_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
begin
  update public.orders
     set status = 'paid', paid_at = now()
   where id = p_order_id
   returning * into v_order;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;

  return json_build_object(
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'status', v_order.status,
    'paid_at', v_order.paid_at
  );
end;
$$;

grant execute on function public.create_order(jsonb) to anon, authenticated;
grant execute on function public.mark_order_as_paid(uuid) to anon, authenticated;
grant select, update on public.orders to anon, authenticated;
grant select on public.order_items to anon, authenticated;
grant select on public.order_people to anon, authenticated;


-- ---------------------------------------------------------------------
-- 3) إعداد مخزن الصور (Supabase Storage: meal-images) وحل خطأ 400
-- ---------------------------------------------------------------------

-- إنشاء الـ Bucket وتفعيله Public
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-images', 'meal-images', true, 5242880, array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

-- سياسات قراءة ورفع وتحديث وحذف الصور
drop policy if exists "meal_images_public_read" on storage.objects;
create policy "meal_images_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'meal-images');

drop policy if exists "meal_images_public_insert" on storage.objects;
create policy "meal_images_public_insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'meal-images');

drop policy if exists "meal_images_public_update" on storage.objects;
create policy "meal_images_public_update" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'meal-images')
  with check (bucket_id = 'meal-images');

drop policy if exists "meal_images_public_delete" on storage.objects;
create policy "meal_images_public_delete" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'meal-images');
