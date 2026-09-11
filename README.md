# ENG OSAMA

منصة تعليمية عربية مجانية مبنية بـ React + Vite + Supabase.

## ما تم بناؤه

- Home / Courses / Categories / Course Details / Lesson Watch
- YouTube embed مع استخراج Video ID من روابط `watch`, `youtu.be`, `embed`, و`shorts`
- تسجيل دخول وإنشاء حساب بالبريد وكلمة المرور عبر Supabase Auth
- حساب الطالب مع تتبع إكمال الدروس
- لوحة Admin محمية بالصلاحيات
- إدارة الكورسات: إضافة، تعديل، نشر/إخفاء، حذف
- إدارة الدروس: إضافة رابط YouTube وحذف الدروس
- إدارة التصنيفات: إضافة، تعديل، حذف
- إدارة صلاحيات المستخدمين من Student إلى Admin والعكس
- PostgreSQL schema + RLS policies + trigger لإنشاء profile تلقائيًا
- Responsive RTL design للموبايل والتابلت والكمبيوتر
- SEO basics + SPA fallback configs

## التشغيل المحلي

يتطلب Node.js حديثًا.

```bash
npm install
cp .env.example .env.local
npm run dev
```

ثم افتح عنوان Vite الذي يظهر في الطرفية.

## ربط Supabase

1. أنشئ مشروعًا مجانيًا في Supabase.
2. افتح SQL Editor وشغّل كامل الملف `supabase/schema.sql`.
3. من Connect / API انسخ Project URL وPublishable key إلى `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

4. أنشئ حسابك من `/signup`.
5. من SQL Editor اجعل الحساب Admin:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'YOUR_EMAIL');
```

> لا تضع `service_role` key داخل الواجهة الأمامية.

## بناء الإنتاج

```bash
npm run build
npm run preview
```

## النشر المجاني

المشروع SPA، لذلك يجب تفعيل fallback إلى `index.html` على منصة الاستضافة.

### Vercel

ملف `vercel.json` موجود بالفعل ويضبط rewrite لجميع المسارات إلى `index.html`.

### Netlify

ملف `public/_redirects` موجود بالفعل لتوجيه مسارات React إلى `index.html`.

## ملاحظات مهمة

- صلاحية Admin ليست مجرد زر في الواجهة؛ سياسات RLS في Supabase هي طبقة الحماية الفعلية.
- الطلاب يمكنهم قراءة الكورسات المنشورة والدروس التابعة لها وتعديل تقدمهم فقط.
- لا يتم تخزين HTML من المستخدمين؛ يتم قبول رابط YouTube وتحويله إلى embed URL آمن.
- حدود الاستخدام المجاني تعتمد على حدود الخطط الحالية لمزود الاستضافة وSupabase.


## Professional upgrade — 0 EGP
- Production-first data loading: no silent demo fallback unless `VITE_DEMO_MODE=true`.
- Account profile photo upload through Supabase Storage.
- Admin course-cover upload through Supabase Storage.
- Courses search normalization, sorting, URL filters, loading/error/empty states.
- Route guards for account/admin and a React Error Boundary.
- Accessibility polish: focus-visible, screen-reader utility, mobile menu ARIA state.
- SEO foundation: canonical, robots, sitemap, favicon, Open Graph image.

### Database update
Run `supabase/portfolio-upgrade.sql` once after the existing schema. It adds `avatar_url`, protects student roles from self-escalation, and enables profile/course image storage.

### Demo mode
Keep `VITE_DEMO_MODE=false` in production. Demo data is only available when explicitly enabled.
