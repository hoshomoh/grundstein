# Grundstein

A mortgage calculator for property buyers in Germany.

Your bank quotes you one number. Grundstein shows you the rest: the KfW programmes you can stack and
the rules that stop you stacking some of them, the cash that has to be in your account on completion
day, and what your payment becomes when the fixed rate runs out.

Everything runs in your browser. Nothing you type is sent anywhere.

## What it models

- **Eight loan programmes** — KfW 297, 298, 300, 308, 124, 261, 270 and an ordinary bank mortgage —
  each with its own ceiling, rate, conditions and exclusions.
- **Sixteen transfer-tax rates**, one per Bundesland, from 3.5% in Bayern to 6.5% in NRW.
- **Stacked tranches** with per-tranche grace periods and follow-up rate changes after the
  Zinsbindung ends.
- **Eligibility** against your household: project type, children, income, existing ownership and
  energy target — with the reasons when you do not qualify.
- **The full amortisation**, year by year and month by month, for every tranche and for all of them
  together.

English and German. Light and dark. Three text sizes.

## Running it

Requires Node 24 (see `.nvmrc`) and pnpm.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

| Task               | Command                  |
| ------------------ | ------------------------ |
| Dev server         | `pnpm dev`               |
| Type-check         | `pnpm typecheck`         |
| Lint               | `pnpm lint`              |
| Test               | `pnpm test`              |
| Build              | `pnpm build`             |
| Preview the build  | `pnpm preview`           |
| Everything CI runs | `./scripts/ci.sh`        |
| Before pushing     | `./scripts/preflight.sh` |

## Deploying

Static output, hosted on Vercel. `vercel.json` holds the whole configuration:

- **SPA rewrite** — every path that is not a built asset serves `index.html`, so `/library` works on
  a cold load and not only via client-side navigation.
- **Cache headers** — hashed assets are immutable for a year; `index.html` is revalidated every
  time, so a new deploy is picked up immediately.
- **Content-Security-Policy** — `default-src 'self'`, no external origins at all. The app loads no
  third-party scripts, fonts or analytics, so nothing has to be allowed through. `style-src` permits
  inline styles because the charts size their bars with style attributes.

```sh
pnpm build     # produces dist/
pnpm preview   # serves dist/ locally to check the built output
```

A push to `main` deploys. Pull requests get their own preview URL.

## Built with

Vite · React 19 · TypeScript · TanStack Router · Tailwind CSS v4 · shadcn/ui · i18next · Vitest.

No backend, no database, no analytics. State lives in `localStorage` and goes no further.

## Contributing

Read [`AGENTS.md`](./AGENTS.md) first, then [`STANDARDS.md`](./STANDARDS.md).
[`CONTEXT.md`](./CONTEXT.md) is the glossary — use its terms exactly. [`TODO.md`](./TODO.md) is the
running record of what is built and what is not.

## A caveat worth repeating

This is a model, not advice. Rates, ceilings and rules change. Check the official KfW pages before
you sign anything.

## Licence

Not yet decided.
