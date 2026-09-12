# Data sources and verification record

Every figure the calculator ships is listed here with where it came from and when it was last
checked against that source. `src/domain/programmes.ts` and `src/domain/states.ts` carry the same
`source` and `verifiedOn` values in code; this file is the working record behind them.

**Last check against source: 2026-09-11.** **Record reconciled with the shipped code: 2026-09-12.**

A figure is only as good as its date. Re-run this check before any release, and whenever a user
reports a number that does not match their offer.

## How to read the tables

The **Ours** column is what the app ships today, not what an earlier draft had. Where the 2026-09-11
check found a figure wrong, the figure was corrected and a **Fixed** note below the table records
what changed — the history is kept because a number that moved once will move again.

| Mark | Meaning                                                                           |
| ---- | --------------------------------------------------------------------------------- |
| ✅   | Matches the source.                                                               |
| 🔶   | Deliberately simpler than the source, and said so in the interface. Not a defect. |
| ❌   | Wrong, and shipping. **There are none of these; any that appears must be fixed.** |

The 🔶 rows are all the same kind of thing: KfW offers a choice the calculator does not model (a
second Zinsbindung length, a ceiling so large it would make a slider useless). Each is disclosed on
the loan itself through `provenance.note`, so nobody is shown one of our conventions as though it
were a KfW rule.

---

## The rule about rates

**KfW publishes no interest rates on its programme pages.** Every rate table on every product page
renders as `-,-- %`, and KfW states that rates are set individually and adjusted to market
conditions on the day of approval.

So no rate in this app is a verified fact. Rates ship as **dated, editable defaults** — a plausible
starting point the user is expected to replace with the number on their own offer. They are marked
as such in the interface. Ceilings, eligibility rules and exclusions are different: those are
published, and those are verified below.

---

## KfW programmes

### 297 / 298 — Klimafreundlicher Neubau

Source:
<https://www.kfw.de/inlandsfoerderung/Privatpersonen/Neubau/Förderprodukte/Klimafreundlicher-Neubau-Wohngebäude-(297-298)/>
Checked 2026-09-11. Link resolves.

| Figure              | Ours              | Source                               | Status          |
| ------------------- | ----------------- | ------------------------------------ | --------------- |
| Ceiling, 297        | 100,000 €         | "bis zu 100.000 Euro je Wohnung"     | ✅              |
| Ceiling, 298 (QNG)  | 150,000 €         | "steigt auf 150.000 Euro je Wohnung" | ✅              |
| Zinsbindung         | 10 yr             | "10 Jahre"                           | ✅              |
| Max Laufzeit        | 35 yr             | "bis zu 35 Jahre"                    | ✅              |
| Tilgungsfreie Jahre | 1                 | 1–5 depending on term                | ✅ within range |
| Energy standard     | EH55, EH40 or QNG | EH40 **or EH55**                     | ✅              |

**Fixed on 2026-09-11.** The programme has a lower tier the prototype did not model: Effizienzhaus
55 not heated with oil or gas also qualifies for the 100,000 € ceiling. `energyTargets` now carries
`eh55`, so an EH55 household is no longer told it does not qualify. The term cap also moved from a
flat 25 years to the programme's real 35.

### 300 — Wohneigentum für Familien (Neubau)

Source:
<https://www.kfw.de/inlandsfoerderung/Privatpersonen/Neubau/Förderprodukte/Wohneigentum-für-Familien-(300)/>
Checked 2026-09-11. Link resolves.

| Figure                   | Ours                  | Source                                        | Status |
| ------------------------ | --------------------- | --------------------------------------------- | ------ |
| Income limit, 1 child    | 90,000 €              | "maximal 90.000 Euro pro Jahr"                | ✅     |
| Per additional child     | +10,000 €             | "plus 10.000 Euro für jedes weitere Kind"     | ✅     |
| Needs a child under 18   | yes                   | yes                                           | ✅     |
| Existing owners excluded | yes                   | explicitly excluded                           | ✅     |
| Energy standard          | EH40/QNG              | "Effizienzhaus-Stufe 40", QNG raises ceilings | ✅     |
| Zinsbindung              | 10 yr                 | "10 Jahre"                                    | ✅     |
| Max Laufzeit             | 35 yr                 | "bis zu 35 Jahre"                             | ✅     |
| Ceiling                  | children × QNG, below | children × QNG                                | ✅     |

| Children | Klimafreundliches Wohngebäude | with QNG  |
| -------- | ----------------------------- | --------- |
| 1–2      | 170,000 €                     | 220,000 € |
| 3–4      | 200,000 €                     | 250,000 € |
| 5+       | 220,000 €                     | 270,000 € |

**Fixed on 2026-09-11.** The ceiling is not one number, and the prototype's flat 270,000 € was the
single best cell in the grid — reachable only by a family of five children with QNG certification. A
one-child household was being shown a monthly payment on 100,000 € it would be refused. The ceiling
is now a `byChildren` rule, and the amount slider's upper bound moves as the household answers
change.

### 308 — Wohneigentum für Familien (Bestandserwerb, "Jung kauft Alt")

Source:
<https://www.kfw.de/inlandsfoerderung/Privatpersonen/Bestehende-Immobilie/Förderprodukte/Wohneigentum-für-Familien-Bestandserwerb-(308)/>
Checked 2026-09-11. Link resolves.

| Figure                   | Ours                | Source                        | Status |
| ------------------------ | ------------------- | ----------------------------- | ------ |
| Ceiling, 1 child         | 140,000 €           | 140,000 €                     | ✅     |
| Ceiling, 2 children      | 160,000 €           | 160,000 €                     | ✅     |
| Ceiling, 3+ children     | 180,000 €           | 180,000 €                     | ✅     |
| Income limit             | 90,000 € +10k/child | same                          | ✅     |
| Building class required  | F, G or H           | "F, G oder H"                 | ✅     |
| Renovation deadline      | 54 months           | "maximal 4,5 Jahre" (= 54 mo) | ✅     |
| Renovation target        | EH85 EE             | EH85 EE or EH Denkmal EE      | ✅     |
| Existing owners excluded | yes                 | yes                           | ✅     |
| Zinsbindung              | 10 yr               | "10 Jahre"                    | ✅     |
| Max Laufzeit             | 35 yr               | "bis zu 35 Jahre"             | ✅     |

**Fixed on 2026-09-11.** Every ceiling in this programme had gone stale, each by 30,000–40,000 €:
the prototype carried 100/125/150k against a published 140/160/180k, so a three-child household was
offered 30,000 € less than it can have. The renovation target was also wrong — EH70 in our copy,
EH85 EE on the page.

### 124 — Wohneigentumsprogramm

Source:
<https://www.kfw.de/inlandsfoerderung/Privatpersonen/Neubau/Förderprodukte/Wohneigentumsprogramm-(124)/>
Checked 2026-09-11. Link resolves.

| Figure          | Ours      | Source                                               | Status                                 |
| --------------- | --------- | ---------------------------------------------------- | -------------------------------------- |
| Ceiling         | 100,000 € | "bis zu 100.000 Euro"                                | ✅                                     |
| Energy standard | none      | none                                                 | ✅                                     |
| Income limit    | none      | none                                                 | ✅                                     |
| Combines widely | yes       | "können Sie mit anderen Förderprodukten kombinieren" | ✅                                     |
| Max Laufzeit    | 35 yr     | "bis zu 35 Jahre"                                    | ✅                                     |
| Zinsbindung     | 10 yr     | **5 or 10 years**                                    | 🔶 only the 10-year option is modelled |

The 5-year option is recorded on the loan in `provenance.note`. Modelling it would mean a second
fixed-rate length per programme, and the follow-up-period editor already lets a user say what
happens when the fixed rate ends, at whatever year they choose.

### 261 — Wohngebäude Kredit (BEG)

Source:
<https://www.kfw.de/inlandsfoerderung/Privatpersonen/Bestehende-Immobilie/Förderprodukte/Bundesförderung-für-effiziente-Gebäude-Wohngebäude-Kredit-(261-262)/>
Checked 2026-09-11. Link resolves.

| Figure             | Ours                       | Source                                      | Status |
| ------------------ | -------------------------- | ------------------------------------------- | ------ |
| Ceiling            | 150,000 €                  | "bis zu 150.000 Euro Kredit je Wohneinheit" | ✅     |
| Building ≥ 5 years | yes                        | "mindestens 5 Jahre zurück"                 | ✅     |
| Renovation only    | yes                        | explicitly not new construction             | ✅     |
| Zinsbindung        | 10 yr                      | max 10 years                                | ✅     |
| Max Laufzeit       | 30 yr                      | "bis zu 30 Jahre"                           | ✅     |
| Tilgungszuschuss   | 5–15%, +10% WPB, +15% ser. | 5–15% by standard, +10% WPB, +15% serial    | ✅     |

**Fixed on 2026-09-11.** The repayment subsidy is real money that reduces what you owe — up to
22,500 € on a 150,000 € loan at EH40 Nachhaltigkeit, before the Worst-Performing-Building and
serial-renovation bonuses. The prototype mentioned it in prose and modelled none of it, so the
programme looked more expensive than it is. It now reduces the balance, which moves both the monthly
payment and the lifetime interest. The term cap also came down from a global 35 years to this
programme's 30.

### 270 — Erneuerbare Energien Standard

Source:
<https://www.kfw.de/inlandsfoerderung/Unternehmen/Energie-Umwelt/Förderprodukte/Erneuerbare-Energien-Standard-(270)/>
Checked 2026-09-11. Link resolves.

| Figure         | Ours                        | Source                                                                | Status                                 |
| -------------- | --------------------------- | --------------------------------------------------------------------- | -------------------------------------- |
| Who may apply  | must feed into the grid     | private individuals **only if they feed power or heat into the grid** | ✅                                     |
| Share financed | —                           | "Bis zu 100 % Ihrer Investitionskosten"                               | —                                      |
| Max Laufzeit   | 30 yr                       | "bis zu 30 Jahre"                                                     | ✅                                     |
| Ceiling        | 150,000 €, declared as ours | "bis zu 150 Mio. Euro pro Vorhaben"                                   | 🔶 ours, and labelled as ours          |
| Zinsbindung    | 10 yr                       | 5, 10, 15, 20 or 30                                                   | 🔶 only the 10-year option is modelled |

**Fixed on 2026-09-11.** Two things were wrong. The grid-feed condition on private applicants is an
eligibility rule the prototype did not model at all; the app now asks the question and only asks it
when a loan in play needs the answer. And the ceiling was presented as a KfW rule when the programme
lends up to 150 million euros per project — a slider to 150 million is useless, so 150,000 € stays
as a sane domestic-solar bound, but `provenance.note` now says in the interface that the number is
ours and the rate is a market rate rather than a subsidised one.

### Bank mortgage

Not a KfW product. Ceiling 2,000,000 € and rate 3.8% are our own plausible defaults, not sourced
figures, and are presented as editable.

---

## Grunderwerbsteuer

Sources: <https://www.finanz-tools.de/grunderwerbsteuer/bundeslaender-tabelle> and
<https://rechenbar.de/ratgeber/grunderwerbsteuer-2026-bundeslaender/>, cross-checked 2026-09-11.
Both agree on all 16.

**All sixteen of our rates are correct.** No change needed.

| Land | Rate | In force since | Land | Rate | In force since |
| ---- | ---- | -------------- | ---- | ---- | -------------- |
| BW   | 5.0% | 2011-11-05     | NI   | 5.0% | 2014-01-01     |
| BY   | 3.5% | 1997-01-01     | NW   | 6.5% | 2015-01-01     |
| BE   | 6.0% | 2014-01-01     | RP   | 5.0% | 2012-03-01     |
| BB   | 6.5% | 2015-07-01     | SL   | 6.5% | 2015-01-01     |
| HB   | 5.5% | 2025-07-01     | SN   | 5.5% | 2023-01-01     |
| HH   | 5.5% | 2023-01-01     | ST   | 5.0% | 2012-03-01     |
| HE   | 6.0% | 2014-08-01     | SH   | 6.5% | 2014-01-01     |
| MV   | 6.0% | 2019-07-01     | TH   | 5.0% | 2024-01-01     |

Two recent movements worth knowing about: **Bremen** rose from 5.0% to 5.5% on 2025-07-01, and
**Thüringen** fell from 6.5% to 5.0% on 2024-01-01. Our values already reflect both.

A caution for the next person to check this: a web search for "Grunderwerbsteuer 2026" currently
returns summaries claiming Thüringen is at 6.5%. That is stale pre-2024 data. Both primary tables
above say 5.0%. Check a table, not a summary.

---

## Purchase fees

Source: aggregated German property-cost guides, checked 2026-09-11. These are conventions and fee
schedules rather than single published rates, so each is editable in the interface.

| Fee                 | Ours  | Source range                                | Status          |
| ------------------- | ----- | ------------------------------------------- | --------------- |
| Notary              | 1.5%  | ~1.0–1.5% (fixed by GNotKG, not negotiable) | ✅ top of range |
| Land registry       | 0.5%  | ~0.5%                                       | ✅              |
| Agent, buyer's half | 3.57% | up to 3.57% incl. VAT, split since Dec 2020 | ✅              |

Notary and registry together are commonly quoted as 1.5–2.0% when a Grundschuld is registered, which
our 1.5% + 0.5% matches.

---

## Open items

Everything the 2026-09-11 check found wrong has been fixed. What is left is what we chose not to
model, kept here so the choice is visible rather than forgotten:

1. **A second Zinsbindung length** for 124 (5 years) and 270 (5, 15, 20 or 30). Both loans carry the
   omission in `provenance.note`. The follow-up-period editor covers the substance of it — a user
   can already say what happens at any year the fixed rate ends.
2. **270's ceiling** is ours, not the programme's, and says so on the loan.

## Re-checking

Open each source URL above, read the figure, and compare it with `src/domain/programmes.ts`. When
everything matches, move `CATALOGUE_VERIFIED_ON` in that file and the two dates at the top of this
one to the day you checked — the interface prints the date on every loan, so it must never claim a
check that did not happen. Where a figure has moved, correct the code first, then this record, and
leave a **Fixed** note saying what changed and what it meant for the user.
