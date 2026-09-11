# Grundstein — build TODO

Port of the `Grundstein v2` design canvas to a deployable React app. Tick items as they land. One
logical change per commit.

**Source of truth for the design:** claude.ai Design project `d79e789e-70f3-443e-89c8-1409237ca08f`
(`Grundstein v2.dc.html`, `Library.dc.html`). Local read-only copy of the main file lives in the
scratchpad, not in the repo.

**Stack:** Vite + React 19 · TypeScript strict · TanStack Router · Tailwind v4 · shadcn/ui · i18next
(en/de) · Vitest · deploy to Vercel.

---

## Phase 0 — Repo groundwork

- [x] `STANDARDS.md` committed — the Nooks standard, adapted to this repo
- [x] `AGENTS.md` written, pointing at `STANDARDS.md` + naming the commands
- [x] `CONTEXT.md` — the domain glossary (tranche, programme, Grunderwerbsteuer, Zinsbindung, grace,
      followup period, cover, ledger) so names stay consistent
- [x] `.gitignore`, `.editorconfig`, `.nvmrc`
- [x] `README.md` — what it is, how to run, how to deploy

## Phase 1 — Scaffold

- [x] Project scaffolded by hand (`pnpm create vite` is interactive) — React 19 + TypeScript
- [x] `tsconfig` strict, `noUncheckedIndexedAccess`, path alias `@/*`
- [x] Tailwind v4 + `@tailwindcss/vite`
- [x] shadcn init (`components.json`, `src/components/ui/` reserved for generated output)
- [x] ESLint flat config: `typescript-eslint`, `eslint-plugin-react-hooks` (latest, with the
      compiler rules), `jsx-a11y`, `import/order`
- [x] Prettier + `prettier-plugin-tailwindcss`
- [x] Vitest + `@testing-library/react` + `jsdom`
- [x] `scripts/ci.sh` — format check, lint, `tsc -b`, test, build (in that order)
- [x] `scripts/preflight.sh` — fresh checkout of HEAD, install from lockfile, run `ci.sh`
- [x] React Compiler enabled in the Vite plugin — `react({ compiler: true })` on oxc, not babel;
      `@vitejs/plugin-react` v6 dropped the `babel` option

## Phase 2 — Design tokens

- [ ] `src/index.css`: light + dark palettes as `@theme` custom properties
      (`--paper --card --ink --ink-2 --ink-3 --rule --rule-2 --shu --shu-soft --moku`)
- [ ] Type scale + families: Zen Old Mincho (display), Zen Kaku Gothic New (body), IBM Plex Mono
      (figures) — self-hosted via `@fontsource`, no Google Fonts request
- [ ] `--gs-fs` text-size multiplier wired to the A/A/A control
- [ ] `--gs-barh` sticky-offset custom property, set from the summary bar's measured height
- [ ] Keyframes `gsIn gsFade gsRule gsCol` + `prefers-reduced-motion` escape hatch
- [ ] `corner-shape: squircle` as progressive enhancement with a `border-radius` fallback
- [ ] No colour/radius/size literal survives in any component — tokens only

## Phase 3 — Domain (pure, no React, fully unit-tested)

- [ ] `src/domain/types.ts` — `Programme`, `Tranche`, `FollowupPeriod`, `Profile`, `ProjectType`,
      `EnergyTarget`, `StateCode`
- [ ] `src/domain/programmes.ts` — the 8 KfW/bank programmes + `PROGRAMME_ORDER`
- [ ] `src/domain/states.ts` — 16 Bundesländer with transfer-tax rates
- [ ] `src/domain/amortisation.ts` — `annuity`, `amortise` (grace period + follow-up rate segments),
      `buildPortfolio`
- [ ] `src/domain/costs.ts` — transfer tax, notary, registry, agent, cash needed
- [ ] `src/domain/eligibility.ts` — `checkEligibility`, `excludedProgrammes`, `findConflicts`
- [ ] Tests: annuity vs. known values, zero-rate loan, grace ≥ term clamp, follow-up segment
      boundaries, income cap +10k per extra child, conflict symmetry, cash-needed arithmetic

## Phase 4 — Infrastructure

- [ ] `src/lib/format.ts` — `Intl` money/number/percent, de-DE grouping, the German decimal-comma
      parse used by every numeric input
- [ ] `src/lib/dates.ts` — date-fns wrapper; nothing else touches a date
- [ ] `src/lib/locale-store.ts` — owns i18next language + date-fns locale together
- [ ] `src/i18n/locales/en.json` + `de.json` — every string from the design, both languages,
      including the 9 FAQ entries and per-programme prose
- [ ] `src/i18n/locales.ts` — adding a language is a JSON file plus one entry
- [ ] `src/state/session-store.ts` — localStorage-backed app state read through
      `useSyncExternalStore`, schema-versioned, debounced write, never `useEffect`
- [ ] Tests: money parse/format round-trip, store rehydration from a corrupt payload

## Phase 5 — Components (`src/components/ds/`)

- [ ] `TopBar` — language, text size, theme toggle
- [ ] `RailSlider` — hairline track + fill, on shadcn `Slider` (keyboard + a11y)
- [ ] `FieldLabel`, `HairlineInput`, `MoneyInput` (draft-while-typing, commit on blur)
- [ ] `HairlineSelect` on shadcn `Select`
- [ ] `StatFigure` — the digit-roll odometer, reduced-motion aware
- [ ] `Disclosure` on shadcn `Accordion` (FAQ + library rows)
- [ ] `StackBar`, `LegendRow`, `Chip`, `Badge`, `CalloutWarning`
- [ ] Nothing under `src/components/ui/` is hand-edited

## Phase 6 — Calculator route (`/`)

- [ ] Hero: eyebrow, three-line H1, lede, live monthly figure
- [ ] Three principles, scroll-revealed
- [ ] Sticky summary bar: monthly / cash needed / total interest
- [ ] 001 About you — project, children, income, owns a home, energy target
- [ ] 002 The property — price, down payment, state, agent toggle, cost table
- [ ] 003 Your loans — per-tranche card, eligibility badge, four sliders, follow-up rate periods,
      KfW conditions disclosure, add/remove, cover indicator
- [ ] Conflict callout for mutually exclusive programmes
- [ ] 004 Year by year — yearly bars, fixed-rate marker, month drill-down, readouts
- [ ] 005 What each loan costs — ledger rows + the Σ total row
- [ ] 006 Questions — FAQ
- [ ] Footer with disclaimer and sources

## Phase 7 — Library route (`/library`)

- [ ] Programme list as disclosures with all editable fields
- [ ] Project-type and exclusion chip toggles
- [ ] Add / delete a programme; deleting drops tranches that used it
- [ ] Restore the eight originals, leaving price/tranches/answers untouched
- [ ] Confirm dialogs via shadcn `AlertDialog`, not `window.confirm`

## Phase 8 — Quality

- [ ] Accessibility pass: real buttons, labelled inputs, visible focus rings, 44px hit areas, full
      keyboard path, chart readouts announced
- [ ] Responsive pass at 360 / 768 / 1440
- [ ] Dark mode parity, including the theme-toggle and system-preference paths
- [ ] Reduced-motion pass
- [ ] `<title>`, meta description, favicon, Open Graph, `lang` attribute follows i18n
- [ ] Lighthouse ≥ 95 on performance and accessibility
- [ ] `scripts/ci.sh` green from a clean install

## Phase 9 — Deploy

- [ ] `vercel.json` — SPA rewrite, cache headers for hashed assets
- [ ] Decide and record the production domain
- [ ] First deploy, smoke-test the live URL
- [ ] `README.md` deploy section reflects what actually happened

## Parked

- [x] Rolldown — moot, Vite 8 already builds on Rolldown. Nothing to adopt.
- [x] Does v1 (`mortgage_calculator_react.html`) have anything v2 dropped? No. Every v1 component
      (`ProfileQuiz` `ClosingCosts` `TrancheCard` `FollowupPeriods` `ComboWarning` `PaymentChart`
      `MonthDetail` `Breakdown` `FAQ` `Admin`) maps onto a v2 section, and v2 adds EN/DE, theming,
      text sizing, the capital-structure bar, cover and eligibility badges.

## Pinned versions, and why

- **TypeScript 5.9**, not 7.x — `typescript-eslint` requires `<6.1.0`. Revisit when it ships
  native-compiler support.
- **ESLint 9**, not 10 — `eslint-plugin-jsx-a11y` peers at `^9`, and the accessibility rules are
  load-bearing here (STANDARDS.md §5).
