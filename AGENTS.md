# AGENTS.md

Read this first, then [`STANDARDS.md`](./STANDARDS.md). Where the two disagree, this file wins — it
is closer to the commands.

## What this is

Grundstein is a mortgage calculator for property buyers in Germany. It models the eight KfW
programmes and a bank loan as stackable **tranches**, adds the state-by-state purchase costs, and
shows what the whole thing costs per month and over its life — including what happens when the fixed
rate runs out. Everything runs in the browser; nothing is sent anywhere.

`CONTEXT.md` is the glossary. Use its terms exactly.

## Commands

| Task                   | Command                                  |
| ---------------------- | ---------------------------------------- |
| Install                | `pnpm install --frozen-lockfile`         |
| Dev server             | `pnpm dev`                               |
| Type-check             | `pnpm typecheck`                         |
| Lint                   | `pnpm lint`                              |
| Format                 | `pnpm format` / `pnpm format:check`      |
| Test                   | `pnpm test` / `pnpm test:watch`          |
| Build                  | `pnpm build`                             |
| Preview the build      | `pnpm preview`                           |
| **Everything CI runs** | `./scripts/ci.sh`                        |
| **Before pushing**     | `./scripts/preflight.sh`                 |
| Add a shadcn component | `pnpm dlx shadcn@latest add <component>` |

pnpm only. Never `npm install` or `yarn` — it will produce a second lockfile.

## The design is upstream

The layout, type, colour and motion come from the claude.ai Design project
`d79e789e-70f3-443e-89c8-1409237ca08f`:

- `Grundstein v2.dc.html` — the calculator, route `/`
- `Library.dc.html` — the programme editor, route `/library`
- `support.js` — the design-canvas runtime. **Generated, not app code.** Nothing to port.

Read them with the **DesignSync** tool (`method: "get_file"`), not `WebFetch`. When the code and the
design disagree, the design is right until Oshomo says otherwise.

`mortgage_calculator_react.html` is the v1 prototype and is superseded. Do not port from it.

## Layout

```
src/
  domain/      pure TypeScript, no React, no I/O — the arithmetic and the rules
  lib/         format.ts (Intl, money parsing) · dates.ts (date-fns) · locale-store.ts
  i18n/        locales.ts + locales/{en,de}.json — every user-visible string
  state/       the app store, read through useSyncExternalStore, persisted to localStorage
  components/
    ui/        generated shadcn output — NEVER hand-edited
    ds/        Grundstein's own components, composing ui/
  features/    calculator/ and library/ — the sections that make up each route
  routes/      TanStack Router route definitions
  index.css    design tokens: colour, type, spacing, motion
```

Dependencies point inwards: `domain/` imports from nothing in `src/`.

## Rules worth repeating

- **No user-visible English in a component.** Strings live in `src/i18n/locales/`.
- **No colour, radius, spacing or font-size literal in a component.** Tokens only.
- **Never edit `src/components/ui/`.** Wrap it in `ds/` or change a token.
- **`useEffect` is a last resort.** See the table in `STANDARDS.md` §5.
- **`domain/` stays pure.** No `window`, no `Date.now()`, no `localStorage`.
- **Money never gets formatted or parsed outside `lib/format.ts`.**

## Commits

Conventional Commits, imperative, lower case, no full stop.

**No body. No trailers.** No `Co-Authored-By`, no assistant or tool attribution — not for agents,
not for Claude Code. `feat(domain): add annuity schedule` is a complete commit message.

One logical change per commit. Tick the `TODO.md` item in the same commit as the work it describes.

Run `./scripts/ci.sh` before committing and `./scripts/preflight.sh` before pushing.

## Working agreement

`TODO.md` is the running record. Work through it in order, tick items as they land.

Full autonomy on implementation. Ask Oshomo before:

- a design or architectural decision that is not already settled in `TODO.md`
- installing anything at the system level (project-local `pnpm` dependencies are fine)
