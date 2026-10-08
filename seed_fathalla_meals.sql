-- =====================================================================
--  Smart Budget — Fathalla Market
--  كود إدراج الوجبات والأصناف وتحديث الصلاحيات (Seed Data Only)
--  شغّل هذا الكود في Supabase SQL Editor مباشرة
-- =====================================================================

-- 1) التأكد من فتح صلاحية قراءة الوجبات للجميع (كيوسك وزوار وأدمن)
drop policy if exists "meals_select" on public.meals;
create policy "meals_select" on public.meals
  for select to anon, authenticated
  using (true);

-- 2) التأكد من وجود جدولي المجموعات المحفوظة وسياسات الأمان
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

-- 3) إدراج أقسام المنيو (Categories)
insert into public.categories (name_ar, name_en, slug, sort_order, is_active) values
  ('ساندوتشات',    'Sandwiches', 'sandwiches', 1, true),
  ('صواني',        'Trays',      'trays',      2, true),
  ('مشويات',       'Grills',     'grills',     3, true),
  ('أطباق جانبية', 'Sides',      'sides',      4, true),
  ('مشروبات',      'Drinks',     'drinks',     5, true)
on conflict (slug) do update set
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  is_active = true;

-- 4) إدراج المكونات والأصناف الخام (Food Items)
insert into public.food_items (name_ar, name_en, unit, kcal_per_unit, is_available) values
  ('عيش سوري',          'Syrian Bread',      'piece', 200,  true),
  ('عيش بلدي',          'Baladi Bread',      'piece', 250,  true),
  ('شاورما فراخ',       'Chicken Shawarma',  'g',     2.0,  true),
  ('كفتة مشوية',        'Grilled Kofta',     'g',     2.8,  true),
  ('كبدة إسكندراني',    'Alexandrian Liver', 'g',     1.7,  true),
  ('طعمية',             'Falafel',           'piece', 60,   true),
  ('فراخ مشوية',        'Grilled Chicken',   'g',     2.0,  true),
  ('أرز أبيض',          'White Rice',        'g',     1.3,  true),
  ('مكرونة قلم',        'Penne Pasta',       'g',     1.6,  true),
  ('صوص بشاميل',        'Bechamel Sauce',    'g',     1.4,  true),
  ('لحمة مفرومة',       'Minced Beef',       'g',     2.5,  true),
  ('جبنة موتزاريلا',    'Mozzarella',        'g',     3.0,  true),
  ('بطاطس محمرة',       'French Fries',      'g',     3.1,  true),
  ('سلطة خضراء',        'Green Salad',       'g',     0.2,  true),
  ('طحينة',             'Tahini Sauce',      'g',     3.0,  true),
  ('ثومية',             'Garlic Sauce',      'g',     4.5,  true),
  ('مخلل',              'Pickles',           'g',     0.1,  true),
  ('فول مدمس',          'Foul Medames',      'g',     1.1,  true),
  ('مياه معدنية',       'Mineral Water',     'piece', 0.01, true),
  ('مشروب غازي',        'Soft Drink',        'piece', 140,  true)
on conflict (name_en) do update set
  name_ar = excluded.name_ar,
  kcal_per_unit = excluded.kcal_per_unit,
  is_available = true;

-- 5) إدراج الوجبات الجاهزة الكاملة لفتح الله (Meals)
insert into public.meals (
  category_id, name_ar, name_en, description_ar, price, discount_price, 
  is_expiring_soon, is_available, total_kcal, kind, portion_type, servings, image_url
)
select 
  c.id, 
  v.name_ar, 
  v.name_en,
  v.desc_ar,
  v.price, 
  v.disc_price, 
  v.exp_soon, 
  true, 
  v.kcal, 
  v.kind::public.meal_kind, 
  v.portion::public.portion_type, 
  v.servings,
  '/images/meal-placeholder.svg'
from (values
  ('sandwiches', 'ساندوتش شاورما فراخ',        'Chicken Shawarma Sandwich',   'شاورما فراخ طازجة بتتبيلة فتح الله مع الثومية في عيش سوري محمص', 85,  null, false, 550,  'main',  'individual', 1),
  ('sandwiches', 'ساندوتش كفتة',               'Kofta Sandwich',              'كفتة بلدي مشوية على الفحم مع سلطة طحينة في عيش بلدي طازج',        95,  null, false, 620,  'main',  'individual', 1),
  ('sandwiches', 'ساندوتش كبدة إسكندراني',     'Alexandrian Liver Sandwich',  'كبدة إسكندراني متبلة بالفلفل الحار والليمون والخل والثوم',        60,  null, false, 480,  'main',  'individual', 1),
  ('sandwiches', 'ساندوتش طعمية',              'Falafel Sandwich',            'ساندوتش طعمية سخنة مقرمشة بالسلطة والطحينة',                     25,  null, false, 350,  'main',  'individual', 1),
  ('trays',      'صينية مكرونة بشاميل عائلي',  'Family Bechamel Pasta Tray',  'صينية مكرونة بشاميل غنية باللحمة المفرومة والجبنة تكفي 4 أفراد', 320, 260,  true,  2800, 'main',  'shareable',  4),
  ('trays',      'صينية مكرونة بشاميل صغيرة',  'Small Bechamel Pasta Tray',   'صينية مكرونة بشاميل دافئة تكفي شخصين',                           170, 140,  true,  1400, 'main',  'shareable',  2),
  ('grills',     'ربع فرخة مشوية بالأرز',       'Quarter Grilled Chicken',     'ربع فرخة مشوية متبلة مع أرز بسمتي أبيض وسلطة',                   160, null, false, 850,  'main',  'individual', 1),
  ('grills',     'نص فرخة مشوية بالأرز',        'Half Grilled Chicken',        'نصف فرخة مشوية على الفحم مع أرز بسمتي وسلطات',                   260, 220,  true,  1310, 'main',  'individual', 1),
  ('grills',     'صينية مشويات مشكلة عائلي',    'Family Mixed Grill Tray',     'مشكل كفتة وشيش وفراخ مشوية تكفي 5 أفراد مع أرز وسلطات',         750, null, false, 3600, 'main',  'shareable',  5),
  ('sides',      'بطاطس محمرة',                'French Fries Box',            'علبة بطاطس مقلية ذهبية مقرمشة',                                  35,  null, false, 400,  'side',  'individual', 1),
  ('sides',      'سلطة خضراء',                 'Green Salad Plate',           'سلطة بلدي طازجة بالخيار والطماطم والخضروات',                     20,  null, false, 80,   'side',  'individual', 1),
  ('sides',      'سلطة طحينة',                 'Tahini Salad Plate',          'طبق سلطة طحينة سمسم بيضاء متبلة بالليمون والكمون',               20,  null, false, 150,  'side',  'individual', 1),
  ('sides',      'طبق فول بالعيش',             'Foul Plate with Bread',       'طبق فول مدمس بالزيت الحار والليمون مع 2 رغيف بلدي',              25,  null, false, 380,  'side',  'individual', 1),
  ('drinks',     'مياه معدنية',                'Mineral Water Bottle',        'زجاجة مياه معدنية طبيعية 600 مل',                                10,  null, false, 0,    'drink', 'individual', 1),
  ('drinks',     'مشروب غازي',                 'Soft Drink Can',              'كانز مشروب غازي منعش 330 مل',                                    20,  null, false, 140,  'drink', 'individual', 1)
) as v(cat, name_ar, name_en, desc_ar, price, disc_price, exp_soon, kcal, kind, portion, servings)
join public.categories c on c.slug = v.cat
on conflict (name_en) do update set
  category_id = excluded.category_id,
  name_ar = excluded.name_ar,
  description_ar = excluded.description_ar,
  price = excluded.price,
  discount_price = excluded.discount_price,
  is_expiring_soon = excluded.is_expiring_soon,
  total_kcal = excluded.total_kcal,
  kind = excluded.kind,
  portion_type = excluded.portion_type,
  servings = excluded.servings,
  is_available = true;

-- 6) ربط مكونات كل وجبة (Meal Items) لحساب السعرات وتفاصيل البون
insert into public.meal_items (meal_id, food_item_id, quantity)
select m.id, fi.id, rel.qty
from (values
  ('Chicken Shawarma Sandwich', 'Syrian Bread', 1),
  ('Chicken Shawarma Sandwich', 'Chicken Shawarma', 150),
  ('Chicken Shawarma Sandwich', 'Garlic Sauce', 30),
  ('Kofta Sandwich', 'Baladi Bread', 1),
  ('Kofta Sandwich', 'Grilled Kofta', 130),
  ('Kofta Sandwich', 'Tahini Sauce', 25),
  ('Alexandrian Liver Sandwich', 'Baladi Bread', 1),
  ('Alexandrian Liver Sandwich', 'Alexandrian Liver', 120),
  ('Falafel Sandwich', 'Baladi Bread', 1),
  ('Falafel Sandwich', 'Falafel', 3),
  ('Family Bechamel Pasta Tray', 'Penne Pasta', 500),
  ('Family Bechamel Pasta Tray', 'Minced Beef', 400),
  ('Family Bechamel Pasta Tray', 'Bechamel Sauce', 400),
  ('Family Bechamel Pasta Tray', 'Mozzarella', 150),
  ('Quarter Grilled Chicken', 'Grilled Chicken', 250),
  ('Quarter Grilled Chicken', 'White Rice', 200),
  ('French Fries Box', 'French Fries', 130),
  ('Green Salad Plate', 'Green Salad', 200),
  ('Tahini Salad Plate', 'Tahini Sauce', 50),
  ('Foul Plate with Bread', 'Foul Medames', 200),
  ('Foul Plate with Bread', 'Baladi Bread', 2),
  ('Mineral Water Bottle', 'Mineral Water', 1),
  ('Soft Drink Can', 'Soft Drink', 1)
) as rel(meal_name, item_name, qty)
join public.meals m on m.name_en = rel.meal_name
join public.food_items fi on fi.name_en = rel.item_name
on conflict (meal_id, food_item_id) do update set
  quantity = excluded.quantity;
