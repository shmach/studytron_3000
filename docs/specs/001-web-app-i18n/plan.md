# Plan: Web app internationalization (EN default + PT-BR)

## Context

The `apps/web` UI mixes hardcoded English and Portuguese (e.g. `ThemeSelector` in Portuguese, `CoursePage` in English). Goal: every UI text goes through a translation catalog, English is the base/fallback, Portuguese is the translation, the initial language comes from the browser, and a header switcher lets the user change it (choice persisted).

**Out of scope:** course content from the vault (stays in the language it was generated in), values sent to the API (`beginner`, `hands-on practice`…) and `topic-meta` status values — only their labels are translated. Server error details stay in English inside a translated wrapper message.

## Library

`i18next` + `react-i18next` + `i18next-browser-languagedetector`: built-in browser detection with persistence, fallback, interpolation, plurals, `<Trans>` for markup inside texts, and typed keys. Alternatives rejected: `react-intl` (more verbose), `Lingui` (extract/compile step), hand-rolled context like `ThemeContext` (would reimplement plurals/detection).

## Status

| # | Step | Owner | Status |
|---|------|-------|--------|
| 1 | Install dependencies | Claude | ✅ done |
| 2 | Catalogs `en.json` / `pt-BR.json` | Claude | ✅ done |
| 3 | Init `src/app/i18n/index.ts` | user | ✅ done (review fixes applied) |
| 4 | Typed keys `src/app/i18n/i18next.d.ts` | user | ✅ done |
| 5 | Bootstrap import in `main.tsx` | user | ✅ done |
| 6 | `LanguageSelector` in header | user | ✅ done |
| 7 | Migrate strings to `t()` / `<Trans>` | Claude | ✅ done |
| 8 | Key parity check + verification | Claude | ✅ done |

**Status:** implementation complete. `typecheck` and `check:i18n` pass; manual checks validated in both languages. Known exception: `'Português'` in `CourseQuestionnaireDialog.tsx` is a native language name and stays untranslated, so the accent grep in step 8 excludes it.

## Review of what was done (step 3)

Tested in Node against the installed i18next v26 with the same options.

1. **Bug — `resources` shape.** i18next expects `resources[lng][namespace]`. Passing `{ en, 'pt-BR': ptBR }` makes `common`, `theme`, `courses`… become *namespaces*, so `t('theme.label')` returns the literal string `"theme.label"`. Fix: `{ en: { translation: en }, 'pt-BR': { translation: ptBR } }`.
2. **Bug — `nonExplicitSupportedLngs: true` (my mistake in the original plan).** It does *not* map `pt` → `pt-BR`. It makes i18next accept a code only if its base (`pt`) is in `supportedLngs`; since only `pt-BR` is listed, Portuguese resolves to English. Without the option, i18next's own best-match already maps `pt`, `pt-PT`, `pt-BR` → `pt-BR` and `es` → `en`. Fix: remove the option.

   | Browser | with option | without option |
   |---------|-------------|----------------|
   | pt-PT / pt | `resolvedLanguage: en` ❌ | `pt-BR` ✅ |
   | es | `en` ✅ | `en` ✅ |
   | en-US | `en` ✅ | `en` ✅ |

3. **Minor — `<html lang>` on first load.** The `languageChanged` listener is registered inside `.then()`, after init has already detected the language, so the initial `lang` is never set. Register the listener *before* `.init()`, and use `i18n.resolvedLanguage` rather than `lng` (`lng` can be a raw code such as `en-US`).
4. **Minor — floating promise.** Prefix `void` to `i18n.use(...).init(...)` (same idiom as `void refetch()` in the pages) once the `.then` is removed.

`npm run typecheck` currently fails only on an unrelated unused import (`FormEvent` in `CourseQuestionnaireDialog.tsx`), which step 7 will remove.

## Remaining steps

### 4. Typed keys — `src/app/i18n/i18next.d.ts`
Module augmentation of `CustomTypeOptions` (`declare module 'i18next'`) with `defaultNS: 'translation'` and `resources: { translation: typeof en }`. After this, a typo like `t('theme.ligth')` fails `tsc`.

### 6. Language switcher — `src/ui/components/LanguageSelector.tsx`
Mirror `ThemeSelector.tsx`: `DropdownMenu` + `DropdownMenuRadioGroup`, `Languages` icon from lucide, `aria-label={t('language.label')}`, `value={i18n.resolvedLanguage}`, `onValueChange={(lng) => void i18n.changeLanguage(lng)}` (the detector persists it to `studytron:language`). Option labels are fixed native names: "English", "Português". Mount next to `<ThemeSelector />` in `AppLayout.tsx`.

### 7. String migration
In `ThemeSelector`, `AppLayout`, `CourseQuestionnaireDialog`, `DeleteCourseDialog`, `error-state`, `status-badge`, `CoursesPage`, `CoursePage`, `not-found-page`:
- `const { t } = useTranslation()`; literals → `t('key')`, including `aria-label` / `placeholder`.
- Markup texts (`error.network`, `deleteCourse.description`) → `<Trans i18nKey=… components={{ code: <code className="font-mono" /> }} />`.
- Plural: `t('courses.cardSummary', { count, completed, total })`.
- Questionnaire: keep `value`s in English, labels become keys (`questionnaire.level.beginner`).
- `StatusBadge`: `t(\`status.${status}\`)` replaces `STATUS_LABEL`.
- `course.created` date via `Intl.DateTimeFormat(i18n.resolvedLanguage)`.

### 8. Verification
- `scripts/check-i18n-keys.mjs` + `"check:i18n"` script: flattens both catalogs, exits non-zero on any difference.
- `npm run typecheck`, `npm run lint`, `npm run check:i18n` in `apps/web`.
- Manual (`npm run dev`, delete `studytron:language` from localStorage between runs):
  1. Browser pt-BR or pt-PT → UI in Portuguese, `<html lang="pt-BR">`; browser es/en → English.
  2. Switch in header → instant change, no reload; reload keeps the choice.
  3. Walk every screen in both languages → no mixed text; Portuguese course content unchanged in English UI.
  4. `grep -rnE "[ãõçáéíóúâêô]" src/ui` → empty.

## Files
- New: `src/app/i18n/{index.ts,i18next.d.ts}`, `src/app/i18n/locales/{en,pt-BR}.json`, `src/ui/components/LanguageSelector.tsx`, `scripts/check-i18n-keys.mjs`
- Changed: `src/main.tsx`, `src/ui/components/AppLayout.tsx`, components/pages in step 7, `package.json`
