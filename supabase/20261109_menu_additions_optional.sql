-- OPTIONAL: adds light items (juice, tea, desserts, coleslaw) so snack/dinner suggestions have real options.
-- Run separately from the review file. Skips items that already exist by Arabic name.
begin;
insert into public.meals (name_ar, name_en, kind, portion_type, servings, price, total_kcal, carbs_g, protein_g, fat_g, is_available, image_url, category_id)
select 'سلطة كول سلو', 'Coleslaw Salad', 'side', 'individual', 1, 20, 160, 14, 2, 10, true, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80', (select id from public.categories where slug = 'sides')
where not exists (select 1 from public.meals where name_ar = 'سلطة كول سلو');
insert into public.meals (name_ar, name_en, kind, portion_type, servings, price, total_kcal, carbs_g, protein_g, fat_g, is_available, image_url, category_id)
select 'أم علي', 'Om Ali', 'dessert', 'individual', 1, 40, 480, 50, 10, 27, true, 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80', null
where not exists (select 1 from public.meals where name_ar = 'أم علي');
insert into public.meals (name_ar, name_en, kind, portion_type, servings, price, total_kcal, carbs_g, protein_g, fat_g, is_available, image_url, category_id)
select 'أرز باللبن', 'Rice Pudding', 'dessert', 'individual', 1, 25, 310, 48, 8, 10, true, 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80', null
where not exists (select 1 from public.meals where name_ar = 'أرز باللبن');
insert into public.meals (name_ar, name_en, kind, portion_type, servings, price, total_kcal, carbs_g, protein_g, fat_g, is_available, image_url, category_id)
select 'عصير برتقال طبيعي', 'Fresh Orange Juice', 'drink', 'individual', 1, 25, 110, 25, 2, 0, true, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=800&auto=format&fit=crop&q=80', (select id from public.categories where slug = 'drinks')
where not exists (select 1 from public.meals where name_ar = 'عصير برتقال طبيعي');
insert into public.meals (name_ar, name_en, kind, portion_type, servings, price, total_kcal, carbs_g, protein_g, fat_g, is_available, image_url, category_id)
select 'عصير مانجو طبيعي', 'Fresh Mango Juice', 'drink', 'individual', 1, 30, 160, 38, 1, 1, true, 'https://images.unsplash.com/photo-1546173159-315724a31696?w=800&auto=format&fit=crop&q=80', (select id from public.categories where slug = 'drinks')
where not exists (select 1 from public.meals where name_ar = 'عصير مانجو طبيعي');
insert into public.meals (name_ar, name_en, kind, portion_type, servings, price, total_kcal, carbs_g, protein_g, fat_g, is_available, image_url, category_id)
select 'شاي بلبن', 'Milk Tea', 'drink', 'individual', 1, 18, 95, 17, 3, 2, true, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&auto=format&fit=crop&q=80', (select id from public.categories where slug = 'drinks')
where not exists (select 1 from public.meals where name_ar = 'شاي بلبن');
commit;
