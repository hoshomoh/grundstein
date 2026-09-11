# Data sources and verification record

Every figure the calculator ships is listed here with where it came from and when it was last
checked against that source. `src/domain/programmes.ts` and `src/domain/states.ts` carry the same
`source` and `verifiedOn` values in code; this file is the working record behind them.

**Last full verification: 2026-09-11.**

A figure is only as good as its date. Re-run this check before any release, and whenever a user
reports a number that does not match their offer.

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

| Figure              | Ours      | Source                               | Status                            |
| ------------------- | --------- | ------------------------------------ | --------------------------------- |
| Ceiling, 297        | 100,000 € | "bis zu 100.000 Euro je Wohnung"     | ✅                                |
| Ceiling, 298 (QNG)  | 150,000 € | "steigt auf 150.000 Euro je Wohnung" | ✅                                |
| Zinsbindung         | 10 yr     | "10 Jahre"                           | ✅                                |
| Max Laufzeit        | 25 yr     | "bis zu 35 Jahre"                    | ⚠️ ours is a default, not the max |
| Tilgungsfreie Jahre | 1         | 1–5 depending on term                | ✅ within range                   |
| Energy standard     | EH40      | EH40 **or EH55**                     | ❌ **EH55 tier is missing**       |

**Finding.** The programme now has a lower tier: Effizienzhaus 55 not heated with oil or gas also
qualifies for the 100,000 € ceiling. We only model EH40. A user targeting EH55 is currently told
they do not qualify, which is wrong.

### 300 — Wohneigentum für Familien (Neubau)

Source:
<https://www.kfw.de/inlandsfoerderung/Privatpersonen/Neubau/Förderprodukte/Wohneigentum-für-Familien-(300)/>
Checked 2026-09-11. Link resolves.

| Figure                   | Ours      | Source                                        | Status |
| ------------------------ | --------- | --------------------------------------------- | ------ |
| Income limit, 1 child    | 90,000 €  | "maximal 90.000 Euro pro Jahr"                | ✅     |
| Per additional child     | +10,000 € | "plus 10.000 Euro für jedes weitere Kind"     | ✅     |
| Needs a child under 18   | yes       | yes                                           | ✅     |
| Existing owners excluded | yes       | explicitly excluded                           | ✅     |
| Energy standard          | EH40/QNG  | "Effizienzhaus-Stufe 40", QNG raises ceilings | ✅     |
| Zinsbindung              | 10 yr     | "10 Jahre"                                    | ✅     |
| Ceiling                  | 270,000 € | **a matrix, see below**                       | ❌     |

**Finding.** The ceiling is not one number. It is a grid of children × QNG:

| Children | Klimafreundliches Wohngebäude | with QNG  |
| -------- | ----------------------------- | --------- |
| 1–2      | 170,000 €                     | 220,000 € |
| 3–4      | 200,000 €                     | 250,000 € |
| 5+       | 220,000 €                     | 270,000 € |

We model a flat 270,000 €, which is only reachable by a family with five children and QNG
certification. A one-child household without QNG can borrow 170,000 €, and today the slider lets
them ask for 270,000 € and shows a monthly payment based on it.

### 308 — Wohneigentum für Familien (Bestandserwerb, "Jung kauft Alt")

Source:
<https://www.kfw.de/inlandsfoerderung/Privatpersonen/Bestehende-Immobilie/Förderprodukte/Wohneigentum-für-Familien-Bestandserwerb-(308)/>
Checked 2026-09-11. Link resolves.

| Figure                   | Ours                | Source                        | Status                              |
| ------------------------ | ------------------- | ----------------------------- | ----------------------------------- |
| Ceiling, 1 child         | 100,000 €           | **140,000 €**                 | ❌                                  |
| Ceiling, 2 children      | 125,000 €           | **160,000 €**                 | ❌                                  |
| Ceiling, 3+ children     | 150,000 €           | **180,000 €**                 | ❌                                  |
| Income limit             | 90,000 € +10k/child | same                          | ✅                                  |
| Building class required  | F, G or H           | "F, G oder H"                 | ✅                                  |
| Renovation deadline      | 54 months           | "maximal 4,5 Jahre" (= 54 mo) | ✅                                  |
| Renovation target        | ~EH70 EE            | EH85 EE or EH Denkmal EE      | ⚠️ ours says EH70, source says EH85 |
| Existing owners excluded | yes                 | yes                           | ✅                                  |
| Zinsbindung              | 10 yr               | "10 Jahre"                    | ✅                                  |

**Finding.** Every ceiling in this programme is out of date, by 30,000–40,000 € each. Our top
ceiling of 150,000 € is below the _lowest_ current tier.

### 124 — Wohneigentumsprogramm

Source:
<https://www.kfw.de/inlandsfoerderung/Privatpersonen/Neubau/Förderprodukte/Wohneigentumsprogramm-(124)/>
Checked 2026-09-11. Link resolves.

| Figure          | Ours      | Source                                               | Status                     |
| --------------- | --------- | ---------------------------------------------------- | -------------------------- |
| Ceiling         | 100,000 € | "bis zu 100.000 Euro"                                | ✅                         |
| Energy standard | none      | none                                                 | ✅                         |
| Income limit    | none      | none                                                 | ✅                         |
| Combines widely | yes       | "können Sie mit anderen Förderprodukten kombinieren" | ✅                         |
| Zinsbindung     | 10 yr     | **5 or 10 years**                                    | ⚠️ 5 yr option not offered |
| Max Laufzeit    | 25 yr     | "bis zu 35 Jahre"                                    | ⚠️ ours is a default       |

### 261 — Wohngebäude Kredit (BEG)

Source:
<https://www.kfw.de/inlandsfoerderung/Privatpersonen/Bestehende-Immobilie/Förderprodukte/Bundesförderung-für-effiziente-Gebäude-Wohngebäude-Kredit-(261-262)/>
Checked 2026-09-11. Link resolves.

| Figure             | Ours         | Source                                      | Status                                                  |
| ------------------ | ------------ | ------------------------------------------- | ------------------------------------------------------- |
| Ceiling            | 150,000 €    | "bis zu 150.000 Euro Kredit je Wohneinheit" | ✅                                                      |
| Building ≥ 5 years | yes          | "mindestens 5 Jahre zurück"                 | ✅                                                      |
| Renovation only    | yes          | explicitly not new construction             | ✅                                                      |
| Zinsbindung        | 10 yr        | max 10 years                                | ✅                                                      |
| Max Laufzeit       | 25 yr        | "bis zu 30 Jahre"                           | ⚠️ ours is a default; **slider must cap at 30, not 35** |
| Tilgungszuschuss   | not modelled | 5–15% by standard, +10% WPB, +15% serial    | ❌                                                      |

**Finding.** The repayment subsidy is real money that reduces what you owe — up to 22,500 € on a
150,000 € loan at EH40 Nachhaltigkeit, before the Worst-Performing-Building and serial-renovation
bonuses. We mention it in prose and model none of it, so this programme looks more expensive than it
is.

### 270 — Erneuerbare Energien Standard

Source:
<https://www.kfw.de/inlandsfoerderung/Unternehmen/Energie-Umwelt/Förderprodukte/Erneuerbare-Energien-Standard-(270)/>
Checked 2026-09-11. Link resolves.

| Figure         | Ours      | Source                                                                | Status               |
| -------------- | --------- | --------------------------------------------------------------------- | -------------------- |
| Ceiling        | 150,000 € | **"bis zu 150 Mio. Euro pro Vorhaben"**                               | ❌                   |
| Share financed | —         | "Bis zu 100 % Ihrer Investitionskosten"                               | —                    |
| Who may apply  | anyone    | private individuals **only if they feed power or heat into the grid** | ❌                   |
| Zinsbindung    | 10 yr     | 5, 10, 15, 20 or 30                                                   | ⚠️                   |
| Max Laufzeit   | 10 yr     | "bis zu 30 Jahre"                                                     | ⚠️ ours is a default |

**Finding.** Our ceiling is out by a factor of a thousand. In practice 150,000 € is a sane ceiling
for a domestic solar installation, but it is our invention, not the programme's rule, and it should
say so. The grid-feed condition on private applicants is an eligibility rule we do not model.

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

Recorded here rather than silently fixed, because each changes the data model:

1. **Tiered ceilings** for 300 and 308 (children × QNG), replacing a single `cap`.
2. **Tilgungszuschuss** for 261, which reduces the balance rather than the rate.
3. **EH55 tier** for 297.
4. **270's real ceiling** and its grid-feed eligibility rule.
5. **Per-programme Laufzeit maxima** (30 years for 261 and 270, 35 for the rest) instead of one
   global 35-year slider bound.
