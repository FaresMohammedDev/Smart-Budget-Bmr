-- Apply once to the team's EXISTING Supabase schema after the older setup scripts.
-- This migration preserves the prototype's guest/staff access policies.
-- It does not seed, delete or overwrite the team's menu.
begin;
alter table public.order_people add column if not exists sort_order integer not null default 0;
alter table public.orders add column if not exists request_id uuid;
create unique index if not exists orders_request_id_unique on public.orders(request_id);
alter table public.orders alter column user_id drop not null;
alter table public.orders alter column meal_fraction drop not null;
alter table public.orders alter column daily_tdee_total drop not null;
alter table public.orders alter column required_kcal drop not null;

create or replace view public.available_meals with (security_invoker = true) as
select m.*, coalesce(m.discount_price, m.price) as effective_price
from public.meals m left join public.categories c on c.id = m.category_id
where m.is_available and (c.id is null or c.is_active) and m.total_kcal >= 0
and not exists (select 1 from public.meal_items mi join public.food_items fi on fi.id = mi.food_item_id where mi.meal_id = m.id and not fi.is_available);

create or replace function public.create_order(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid := coalesce(nullif(p_payload ->> 'request_id', '')::uuid, gen_random_uuid());
  v_existing uuid;
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
  perform pg_advisory_xact_lock(hashtextextended(v_request_id::text, 0));
  select id into v_existing from public.orders where request_id = v_request_id;
  if found then return v_existing; end if;
  if jsonb_typeof(v_items) is distinct from 'array' or jsonb_array_length(v_items) < 1 then
    raise exception 'INVALID_ITEMS' using errcode = '22023';
  end if;

  if exists (select 1 from jsonb_array_elements(v_items) e
      where (e->>'quantity') is null or (e->>'quantity')::numeric <> trunc((e->>'quantity')::numeric)
      or (e->>'quantity')::numeric not between 1 and 100) then
    raise exception 'INVALID_QUANTITY';
  end if;
  -- Hold meal snapshots stable while validating prices and availability.
  perform 1 from public.meals m where m.id in (select (e->>'meal_id')::uuid from jsonb_array_elements(v_items) e) for share;
  if exists (
    select 1 from (select (e->>'meal_id')::uuid id, sum((e->>'quantity')::int) qty from jsonb_array_elements(v_items) e group by 1) r
    left join public.available_meals m on m.id = r.id where m.id is null or r.qty not between 1 and 100
  ) then raise exception 'MEAL_UNAVAILABLE'; end if;
  if v_mode = 'smart_budget' then
    if v_budget is null or v_budget <= 0 or v_fraction is null or v_fraction not in (0.25, 0.4, 0.3, 0.15)
      or jsonb_typeof(v_people) is distinct from 'array' or jsonb_array_length(v_people) not between 1 and 30 then
      raise exception 'INVALID_PLAN';
    end if;
    if exists (select 1 from jsonb_array_elements(v_people) p where
      coalesce((p->>'age')::numeric, 0) not between 10 and 100 or
      coalesce((p->>'height_cm')::numeric, 0) not between 100 and 250 or
      coalesce((p->>'weight_kg')::numeric, 0) not between 25 and 300 or
      coalesce(p->>'gender', '') not in ('male', 'female') or
      coalesce(p->>'activity_level', '') not in ('sedentary','light','moderate','active','very_active')) then
      raise exception 'INVALID_PEOPLE';
    end if;
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

  if p_payload ? 'expected_total' and round((p_payload->>'expected_total')::numeric, 2) <> round(v_total_price, 2) then raise exception 'PRICE_CHANGED'; end if;
  if v_mode = 'smart_budget' and v_total_price > v_budget then raise exception 'BUDGET_EXCEEDED'; end if;

  if v_mode = 'smart_budget' and jsonb_array_length(v_people) > 0 then
    select coalesce(sum(
             round(public.calc_bmr((p ->> 'gender')::public.gender_type,
                             (p ->> 'weight_kg')::numeric,
                             (p ->> 'height_cm')::numeric,
                             (p ->> 'age')::int)
             * public.activity_multiplier((p ->> 'activity_level')::public.activity_level), 2)
           ), 0)
      into v_tdee_total
    from jsonb_array_elements(v_people) p;
  end if;

  insert into public.orders (
    request_id, user_id, group_id, order_mode, people_count, budget, meal_fraction,
    daily_tdee_total, required_kcal, total_kcal, total_price, status
  ) values (
    v_request_id, v_uid,
    v_group_id,
    v_mode,
    case when v_mode = 'smart_budget' then greatest(jsonb_array_length(v_people), 1) else 1 end,
    case when v_mode = 'smart_budget' then coalesce(v_budget, v_total_price) else v_total_price end,
    case when v_mode = 'smart_budget' then v_fraction else null end,
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
      order_id, sort_order, name, age, gender, height_cm, weight_kg, activity_level,
      bmr, tdee, target_kcal, share_percent, share_kcal, share_details
    )
    select
      v_order_id, ordinality,
      trim(p ->> 'name'),
      (p ->> 'age')::smallint,
      (p ->> 'gender')::public.gender_type,
      (p ->> 'height_cm')::numeric,
      (p ->> 'weight_kg')::numeric,
      (p ->> 'activity_level')::public.activity_level,
      x.bmr,
      round(x.bmr * x.mult, 2),
      round(round(x.bmr * x.mult, 2) * v_fraction, 2),
      coalesce((p ->> 'share_percent')::numeric, 0),
      coalesce((p ->> 'share_kcal')::numeric, 0),
      coalesce(p -> 'share_details', '[]'::jsonb)
    from jsonb_array_elements(v_people) with ordinality as input(p, ordinality)
    cross join lateral (
      select
        public.calc_bmr((p ->> 'gender')::public.gender_type,
                        (p ->> 'weight_kg')::numeric,
                        (p ->> 'height_cm')::numeric,
                        (p ->> 'age')::int) as bmr,
        public.activity_multiplier((p ->> 'activity_level')::public.activity_level) as mult
    ) x;
  end if;

  if v_mode = 'smart_budget' then
    with ratios as (
      select p.id, p.sort_order, p.tdee / nullif(sum(p.tdee) over (), 0) as ratio
      from public.order_people p where p.order_id = v_order_id
    ), quotas as (
      select r.id person_id, r.sort_order, r.ratio, i.id item_id, i.meal_name_ar, i.portion_type, i.quantity, i.unit_kcal,
        case when i.portion_type::text = 'shareable' then i.unit_kcal * i.quantity * r.ratio else i.quantity * r.ratio end as quota
      from ratios r cross join public.order_items i where i.order_id = v_order_id
    ), ranked as (
      select *, row_number() over (partition by item_id order by quota - floor(quota) desc, sort_order, person_id) rank,
        sum(floor(quota)) over (partition by item_id) assigned from quotas
    ), allocated as (
      select *, floor(quota) + case when rank <=
        (case when portion_type::text = 'shareable' then round(unit_kcal * quantity) else quantity end) - assigned
        then 1 else 0 end as units from ranked
    ), details as (
      select person_id, max(ratio) ratio,
        sum(case when portion_type::text = 'shareable' then units else units * unit_kcal end) kcal,
        jsonb_agg(jsonb_build_object('meal_name_ar', meal_name_ar, 'portion_description',
          case when portion_type::text = 'shareable' then round(ratio * 100)::text || '% من ' || meal_name_ar || ' (' || units::text || ' سعرة)'
          else units::text || ' × ' || meal_name_ar || ' (' || (units * unit_kcal)::text || ' سعرة)' end)
          order by item_id) filter (where units > 0) share_details
      from allocated group by person_id
    ) update public.order_people p set share_percent = round(d.ratio * 100, 1), share_kcal = d.kcal,
      share_details = coalesce(d.share_details, '[]'::jsonb) from details d where p.id = d.person_id;
  end if;
  return v_order_id;
end;
$$;


create or replace function public.mark_order_as_paid(p_order_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status::text = 'cancelled' then raise exception 'ORDER_CANCELLED'; end if;
  if v_order.status::text <> 'paid' then
    update public.orders set status = 'paid', paid_at = now() where id = p_order_id returning * into v_order;
  end if;
  return json_build_object('order_id', v_order.id, 'status', v_order.status, 'paid_at', v_order.paid_at);
end;
$$;

-- Group and member writes succeed or roll back together.
create or replace function public.save_group(p_name text, p_people jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare v_group uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if char_length(trim(p_name)) not between 1 and 60 or jsonb_typeof(p_people) is distinct from 'array'
    or jsonb_array_length(p_people) not between 1 and 30 then raise exception 'INVALID_GROUP'; end if;
  insert into public.saved_groups(user_id, name) values (auth.uid(), trim(p_name)) returning id into v_group;
  insert into public.group_members(group_id, name, age, gender, height_cm, weight_kg, activity_level, sort_order)
  select v_group, trim(p->>'name'), (p->>'age')::smallint, (p->>'gender')::public.gender_type,
    (p->>'height_cm')::numeric, (p->>'weight_kg')::numeric, (p->>'activity_level')::public.activity_level, ordinality
  from jsonb_array_elements(p_people) with ordinality as entries(p, ordinality);
  return v_group;
end;
$$;
grant execute on function public.create_order(jsonb) to anon, authenticated;
grant execute on function public.mark_order_as_paid(uuid) to anon, authenticated;
grant execute on function public.save_group(text, jsonb) to authenticated;
commit;
