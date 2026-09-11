# ENG OSAMA — التحديثات الجديدة

تم تجهيز النسخة الحالية لتشمل:

1. إخفاء «تسجيل الدخول» بعد تسجيل الدخول واستبداله بـ «حسابي».
2. إخفاء رابط «الإدارة» عن غير المديرين مع التحقق من الصلاحية قبل فتح لوحة الإدارة.
3. تبديل المظهر فاتح/داكن وحفظ الاختيار محليًا.
4. إضافة لوجو ENG OSAMA المرفق في الهيدر افتراضيًا (`public/logo.png`).
5. صفحة «إعدادات الموقع» داخل Admin لتعديل اسم المنصة، اللوجو، نصوص الصفحة الرئيسية، ظهور الأقسام، الفوتر، وإضافة أقسام مخصصة بدون كود.
6. لوحة «مراقبة الطلاب» للتقدم وآخر نشاط.
7. رفع اللوجو من جهازك من داخل Admin عبر Supabase Storage.

## المطلوب في Supabase

افتح SQL Editor في مشروع Supabase وشغّل الملف:

`supabase/site-settings-students.sql`

هذا الملف ينشئ/يحدث جدول إعدادات الموقع، Bucket باسم `site-assets` وسياسات رفع وقراءة اللوجو، بالإضافة إلى دالة مراقبة الطلاب.

بعد التشغيل، افتح الموقع وسجل بحساب Admin ثم ادخل:

`/admin` → `إعدادات الموقع`

ومن هناك تستطيع رفع اللوجو وتعديل محتوى الصفحة بدون الرجوع للكود.


## V2 production repair
- Added `supabase/V2-FIX-ONCE.sql` to provision site settings, storage, profile avatars, and the admin-only student monitor in one idempotent migration.
- Admin tabs now have explicit button semantics, icons, hover/focus states, and mobile layout.
- Admin overview now shows the number of registered students.
- Admin data loading is isolated so one optional panel failure does not blank the entire dashboard.
