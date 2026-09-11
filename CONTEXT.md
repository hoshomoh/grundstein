# CONTEXT.md — the glossary

The words this app is built from. Use them exactly, in code and in copy. A variable holding a Tranche
is `tranche`, never `loan`, `slice` or `part`.

German terms keep their German names where that is what the user and the sources call them. The
spelling here is the spelling in the code.

---

## The money

**Purchase price** (`price`, _Kaufpreis_)
What the property costs. Does not include any of the fees below.

**Down payment** (`down`, _Eigenkapital_)
The part of the price the buyer covers themselves. Lowers the amount borrowed. Never exceeds
`price`.

**Closing costs** (`closingCosts`, _Kaufnebenkosten_)
Transfer tax + notary + land registry + the buyer's half of the agent fee. German banks lend against
the property's value, and these are not part of it — so they come out of savings. Roughly 5.5–12% of
the price.

**Grunderwerbsteuer** (`transferTax`)
The one-off property transfer tax. Set per Bundesland, 3.5% (Bayern) to 6.5% (NRW, Brandenburg,
Saarland, Schleswig-Holstein). Usually the largest single fee. Keep the German name: it has no
accurate one-word English equivalent and the user will see it on their paperwork.

**Notary** (`notaryFee`, _Notar_) — ~1.5% of the price. Every German sale is signed before a notary.

**Land registry** (`registryFee`, _Grundbuch_) — ~0.5% of the price.

**Agent fee** (`agentFee`, _Maklerprovision_)
Only when an agent is involved. Split roughly evenly between buyer and seller since December 2020, so
the buyer's share is ~3.57% including VAT. `agentEnabled` toggles it.

**Cash needed** (`cashNeeded`)
`closingCosts + down`. The money that must be in the account on completion day. Distinct from the
down payment, and the distinction matters — it is the single most common surprise.

---

## The borrowing

**Tranche** (`tranche`)
One loan in the stack. A financing plan is several tranches — typically two or three KfW programmes
plus a bank loan covering the rest. Has an `amount`, `rate`, `years`, `grace` and any
`followupPeriods`. Never call it a "loan" in code; "loan" is ambiguous between the tranche and the
whole borrowing.

**Programme** (`programme`, plural `programmes`)
The _product_ a tranche is an instance of — `KfW 300`, `Bank mortgage`. Carries the ceiling, the
starting rate and the rules. Lives in the catalogue in `domain/programmes.ts` and is editable in the
Library. British spelling, doubled `m`, consistently.

**KfW**
Kreditanstalt für Wiederaufbau, the German state development bank. Its programmes are cheaper than a
bank loan but each carries conditions. Always capitalised `KfW`.

**Ceiling** (`cap`)
The most a single programme will lend.

**Rate** (`rate`)
The annual nominal interest rate, as a percentage — `3.8` means 3.8%, not 0.038. Convert to a monthly
decimal only inside `domain/amortisation.ts`.

**Term** (`years`, _Laufzeit_)
How long the tranche runs, in years.

**Grace period** (`grace`, _tilgungsfreie Zeit_)
Years at the start paying interest only, with nothing coming off the balance. Makes the early
payments smaller and everything after them larger. Clamped to one month short of the term.

**Zinsbindung** (`FIXED_YEARS`, fixed-rate period)
How long the rate is guaranteed — ten years for KfW. Afterwards the outstanding balance is
refinanced at whatever rate exists then. The dashed line in the year chart marks it. Keep the German
name; "fixed-rate period" is the English copy for it.

**Follow-up period** (`followupPeriod`)
A user-supplied "after year ten, assume N years at R%" segment. A tranche may have several, running
consecutively from the end of the Zinsbindung.

**Annuity** (`annuity`)
The constant monthly payment that clears a balance over N months at a given monthly rate. The one
formula the whole app rests on.

**Amortisation schedule** (`schedule`)
Month-by-month arrays of `principal`, `interest` and `payment` for one tranche.

**Portfolio** (`portfolio`)
Every tranche's schedule summed — the household's actual monthly payment, total interest, and the
year-by-year series the chart draws.

**Principal** (`principal`, _Tilgung_) — the part of a payment that reduces the balance.

**Peak payment** (`peak`)
The highest monthly total across the whole schedule. This is the headline figure, not the first
payment: with a grace period the first payment understates what the household must afford.

---

## The rules

**Eligibility** (`eligibility`)
Whether a profile qualifies for a programme. Tested against project type, children, household
income, existing ownership and energy target. Returns reasons, not just a boolean — the user needs to
know _why_ not.

**Conflict** (`conflict`)
Two programmes that may not both fund the same home — KfW 300 with 297 or 298, KfW 261 with the new
build programmes. Symmetric: if A excludes B, B excludes A, whichever side declares it.

**Cover** (`cover`)
Whether the tranches add up to `price - down`. Either covered, short by an amount, or over by one.

**Profile** (`profile`)
What the user tells us about themselves: `projectType`, `kids`, `income`, `ownsHome`, `energy`.

**Project type** (`projectType`) — `newbuild` · `existing` · `renovate`.

**Energy target** (`energy`) — `qng` · `eh40` · `eh55` · `eh85` · `none`.
Effizienzhaus standards. QNG is the sustainability seal that unlocks the higher ceilings.

---

## The interface

**Ledger** — section 005: what each tranche costs over its life, borrowed versus interest.

**Capital structure** (`structure`) — the single stacked bar showing every tranche plus the buyer's
own money as shares of the total.

**Library** — route `/library`, where the programme catalogue is edited.

**Readout** — the sentence under a chart that says in words what the bars say in pixels. Every chart
has one; it is the accessible path to the data, not decoration.
