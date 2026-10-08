# دليل تشغيل ورفع مشروع Smart Budget لفتح الله ماركت 🛒
**Next.js + Supabase + Vercel Deployment Guide**

---

## 1. التعديل اللي تم في Supabase (كود الـ SQL المُحدّث)
تم تحديث كود الـ SQL بالكامل ليشمل:
1. **إلغاء الربط بجوجل** والاعتماد على الكيوسك المباشر وجلسات الـ Guest الآمنة، وحسابات الإدارة والكاشير.
2. **إضافة دور `cashier`** في جدول الأدوار وصلاحيات تأكيد دفع البونات.
3. **دعم وضع الطلب المباشر السريع (E-Commerce)** في جدول الأوردرات ودالة `create_order` لحساب السعرات وطباعة البون حتى لو اليوزر مستعجل.
4. **خاصية الوجبات التي قاربت الصلاحية (`is_expiring_soon`)** لتتصدر قائمة الاقتراحات كأفضل عرض توفيري طازج في فتح الله.
5. **إنشاء Storage Bucket باسم `meal-images`** مع صور افتراضية Placeholder نظيفة وإمكانية رفع صور جديدة من لوحة الأدمن.

> 📄 **ملف الـ SQL الجاهز للتشغيل:**
> انسخ محتوى الملف [supabase_schema.sql](file:///C:/Users/codew/.gemini/antigravity/brain/44acbccb-d430-4966-8998-95b4a3c3422f/supabase_schema.sql) والصقه في:
> **Supabase Dashboard → SQL Editor → New Query → Run**

---

## 2. إنشاء حساب الأدمن الأول في Supabase
1. ادخل على **Supabase Dashboard** للمشروع:
   `https://dvihewhnspmxyigdeikp.supabase.co`
2. اذهب إلى **Authentication → Users → Add User → Create User**:
   - البريد: `admin@fathalla.com`
   - كلمة المرور: اختر كلمة مرور قوية للأدمن.
   - علم على `Auto Confirm User`.
3. في **SQL Editor**، شغّل هذا السطر لترقية الحساب لأدمن:
   ```sql
   update public.profiles set role = 'admin' where email = 'admin@fathalla.com';
   ```

---

## 3. الرفع على Vercel ليشتغل من أي جهاز أونلاين بدون الحاجة للاب توب
المشروع مبني كـ Serverless بالكامل، يعني هيشتغل 24/7 على سيرفرات Vercel و Supabase:

### الخطوات:
1. **ارفع كود الفولدر `smart-budget` على مستودع GitHub جديد:**
   ```bash
   git init
   git add .
   git commit -m "feat: smart budget fathalla market complete app"
   git remote add origin https://github.com/YOUR_USERNAME/smart-budget.git
   git push -u origin main
   ```
2. **ادخل على موقع [Vercel.com](https://vercel.com):**
   - اضغط **Add New Project**.
   - اختر مستودع `smart-budget` من GitHub.
   - في قسم **Environment Variables**، أضف المتغيرين التاليين:
     - `NEXT_PUBLIC_SUPABASE_URL` = `https://dvihewhnspmxyigdeikp.supabase.co`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_b9v8HuohVD3vGcjRo3VmLQ_f74UhAhJ`
   - اضغط **Deploy**!

في خلال دقيقة، هيكون معاك لينك مباشر (مثل `https://smart-budget-fathalla.vercel.app`) يفتح على أي تابلت أو شاشة أو موبايل.

---

## 4. تشغيل المشروع محلياً على جهازك الآن للتجربة
إذا أردت تجربة المشروع محلياً على جهازك:
```bash
cd "D:\Projects\SMART BUDGET\smart-budget"
pnpm dev
```
افتح المتصفح على: `http://localhost:3000`

---

## 5. ما تم إنجازه واختباره بالكامل:
- [x] **محرك السعرات (BMR & TDEE):** وفق معادلة Mifflin-St Jeor والمعاملات الحيوية المعتمدة علمياً بنسبة 100%.
- [x] **توزيع الحصص للجروبات (Group Shares):** بأعداد صحيحة عادلة للأصناف الفردية (Largest Remainder Method) ونسب مئوية للصواني.
- [x] **حالة الميزانية القليلة (Low Budget Edge Case):** اعتذار مهذب واقتراح سناكس وجوانب تكفي الميزانية مع حساب المبلغ المتبقي لأقرب وجبة.
- [x] **عروض فتح الله الطازجة قرب الصلاحية (`is_expiring_soon`):** تتصدر الترشيحات تلقائياً كأفضل خيار توفيري.
- [x] **وضع E-Commerce المباشر:** تصفح المنيو بالكالوريز والأسعار والشراء الفوري.
- [x] **بون الكاشير الحراري 80mm:** مع باركود و QR Code وتفصيل مكونات الوجبة وتوزيع الأفراد.
- [x] **لوحة تحكم الأدمن:** Toggle فوري لتوافر الوجبات، إضافة وجبات، رفع صور إلى Supabase Storage، وإحصائيات Top Selling.
- [x] **شاشة الكاشير:** مسح الباركود وتأكيد الدفع (Mark as Paid).
- [x] **اختبارات آلية:** 11 فحص واختبار بـ Vitest نجحت بنسبة 100%.
- [x] **بناء جاهز للإنتاج:** `pnpm build` بنجاح تام وبدون أي أخطاء في الـ TypeScript.
