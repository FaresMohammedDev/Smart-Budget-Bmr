-- =====================================================================
--  Smart Budget — Fathalla Market
--  سحب التعديلات على قاعدة البيانات الحالية (Migration Update Script)
--  شغّل هذا الكود في Supabase Dashboard -> SQL Editor
--  لتحديث الجداول الحالية دون الحاجة لمسح الداتابيز أو البدء من الصفر!
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) تحديث الـ Enums
-- ---------------------------------------------------------------------

-- إضافة دور 'cashier' لنوع user_role إن لم يكن موجوداً
do $$
begin
  if not exists (
    select 1 from pg_enum 
    where enumtypid = 'public.user_role'::regtype 
      and enumlabel = 'cashier'
  ) then
    alter type public.user_role add value 'cashier' after 'customer';
  end if;
end $$;

-- إنشاء نوع order_mode للتمييز بين الحساب الذكي والطلب السريع
do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_mode') then
    create type public.order_mode as enum ('smart_budget', 'quick_menu');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2) تعديل جدول الوجبات (meals)
-- ---------------------------------------------------------------------
alter table public.meals
  add column if not exists discount_price numeric(10, 2) check (discount_price is null or (discount_price > 0 and discount_price < price)),
  add column if not exists is_expiring_soon boolean not null default false;

create index if not exists idx_meals_expiring_soon on public.meals (is_expiring_soon);

-- ---------------------------------------------------------------------
-- 3) تعديل جدول الطلبات (orders) لدعم الطلب السريع (E-Commerce)
-- ---------------------------------------------------------------------
alter table public.orders
  add column if not exists order_mode public.order_mode not null default 'smart_budget';

-- جعل الحقول غير إلزامية في حالة الطلب السريع (E-Commerce)
alter table public.orders
  alter column budget drop not null,
  alter column meal_fraction drop not null,
  alter column daily_tdee_total drop not null,
  alter column required_kcal drop not null;

create index if not exists idx_orders_status on public.orders (status);

-- ---------------------------------------------------------------------
-- 4) دوال التحقق من الصلاحيات (Auth Helpers)
-- ---------------------------------------------------------------------
create or replace function public.is_cashier_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role::text in ('admin', 'cashier')
  );
$$;

-- ---------------------------------------------------------------------
-- 5) تحديث View: available_meals (لحساب السعر الفعلي مع الخصم)
-- ---------------------------------------------------------------------
create or replace view public.available_meals
with (security_invoker = true) as
select 
  m.*,
  coalesce(m.discount_price, m.price) as effective_price
from public.meals m
left join public.categories c on c.id = m.category_id
where m.is_available
  and (c.id is null or c.is_active)
  and m.total_kcal > 0
  and not exists (
    select 1
    from public.meal_items mi
    join public.food_items fi on fi.id = mi.food_item_id
    where mi.meal_id = m.id and not fi.is_available
  );

-- ---------------------------------------------------------------------
-- 6) تحديث RLS Policies لتمكين الكاشير من رؤية الطلبات وتأكيد الدفع
-- ---------------------------------------------------------------------
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_staff" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_cashier_or_admin()));

drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_staff" on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_cashier_or_admin()));

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_staff_update" on public.orders
  for update to authenticated
  using ((select public.is_cashier_or_admin()))
  with check ((select public.is_cashier_or_admin()));

drop policy if exists "order_items_select" on public.order_items;
create policy "order_items_select" on public.order_items
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.user_id = (select auth.uid()) or (select public.is_cashier_or_admin()))
  ));

drop policy if exists "order_people_select" on public.order_people;
create policy "order_people_select" on public.order_people
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.user_id = (select auth.uid()) or (select public.is_cashier_or_admin()))
  ));

-- ---------------------------------------------------------------------
-- 7) تحديث دالة إنشاء الأوردر (create_order) لتدعم السريع والذكي
-- ---------------------------------------------------------------------
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
  v_bad_items    int;
  v_total_price  numeric := 0;
  v_total_kcal   numeric := 0;
  v_tdee_total   numeric := 0;
  v_order_id     uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if jsonb_typeof(v_items) is distinct from 'array' or jsonb_array_length(v_items) < 1 then
    raise exception 'INVALID_ITEMS' using errcode = '22023';
  end if;

  -- التأكد من توافر كافة الوجبات المطلوبة
  select count(*) into v_bad_items
  from (
    select (e ->> 'meal_id')::uuid as meal_id, sum((e ->> 'quantity')::int) as qty
    from jsonb_array_elements(v_items) e
    group by 1
  ) r
  left join public.available_meals am on am.id = r.meal_id
  where am.id is null or r.qty is null or r.qty not between 1 and 50;

  if v_bad_items > 0 then
    raise exception 'MEAL_UNAVAILABLE' using errcode = 'P0001';
  end if;

  -- حساب الإجمالي الفعلي من السيرفر (مع احتساب سعر الخصم إن وجد)
  select 
    sum(coalesce(am.discount_price, am.price) * r.qty),
    sum(am.total_kcal * r.qty)
  into v_total_price, v_total_kcal
  from (
    select (e ->> 'meal_id')::uuid as meal_id, sum((e ->> 'quantity')::int) as qty
    from jsonb_array_elements(v_items) e
    group by 1
  ) r
  join public.available_meals am on am.id = r.meal_id;

  -- التحقق من شروط وضع Smart Budget
  if v_mode = 'smart_budget' then
    if v_budget is null or v_budget <= 0 then
      raise exception 'INVALID_BUDGET' using errcode = '22023';
    end if;
    if v_total_price > v_budget then
      raise exception 'BUDGET_EXCEEDED' using errcode = 'P0001';
    end if;
    if jsonb_array_length(v_people) < 1 then
      raise exception 'INVALID_PEOPLE' using errcode = '22023';
    end if;

    select sum(
             public.calc_bmr((p ->> 'gender')::public.gender_type,
                             (p ->> 'weight_kg')::numeric,
                             (p ->> 'height_cm')::numeric,
                             (p ->> 'age')::int)
             * public.activity_multiplier((p ->> 'activity_level')::public.activity_level)
           )
      into v_tdee_total
    from jsonb_array_elements(v_people) p;
  end if;

  -- إنشاء رأس الطلب
  insert into public.orders (
    user_id, group_id, order_mode, people_count, budget, meal_fraction,
    daily_tdee_total, required_kcal, total_kcal, total_price
  ) values (
    v_uid,
    v_group_id,
    v_mode,
    case when v_mode = 'smart_budget' then jsonb_array_length(v_people) else 1 end,
    case when v_mode = 'smart_budget' then v_budget else v_total_price end,
    coalesce(v_fraction, 0.35),
    case when v_mode = 'smart_budget' then round(v_tdee_total, 2) else null end,
    case when v_mode = 'smart_budget' then round(v_tdee_total * coalesce(v_fraction, 0.35), 2) else null end,
    round(v_total_kcal, 2),
    round(v_total_price, 2)
  )
  returning id into v_order_id;

  -- إدراج تفاصيل الوجبات ومكوناتها
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

  -- إدراج بيانات الأفراد وحصصهم في حالة Smart Budget
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

-- ---------------------------------------------------------------------
-- 8) دالة تأكيد دفع الكاشير (mark_order_as_paid)
-- ---------------------------------------------------------------------
create or replace function public.mark_order_as_paid(p_order_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
begin
  if not public.is_cashier_or_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

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

grant execute on function public.create_order(jsonb) to authenticated;
grant execute on function public.mark_order_as_paid(uuid) to authenticated;
grant select on public.available_meals to anon, authenticated;

-- ---------------------------------------------------------------------
-- 9) تحديث سياسات قراءة الوجبات لتمكين الجميع والأدمن من رؤية الوجبات
-- ---------------------------------------------------------------------
drop policy if exists "meals_select" on public.meals;
create policy "meals_select" on public.meals
  for select to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------
-- 9.1) جداول وسياسات المجموعات المحفوظة (Saved Groups & Members)
-- ---------------------------------------------------------------------
create table if not exists public.saved_groups (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 60),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.group_members (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid not null references public.saved_groups (id) on delete cascade,
  name            text not null check (char_length(trim(name)) between 1 and 60),
  age             smallint not null check (age between 10 and 100),
  gender          public.gender_type not null,
  height_cm       numeric(5, 1) not null check (height_cm between 100 and 250),
  weight_kg       numeric(5, 1) not null check (weight_kg between 25 and 300),
  activity_level  public.activity_level not null,
  sort_order      smallint not null default 0,
  created_at      timestamptz not null default now()
);

alter table public.saved_groups enable row level security;
alter table public.group_members enable row level security;

drop policy if exists "saved_groups_owner" on public.saved_groups;
create policy "saved_groups_owner" on public.saved_groups
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "group_members_owner" on public.group_members;
create policy "group_members_owner" on public.group_members
  for all to authenticated
  using (exists (
    select 1 from public.saved_groups g
    where g.id = group_id and g.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.saved_groups g
    where g.id = group_id and g.user_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------
-- 10) إدراج الأصناف والوجبات الأولية الأساسية في قاعدة البيانات (Seed Data)
-- ---------------------------------------------------------------------
insert into public.categories (name_ar, name_en, slug, sort_order) values
  ('ساندوتشات',   'Sandwiches', 'sandwiches', 1),
  ('صواني',       'Trays',      'trays',      2),
  ('مشويات',      'Grills',     'grills',     3),
  ('أطباق جانبية', 'Sides',      'sides',      4),
  ('مشروبات',     'Drinks',     'drinks',     5)
on conflict (slug) do nothing;

insert into public.food_items (name_ar, name_en, unit, kcal_per_unit) values
  ('عيش سوري',          'Syrian Bread',      'piece', 200),
  ('عيش بلدي',          'Baladi Bread',      'piece', 250),
  ('شاورما فراخ',       'Chicken Shawarma',  'g',     2.0),
  ('كفتة مشوية',        'Grilled Kofta',     'g',     2.8),
  ('كبدة إسكندراني',    'Alexandrian Liver', 'g',     1.7),
  ('طعمية',             'Falafel',           'piece', 60),
  ('فراخ مشوية',        'Grilled Chicken',   'g',     2.0),
  ('أرز أبيض',          'White Rice',        'g',     1.3),
  ('مكرونة قلم',        'Penne Pasta',       'g',     1.6),
  ('صوص بشاميل',        'Bechamel Sauce',    'g',     1.4),
  ('لحمة مفرومة',       'Minced Beef',       'g',     2.5),
  ('جبنة موتزاريلا',    'Mozzarella',        'g',     3.0),
  ('بطاطس محمرة',       'French Fries',      'g',     3.1),
  ('سلطة خضراء',        'Green Salad',       'g',     0.2),
  ('طحينة',             'Tahini Sauce',      'g',     3.0),
  ('ثومية',             'Garlic Sauce',      'g',     4.5),
  ('مخلل',              'Pickles',           'g',     0.1),
  ('فول مدمس',          'Foul Medames',      'g',     1.1),
  ('مياه معدنية',       'Mineral Water',     'piece', 0.01),
  ('مشروب غازي',        'Soft Drink',        'piece', 140)
on conflict (name_en) do nothing;

insert into public.meals (category_id, name_ar, name_en, price, discount_price, is_expiring_soon, is_available, total_kcal, kind, portion_type, servings)
select 
  c.id, 
  v.name_ar, 
  v.name_en, 
  v.price, 
  v.disc_price, 
  v.exp_soon, 
  true, 
  v.kcal, 
  v.kind::public.meal_kind, 
  v.portion::public.portion_type, 
  v.servings
from (values
  ('sandwiches', 'ساندوتش شاورما فراخ',        'Chicken Shawarma Sandwich',   85,  null, false, 550,  'main',  'individual', 1),
  ('sandwiches', 'ساندوتش كفتة',               'Kofta Sandwich',              95,  null, false, 620,  'main',  'individual', 1),
  ('sandwiches', 'ساندوتش كبدة إسكندراني',     'Alexandrian Liver Sandwich',  60,  null, false, 480,  'main',  'individual', 1),
  ('sandwiches', 'ساندوتش طعمية',              'Falafel Sandwich',            25,  null, false, 350,  'main',  'individual', 1),
  ('trays',      'صينية مكرونة بشاميل عائلي',  'Family Bechamel Pasta Tray',  320, 260,  true,  2800, 'main',  'shareable',  4),
  ('trays',      'صينية مكرونة بشاميل صغيرة',  'Small Bechamel Pasta Tray',   170, 140,  true,  1400, 'main',  'shareable',  2),
  ('grills',     'ربع فرخة مشوية بالأرز',       'Quarter Grilled Chicken',     160, null, false, 850,  'main',  'individual', 1),
  ('grills',     'نص فرخة مشوية بالأرز',        'Half Grilled Chicken',        260, 220,  true,  1310, 'main',  'individual', 1),
  ('grills',     'صينية مشويات مشكلة عائلي',    'Family Mixed Grill Tray',     750, null, false, 3600, 'main',  'shareable',  5),
  ('sides',      'بطاطس محمرة',                'French Fries Box',            35,  null, false, 400,  'side',  'individual', 1),
  ('sides',      'سلطة خضراء',                 'Green Salad Plate',           20,  null, false, 80,   'side',  'individual', 1),
  ('sides',      'سلطة طحينة',                 'Tahini Salad Plate',          20,  null, false, 150,  'side',  'individual', 1),
  ('sides',      'طبق فول بالعيش',             'Foul Plate with Bread',       25,  null, false, 380,  'side',  'individual', 1),
  ('drinks',     'مياه معدنية',                'Mineral Water Bottle',        10,  null, false, 0,    'drink', 'individual', 1),
  ('drinks',     'مشروب غازي',                 'Soft Drink Can',              20,  null, false, 140,  'drink', 'individual', 1)
) as v(cat, name_ar, name_en, price, disc_price, exp_soon, kcal, kind, portion, servings)
join public.categories c on c.slug = v.cat
on conflict (name_en) do update set
  price = excluded.price,
  discount_price = excluded.discount_price,
  is_expiring_soon = excluded.is_expiring_soon,
  total_kcal = excluded.total_kcal,
  is_available = true;
