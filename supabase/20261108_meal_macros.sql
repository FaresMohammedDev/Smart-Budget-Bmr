-- Meal macros (grams per serving). Apply once in Supabase SQL Editor.
-- Values are nutrition estimates for the demo menu; adjust them from the admin screen or here.
begin;
alter table public.meals add column if not exists carbs_g numeric check (carbs_g is null or carbs_g >= 0);
alter table public.meals add column if not exists protein_g numeric check (protein_g is null or protein_g >= 0);
alter table public.meals add column if not exists fat_g numeric check (fat_g is null or fat_g >= 0);

update public.meals set carbs_g = 35, protein_g = 8, fat_g = 12 where name_ar = 'ساندوتش طعمية سخنة مقرمشة';
update public.meals set carbs_g = 44, protein_g = 14, fat_g = 10 where name_ar = 'ساندوتش فول إسكندراني بالطماطم والطحينة';
update public.meals set carbs_g = 55, protein_g = 21, fat_g = 13 where name_ar = 'طبق فول بالزيت الحار والليمون مع عيش بلدي';
update public.meals set carbs_g = 32, protein_g = 19, fat_g = 16 where name_ar = 'ساندوتش بيض مسلوق بالجبنة الرومي وزيتون';
update public.meals set carbs_g = 32, protein_g = 24, fat_g = 23 where name_ar = 'ساندوتش بيض مقلي بالبسطرمة بلدي';
update public.meals set carbs_g = 37, protein_g = 16, fat_g = 20 where name_ar = 'طبق شكشوكة مصرية بالصلصة والعيش';
update public.meals set carbs_g = 28, protein_g = 12, fat_g = 12 where name_ar = 'ساندوتش جبنة بيضاء بالطماطم والنعناع وزيت الزيتون';
update public.meals set carbs_g = 70, protein_g = 9, fat_g = 34 where name_ar = 'فطيرة مشلتت فردية بالعسل الأبيض والقشطة';
update public.meals set carbs_g = 57, protein_g = 10, fat_g = 19 where name_ar = 'ساندوتش بطاطس بانيه مع طحينة وخيار مخلل';
update public.meals set carbs_g = 52, protein_g = 38, fat_g = 21 where name_ar = 'ساندوتش شاورما فراخ سوري سوبر';
update public.meals set carbs_g = 52, protein_g = 40, fat_g = 27 where name_ar = 'ساندوتش شاورما لحمة بلدي بالطحينة';
update public.meals set carbs_g = 101, protein_g = 39, fat_g = 24 where name_ar = 'فتة شاورما فراخ بالأرز البسمتي والثومية';
update public.meals set carbs_g = 44, protein_g = 26, fat_g = 27 where name_ar = 'رغيف حواوشي بلدي على الفحم مع مخلل';
update public.meals set carbs_g = 50, protein_g = 33, fat_g = 37 where name_ar = 'رغيف حواوشي إسكندراني مخصوص بالموتزاريلا';
update public.meals set carbs_g = 44, protein_g = 29, fat_g = 22 where name_ar = 'ساندوتش كفتة مشوية على الفحم بالطحينة';
update public.meals set carbs_g = 79, protein_g = 40, fat_g = 27 where name_ar = 'طبق كفتة مشوية على الفحم مع أرز وسلطات';
update public.meals set carbs_g = 61, protein_g = 46, fat_g = 17 where name_ar = 'ربع فرخة مشوية على الفحم بالأرز البسمتي';
update public.meals set carbs_g = 89, protein_g = 71, fat_g = 28 where name_ar = 'نصف فرخة شواية مع أرز بسمتي وثومية';
update public.meals set carbs_g = 66, protein_g = 41, fat_g = 36 where name_ar = 'وجبة كرسبي تشيكن ستريبس مقرمشة';
update public.meals set carbs_g = 62, protein_g = 50, fat_g = 42 where name_ar = 'برجر لحمة دوبل مشوي مع جبنة شيدر وبطاطس';
update public.meals set carbs_g = 38, protein_g = 28, fat_g = 13 where name_ar = 'ساندوتش كبدة إسكندراني بالفلفل الحار والليمون';
update public.meals set carbs_g = 62, protein_g = 25, fat_g = 30 where name_ar = 'صينية مكرونة بشاميل باللحمة المفرومة فردية';
update public.meals set carbs_g = 230, protein_g = 92, fat_g = 112 where name_ar = 'صينية مكرونة بشاميل عائلية (تكفي 4 أفراد)';
update public.meals set carbs_g = 224, protein_g = 288, fat_g = 128 where name_ar = 'صينية مشويات مشكلة عائلي (كيلو مشويات مع أرز)';
update public.meals set carbs_g = 72, protein_g = 31, fat_g = 31 where name_ar = 'طاجن بامية باللحمة البلدي مع أرز بالشعرية';
update public.meals set carbs_g = 41, protein_g = 4, fat_g = 20 where name_ar = 'باكيت بطاطس محمرة كرسبي كبير';
update public.meals set carbs_g = 8, protein_g = 2, fat_g = 2 where name_ar = 'طبق سلطة خضراء بلدي طازجة';
update public.meals set carbs_g = 6, protein_g = 4, fat_g = 11 where name_ar = 'علبة سلطة طحينة متبلة بالليمون والكمون';
update public.meals set carbs_g = 3, protein_g = 1, fat_g = 18 where name_ar = 'علبة ثومية سوري كريمي';
update public.meals set carbs_g = 29, protein_g = 10, fat_g = 15 where name_ar = 'طبق سمبوسك مكس جبن ولحمة (4 قطع)';
update public.meals set carbs_g = 14, protein_g = 2, fat_g = 10 where name_ar = 'سلطة كول سلو طازجة';
update public.meals set carbs_g = 50, protein_g = 10, fat_g = 27 where name_ar = 'طاجن أم علي بالمكسرات والقشطة فرن';
update public.meals set carbs_g = 48, protein_g = 8, fat_g = 10 where name_ar = 'طبق أرز باللبن فرن مكرمل';
update public.meals set carbs_g = 25, protein_g = 2, fat_g = 0 where name_ar = 'كوب عصير برتقال فريش طبيعي';
update public.meals set carbs_g = 38, protein_g = 1, fat_g = 1 where name_ar = 'كوب عصير مانجو طبيعي مثلج';
update public.meals set carbs_g = 35, protein_g = 0, fat_g = 0 where name_ar = 'كانز مشروب غازي كولا / شويبس';
update public.meals set carbs_g = 0, protein_g = 0, fat_g = 0 where name_ar = 'زجاجة مياه معدنية مثلجة';
update public.meals set carbs_g = 17, protein_g = 3, fat_g = 2 where name_ar = 'كوب شاي بحليب مصري بالهيل';

-- Meals currently in the team's Supabase menu (matched by exact Arabic name).
update public.meals set carbs_g = 46, protein_g = 4, fat_g = 22 where name_ar = 'بطاطس محمرة';
update public.meals set carbs_g = 82, protein_g = 62, fat_g = 23 where name_ar = 'ربع فرخة مشوية بالأرز';
update public.meals set carbs_g = 60, protein_g = 45, fat_g = 24 where name_ar = 'ساندوتش شاورما فراخ';
update public.meals set carbs_g = 60, protein_g = 14, fat_g = 20 where name_ar = 'ساندوتش طعمية';
update public.meals set carbs_g = 50, protein_g = 37, fat_g = 17 where name_ar = 'ساندوتش كبدة إسكندراني';
update public.meals set carbs_g = 80, protein_g = 53, fat_g = 40 where name_ar = 'ساندوتش كفتة';
update public.meals set carbs_g = 6, protein_g = 1, fat_g = 1 where name_ar = 'سلطة خضراء';
update public.meals set carbs_g = 7, protein_g = 4, fat_g = 12 where name_ar = 'سلطة طحينة';
update public.meals set carbs_g = 252, protein_g = 324, fat_g = 144 where name_ar = 'صينية مشويات مشكلة عائلي';
update public.meals set carbs_g = 140, protein_g = 56, fat_g = 68 where name_ar = 'صينية مكرونة بشاميل صغيرة';
update public.meals set carbs_g = 281, protein_g = 112, fat_g = 137 where name_ar = 'صينية مكرونة بشاميل عائلي';
update public.meals set carbs_g = 94, protein_g = 36, fat_g = 22 where name_ar = 'طبق فول بالعيش';
update public.meals set carbs_g = 35, protein_g = 0, fat_g = 0 where name_ar = 'مشروب غازي';
update public.meals set carbs_g = 0, protein_g = 0, fat_g = 0 where name_ar = 'مياه معدنية';

-- available_meals is `select m.*`; new columns can't be inserted into a view with CREATE OR REPLACE,
-- so drop and recreate it (and restore the grants).
drop view if exists public.available_meals;
create view public.available_meals with (security_invoker = true) as
select m.*, coalesce(m.discount_price, m.price) as effective_price
from public.meals m left join public.categories c on c.id = m.category_id
where m.is_available and (c.id is null or c.is_active) and m.total_kcal >= 0
and not exists (select 1 from public.meal_items mi join public.food_items fi on fi.id = mi.food_item_id where mi.meal_id = m.id and not fi.is_available);
grant select on public.available_meals to anon, authenticated;
commit;
