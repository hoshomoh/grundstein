# Code standards

Binding on every contributor and every agent working in this repo. `AGENTS.md` points here; reviews
enforce it. Where a rule below and a rule in `AGENTS.md` disagree, `AGENTS.md` wins — it is closer
to the commands.

Grundstein is a small calculator that people load once, in a browser, and trust with a decision
worth several hundred thousand euros. Both facts push the same way: **plain code that a newcomer can
read, test, and change without first learning our abstractions** — and arithmetic that can be proved
right in isolation.

---

## 1. Architecture

**Single responsibility.** Each function, type, or module does exactly one thing and has one reason
to change. `domain/` computes; it does not format for display. `lib/format.ts` formats; it does not
decide policy. A component renders; it does not amortise a loan.

**KISS.** No abstract framework, no plugin system, no premature optimisation, unless a task
explicitly calls for it. Two similar call sites do not justify an abstraction — the third might.
Prefer the obvious implementation over the clever one; someone will read it at 11pm trying to work
out why their monthly payment moved by four euros.

**DRY, applied to knowledge rather than characters.** Extract genuinely shared logic into a named
helper. Do **not** merge two things that merely look alike today — duplication is cheaper than the
wrong abstraction.

**Dependencies point inwards.** `domain/` imports nothing from `lib/`, `state/`, `i18n/`,
`components/` or `features/` — it is pure TypeScript over plain data and could be published as its
own package tomorrow. `lib/` knows nothing of components. `components/ds/` knows nothing of
`features/`. Nothing imports from a route into a component.

**The design is upstream, not a suggestion.** The claude.ai Design project named in `AGENTS.md` is
the source of truth for layout, type, colour and motion. When the code and the design disagree, the
design is right until Oshomo says otherwise.

---

## 2. Testability

**Pure functions by default.** A function given the same input returns the same output, with no
hidden side effects. Anything non-deterministic — the clock, random values, IDs, `localStorage`,
`window` — is passed in, not reached for. This is what makes the amortisation schedule, the closing
costs and the eligibility rules testable without a DOM.

**Dependency injection, explicitly.** A storage handle, a locale, a programme catalogue and a clock
are **arguments**, never things a module reaches out and creates. Take the dependency as a parameter
or a hook.

**Small functions.** Aim under 20–30 lines. If a function needs a section comment to explain its
second half, that half is a function.

**Test what can break.** Every bug fix arrives with the test that would have caught it. `domain/`
gets thorough unit tests, including the edge cases money is lost in: a zero interest rate, a grace
period as long as the term, a follow-up rate segment that starts after the loan ends, an income cap
with four children. `lib/` gets round-trip tests. The layer in between gets one test that proves the
wiring.

**A number in a test is either derived or cited.** Expected values come from an independent
calculation or a documented source, never from pasting in what the code currently returns.

---

## 3. Readability

**Intention-revealing names.** `monthlyPaymentAfterGrace`, not `calcPmt`. `eligibleProgrammesFor`,
not `getData`. Use the terms from `CONTEXT.md` exactly — a variable holding a Tranche is `tranche`,
never `loan`, `slice` or `part`.

**Explicit types on every signature.** `strict` is on. Exported functions and components carry full
parameter and return types, and `any` needs a comment justifying it. No non-null assertion (`!`)
without a comment saying why the value cannot be null.

**Comment _why_, never _what_.** The code says what it does. A comment explains a non-obvious
decision, a workaround, a spec quirk, or a constraint that is not visible locally — for example why
the grace period is clamped to one month short of the term, or why money inputs hold a draft string
while they have focus.

**German domain terms keep their German names** where that is what the user and the sources call
them — `grunderwerbsteuer`, `zinsbindung`, `tilgungsfrei`. Do not invent English half-translations.
`CONTEXT.md` fixes the spelling of each.

---

## 4. Errors

**Guard clauses, fail early.** Handle edge cases at the top and return. No deeply nested
`if`/`else`; the happy path stays at the left margin.

**Standardised handling, never silent.** Throw `Error` subclasses or return a typed result; never
swallow in an empty `catch`. The one sanctioned exception is reading persisted state: a corrupt or
absent `localStorage` payload falls back to defaults, and that fallback is tested.

**A wrong number must never render as a confident one.** If an input cannot be parsed, the field
shows what the user typed and the figures do not move. `NaN`, `Infinity` and negative money never
reach the screen.

**Money is never a float.** Every euro amount in `domain/` is a `Decimal` (decimal.js), rounded
half-even to cents at exactly one place — the boundary where it becomes a `number` for display. A
balance that survives 420 subtractions must close at zero to the cent, and binary floating point
does not do that. Floats remain fine for ratios, percentages and chart geometry, which are never
summed into money.

**Every figure in the programme catalogue carries its provenance.** A ceiling, a rate or an
eligibility rule without a `source` URL and a `verifiedOn` date is not data, it is a rumour. When a
figure cannot be confirmed against the official page, say so in the interface rather than shipping
it silently.

**Error copy is design copy.** User-facing errors say what happened and what became of the user's
work. Never "Something went wrong". Like every other string, they live in the locale files.

---

## 5. Frontend specifics

**Generated shadcn components are never edited.** `src/components/ui/` is output from
`pnpm dlx shadcn@latest add <component>` and must stay byte-for-byte what the generator produces, so
that adding or updating a component never clobbers a local change. Grundstein's own components live
in `src/components/ds/` and compose those primitives. When something needs to look or behave
differently, in this order:

1. Wrap it in `ds/`, passing `className` or props.
2. Change a token in `src/index.css` — which fixes every instance rather than one.
3. Only if neither works, discuss it before touching `ui/`.

**`useEffect` is a last resort, not a default.** Most of what it gets used for has a better tool:

| Instead of an effect that…                                     | Use                                  |
| -------------------------------------------------------------- | ------------------------------------ |
| Subscribes to something outside React (media queries, storage) | `useSyncExternalStore`               |
| Derives a value from props or state                            | Compute it during render             |
| Resets state when a prop changes                               | A `key`, or compute it during render |
| Responds to a user action                                      | The event handler that caused it     |
| Writes to the DOM the module already owns                      | That module, synchronously           |

What is left — genuinely synchronising with an external system, and nothing else — is what
`useEffect` is for. In this app that is the `IntersectionObserver` for scroll reveals and the
measurement of the sticky bar's height. If a case seems to need one, raise it rather than reaching
for it quietly.

**Types are named, never inline.** A prop object written into a signature cannot be imported,
extended, or read at a glance:

```tsx
// No.
function TrancheCard({ tranche, onRemove }: { tranche: Tranche; onRemove: (id: number) => void }) {}

// Yes.
export type TrancheCardProps = {
  tranche: Tranche
  onRemove: (id: number) => void
}

function TrancheCard({ tranche, onRemove }: TrancheCardProps) {}
```

The same applies to hook returns, store slices, and anything else with a shape. Export the type when
anything outside the file could want it.

**Money and numbers go through `lib/format.ts`, and nothing else.** It owns the `Intl` instances,
German thousands separators and the decimal comma, and the parser that turns `"1.250,50"` back into
`1250.5`. No component calls `Intl` or `toFixed` itself. `Intl` **is** right for numbers, currency
and lists.

**Dates go through `lib/dates.ts`, and nothing else.** It wraps date-fns; no component parses,
formats or compares a date itself. `Intl` is not used for dates: its data changes with the runtime's
ICU version, so the same build would look different on different machines.

**Every string a user reads comes from a locale file.** `src/i18n/locales/en.json` is the source
language and holds the design's copy; `de.json` is the German the design specifies, not a machine
translation. Adding a language is adding a JSON file and one entry in `i18n/locales.ts`, never a
code change. No English in a component. `lib/locale-store.ts` owns both the i18next language and the
date-fns locale, so the two cannot drift.

Otherwise:

- Presentation and calculation stay separate: a component that renders a tranche row does not know
  how an annuity is derived. Persistent app state belongs to the store in `src/state/`, read through
  `useSyncExternalStore`; transient UI state is `useState`. There is no third store.
- No colour, radius, spacing or font-size literal in a component — tokens only. The one exception is
  a value the design itself computes from a token, and it carries a comment saying so.
- Accessibility is not a later pass: real `<button>`s, labelled inputs, visible focus rings, 44px
  hit areas, a keyboard path for everything, and a text readout for every chart.
- Motion respects `prefers-reduced-motion`, and the page is fully usable with animation disabled.

---

## 6. Commits and review

**Before every commit**, run `./scripts/ci.sh`. It is exactly what CI runs, in the same order.
Discovering a break after pushing is the same information, slower and noisier.

**Before every push**, run `./scripts/preflight.sh`. It checks out `HEAD` somewhere else, installs
from the lockfile and runs the same script there — so what passes is what you are about to push,
rather than a working tree that has moved on since.

The difference is not pedantry. `ci.sh` checks the tree you are looking at, and two ordinary things
break that: a fix made _after_ the run passed, and a file that was never `git add`ed. Both leave a
green run locally and a red one on GitHub. Note also that `tsc -b` is incremental, so a local run
can skip files a fresh checkout will not.

**Conventional Commits, and keep them short.**

```
<type>(<optional scope>): <description>
```

Types: `feat` · `fix` · `docs` · `refactor` · `test` · `chore` · `build` · `ci` · `perf` · `style`.
Scope is an area — `domain`, `i18n`, `tranches`, `library`, `tokens`.

- Description in the imperative, lower case, no full stop: `feat(domain): add annuity schedule`.
- **No body.** The diff says what changed. If the _why_ genuinely is not obvious, it belongs in a
  code comment next to the decision, where the next reader will actually find it.
- **No trailers.** No tool or assistant attribution, no `Co-Authored-By` for agents.
- `!` after the type, or a `BREAKING CHANGE:` footer, for anything that breaks the persisted state
  schema.

Otherwise:

- One logical change per commit.
- A change in behaviour changes a test.
- A change to the persisted state shape bumps its version and adds a migration.
- `TODO.md` is the running record of what is done; tick the item in the same commit as the work.
