-- Menu data review (proposed fixes). NOT applied automatically: read, adjust, then run in Supabase SQL Editor.
-- Findings come from comparing meals.total_kcal with the recipe in meal_items x food_items.kcal_per_unit.
begin;

-- 1) Kofta sandwich has TWO breads (Syrian + baladi = 450 kcal of bread). A sandwich uses one.
--    Remove the Syrian bread line and set the kcal to the new recipe total (250 + 364 + 75 = 689).
delete from public.meal_items
where meal_id = (select id from public.meals where name_ar = 'ساندوتش كفتة')
  and food_item_id = (select id from public.food_items where name_ar = 'عيش سوري');
update public.meals set total_kcal = 689, carbs_g = 62, protein_g = 41, fat_g = 31
where name_ar = 'ساندوتش كفتة';

-- 2) Family grill tray: stored 3600 kcal but its recipe adds up to 5200 (about 1040 per person for 5).
update public.meals set total_kcal = 5200, carbs_g = 364, protein_g = 468, fat_g = 208
where name_ar = 'صينية مشويات مشكلة عائلي';

-- 3) Small bechamel tray: stored 1400 but the recipe adds up to 1515.
update public.meals set total_kcal = 1515, carbs_g = 152, protein_g = 61, fat_g = 74
where name_ar = 'صينية مكرونة بشاميل صغيرة';

-- 4) Foul plate is a full 720 kcal meal (foul + 2 baladi breads) but filed as a side dish.
update public.meals set kind = 'main' where name_ar = 'طبق فول بالعيش';

-- 5) Water: 0.01 kcal -> 0.
update public.meals set total_kcal = 0 where name_ar = 'مياه معدنية';

commit;
