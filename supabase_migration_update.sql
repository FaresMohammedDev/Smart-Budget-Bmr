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
    where id = auth.uid() and role in ('admin', 'cashier')
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
-- 9) تحديث بعض الوجبات لتمييزها كعروض قرب انتهاء الصلاحية
-- ---------------------------------------------------------------------
update public.meals
   set discount_price = 260, is_expiring_soon = true
 where name_en = 'Family Bechamel Pasta Tray';

update public.meals
   set discount_price = 140, is_expiring_soon = true
 where name_en = 'Small Bechamel Pasta Tray';

update public.meals
   set discount_price = 220, is_expiring_soon = true
 where name_en = 'Half Grilled Chicken';
