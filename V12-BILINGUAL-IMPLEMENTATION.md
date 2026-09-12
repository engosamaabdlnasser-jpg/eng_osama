# ENG OSAMA V12 — Bilingual foundation

This build starts from the verified stable V12 baseline.

## Included
- Arabic (Egypt) and English (UK) locale state.
- Persistent language choice in localStorage.
- Runtime `lang` and `dir` switching without reload.
- Accessible language switcher in the main and auth headers.
- Central translation keys in `src/i18n.tsx`.
- RTL/LTR-friendly CSS using logical properties for the new language control and search field.
- Bilingual course, lesson and category data fields with `*_ar` / `*_en` fallbacks.
- Admin Course editor fields for Arabic/English titles and descriptions.

## Supabase
Run `supabase/V12-BILINGUAL-CONTENT.sql` once to add bilingual content columns and backfill existing content into both language fields.

## Important scope
This is the first safe bilingual increment from the stable baseline. It intentionally does not add the AI/Telegram/Notifications changes yet. Existing routes are preserved; `/ar/...` and `/en/...` were not introduced so existing links do not break.

## Validation
The global TypeScript compiler reported no source syntax errors after the changes. A full production build could not be run in this environment because project dependencies were not installed (the dependency installation timed out).
