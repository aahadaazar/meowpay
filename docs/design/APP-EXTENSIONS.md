# MeowPay — App Extensions to DESIGN.md

**Status:** active · **Extends:** [`DESIGN.md`](../../DESIGN.md) (Clay.com design analysis)

## Why this document exists

`DESIGN.md` is the **system of record** and is not edited. It analyses Clay.com's
**marketing site**, and it says so itself — its Known Gaps close with:

> *The actual Clay product surface (in-app data tables, formula editor, agent builder)
> shares some tokens with the marketing site but adds many product-specific components
> that are out of scope.*

MeowPay is a product surface: a dashboard of tables, charts and dialogs. Three things it
needs are therefore absent from the source by design, not by oversight:

1. **No dark theme.** The system ships dark *tokens* (`surface-dark`, `on-dark`) but uses
   them only for "occasional dark cards (rare)". It has no dark *mode*.
2. **No chart palette.** No categorical, sequential, or diverging ramps exist — the brand
   hues are specified as **card fills**, which is a different job from a data mark.
3. **No product-surface components.** No data table, dialog, toast, chart chrome, or
   empty state.

This document is the extension layer. It has three rules:

- **Additive only.** `DESIGN.md` is never edited. Every value here is either a token from
  the source, or derived from one by a documented procedure.
- **Every extension carries an ADR.** Nothing here is a preference; each section links to
  the decision record that argues it.
- **Derived, not invented.** Where the source can answer, it answers. Where it cannot, the
  method (contrast, CVD, lightness band) answers — and the numbers are in the repo, from a
  script that was actually run.

| Extension | ADR |
|---|---|
| Adopt Clay + extension strategy | [0002](../adr/0002-adopt-clay-design-system-and-extension-strategy.md) |
| Dark theme | [0003](../adr/0003-dark-theme-extension.md) |
| Chart palette | [0004](../adr/0004-chart-palette-derivation.md) |
| Fluid responsive | [0005](../adr/0005-fluid-responsive-strategy.md) |

---

## 1. Dark theme

→ [ADR-0003](../adr/0003-dark-theme-extension.md) — **records a deliberate deviation from a
documented system contract.**

The system says *"the cream-throughout palette is a system contract"* and *"don't use a dark
footer."* A dark theme departs from that. It was taken as an explicit product call: MeowPay
is a dashboard people leave open, not a page they scroll once. ADR-0003 carries the argument
and the cost; this section only records the result.

Every value below is a token **already in `DESIGN.md`**. No new colors were invented — the
extension is that these tokens now form a *mode*, which the source never assembles.

| Role | Light | Dark | Source of the dark value |
|---|---|---|---|
| Canvas | `canvas` #fffaf0 | `surface-dark` #0a1a1a | existing token |
| Card | `canvas` + `hairline` | `surface-dark-elevated` #1a2a2a | existing token |
| Ink / headings | `ink` #0a0a0a | `on-dark` #ffffff | existing token |
| Body | `body` #3a3a3a | `on-dark-soft` #a0a0a0 | existing token |
| Muted | `muted` #6a6a6a | `on-dark-soft` #a0a0a0 | **see note** |
| Primary button | `button-primary` (#0a0a0a fill) | **`button-on-color`** (#fffaf0 fill, `ink` text) | existing component |
| Hairline | `hairline` #e5e5e5 | `rgba(255,255,255,0.10)` | derived (alpha on dark) |

### Why the primary button inverts

`primary` (#0a0a0a) on `surface-dark` (#0a1a1a) measures **1.11:1**. It does not merely look
weak — it is invisible. The two colors differ only in the blue channel.

The system already ships the answer. **`button-on-color`** exists precisely for "white button
used over saturated brand-color feature cards" — an inversion for when the surface is too dark
for the near-black primary. Dark mode is that case, at page scale. It measures **17.17:1** on
`surface-dark`, and its `ink` label sits at **19.03:1** on its own fill.

This is the pattern for the whole theme: the dark mode is *assembled* from the system's
existing inversion vocabulary, not designed alongside it.

### Measured (WCAG, against the dark surfaces)

| Pair | Ratio | |
|---|---|---|
| `on-dark` #ffffff on `surface-dark` #0a1a1a | 17.86 | AA |
| `on-dark` #ffffff on `surface-dark-elevated` #1a2a2a | 14.91 | AA |
| `on-dark-soft` #a0a0a0 on `surface-dark` #0a1a1a | 6.83 | AA |
| `on-dark-soft` #a0a0a0 on `surface-dark-elevated` #1a2a2a | 5.70 | AA |
| `button-on-color` #fffaf0 on `surface-dark` #0a1a1a | 17.17 | AA |
| `primary` #0a0a0a on `surface-dark` #0a1a1a | **1.11** | **invisible — do not use** |
| `muted` #6a6a6a on `surface-dark-elevated` #1a2a2a | **2.76** | **fails — do not carry to dark** |

> **`muted` does not survive the inversion.** #6a6a6a is a light-mode text token; on
> `surface-dark-elevated` it measures 2.76:1 and fails even the 3:1 large-text bar. Dark mode
> collapses `body` and `muted` onto **`on-dark-soft`**, and leans on *size and weight* rather
> than a third grey to separate them. This is a real loss of one hierarchy step in dark mode,
> and it is accepted rather than papered over with an invented grey.

### Implementation

`next-themes` with the **`.dark` class** strategy (not the media query) — the theme is a user
choice with a toggle in the header, and must be able to disagree with the OS. Tokens are CSS
custom properties in `globals.css`, declared once per mode.

---

## 2. Chart palette

→ [ADR-0004](../adr/0004-chart-palette-derivation.md) — carries the full derivation, the
rejected alternatives, and the validator transcript.

**The palette was derived and validated by running
`scripts/validate_palette.js` against Clay's real surfaces — light `#fffaf0`, dark `#1a2a2a`
— in both modes. Nothing here is eyeballed.** The surfaces matter: a mark is only legible
against the surface it actually renders on, and MeowPay's data cards are `canvas` in light and
`surface-dark-elevated` in dark.

### The finding that shaped everything

Clay's brand hues are **card fills**, tuned to be sat *on*, not read *against*. As data marks
on cream they fail:

| Brand hue | Contrast on `canvas` #fffaf0 | |
|---|---|---|
| `brand-peach` #ffb084 | **1.71** | fails |
| `brand-ochre` #e8b94a | **1.76** | fails |
| `brand-mint` #a4d4c5 | **1.58** | fails |
| `brand-lavender` #b8a4ed | **2.11** | fails |
| `brand-coral` #ff6b5a | **2.69** | fails |
| `brand-pink` #ff4d8b | 3.02 | passes, barely |
| `brand-teal` #1a3a3a | 11.80 | passes — but reads near-black, chroma 0.038 |

Six of seven brand hues cannot carry data on the brand's own canvas. This is not a flaw in
Clay's palette; it is what the palette was *for*. A 24px pink card holding white text is doing
a different job than a 6px column that must be told apart from its neighbour.

**Correction to the expected result.** The working assumption going in was that dark would
"mostly pass as-is" while light needed darker steps. The validator says otherwise: the raw
brand hues sit at OKLCH L 0.686–0.832, and the **dark** lightness band is 0.48–0.67 — so the
brand hues are too light for *dark* too. **Both** modes need darker steps than the brand ships.
Light needs them for contrast; dark needs them for the band. Recorded because it was checked,
not assumed.

### Categorical palette (5 slots, both modes)

Derived by holding each brand hue's OKLCH **hue angle** and stepping lightness until the step
cleared the band, the chroma floor (C ≥ 0.10) **and** 3:1 on both surfaces. Slot **order** is
the CVD-safety mechanism: orderings were enumerated and the one maximising the minimum
adjacent ΔE was kept.

| Slot | Hue | Light | Dark | OKLCH L |
|---|---|---|---|---|
| 1 | ochre | `#a87f00` | `#a87f00` | 0.62 |
| 2 | mint | `#009d81` | `#009d81` | 0.62 |
| 3 | peach | `#d16100` | `#d16100` | 0.62 |
| 4 | teal | `#009a9a` | `#009a9a` | 0.62 |
| 5 | coral | `#e24a3c` | `#e24a3c` | 0.62 |

**The two modes share one set — and that is a validated result, not a shortcut.** The usual
rule is that dark steps are *selected* for the dark surface, never flipped automatically. Here
both surfaces were run separately and the same step passed both, because Clay's surfaces sit at
opposite extremes (cream L≈0.98, dark-elevated L≈0.29) and a mid-lightness mark at L 0.62 clears
3:1 against each. Both transcripts are in ADR-0004.

```
worst adjacent CVD ΔE 11.6 (protan)  ·  normal-vision ΔE 17.1  ·  all 5 ≥ 3:1
— identical in light (#fffaf0) and dark (#1a2a2a). ALL CHECKS PASS in both.
```

**The series cap is five, and it is derived, not chosen.** Six slots fail: the best ordering of
six reaches normal-vision ΔE **14.5**, under the floor of 15. Clay's hue wheel is warm-clustered
— pink 4°, coral 29°, peach 50°, ochre 86° occupy 82° of arc, against only mint 174° / teal 195°
as cool anchors — and the collapsed pairs are structural: `ochre↔peach` **ΔE 0** under CVD,
`mint↔teal` ΔE 4, `pink↔coral` ΔE 8. A 6th series folds into **"Other"**; it never gets a
generated hue.

### Reserved hues — not available as series colors

| Hue | Reserved for | Evidence |
|---|---|---|
| `brand-lavender` | **agents.** The system's own Iteration Guide assigns lavender to "AI-agent products". | system rule |
| `brand-pink` | — | collides with `error`: ΔE **7.8** |
| `brand-mint` (raw) | — | collides with `success`: ΔE **14.1** |

**Clay's brand hues overlap its own semantic palette**, because both are warm. Measured against
the reserved status tokens (ΔE < 15 means a reader cannot reliably separate them):

| Candidate | vs `success` | vs `warning` | vs `error` | |
|---|---|---|---|---|
| ochre `#a87f00` | 20.5 | 15.9 | 18.3 | free |
| teal `#009a9a` | 17.2 | 28.3 | 31.3 | free |
| lavender `#9367e9` | 37.9 | 35.8 | 28.0 | free (but reserved for agents) |
| peach `#d16100` | 29.2 | 16.0 | **9.1** | reads as `error` |
| coral `#e24a3c` | 34.8 | 19.5 | **2.7** | reads as `error` |
| pink `#dd4679` | 37.9 | 24.5 | **7.8** | reads as `error` |
| mint `#009d81` | **14.1** | 26.9 | 31.5 | reads as `success` |

This is why **debits are not errors** needs enforcing structurally and not just by avoiding the
`error` token — see the diverging pair below.

### Sequential — the teal ramp

For magnitude (top recipients). **Teal, not lavender** — lavender is reserved for agents.
Validated with `--ordinal` (monotone lightness, adjacent ΔL ≥ 0.06, light end still readable
against the surface, single hue).

| | step 1 | step 2 | step 3 | step 4 | light-end vs surface |
|---|---|---|---|---|---|
| **Light** | `#00bcbc` | `#009a9a` | `#007879` | `#005959` | 2.26:1 — PASS |
| **Dark** | `#00caca` | `#00abab` | `#008989` | `#006969` | 2.29:1 — PASS |

Dark **flips the anchor**: the step nearest the surface is the darkest one, so the ramp is
bounded at the dark end (`#006969`) rather than the light end. Both runs: `hue spread 1° / 0°`,
`all gaps ≥ 0.06`, ALL CHECKS PASS.

> **Note on nominal categories.** A value-ramp on categories with no natural order double-encodes
> bar length as hue and repaints on refresh — and MeowPay's charts are **realtime**, so a
> rank-keyed ramp would visibly recolor cats as ranks shuffle. The top-recipients bars are
> therefore ordered by magnitude and the ramp is keyed to **magnitude, not row index**, so a cat's
> color follows its value rather than its position. Color follows the entity, never its rank.

### Diverging — teal ↔ coral, neutral midpoint

For treat flow: credits above the zero line, debits below. Two hues that read as **opposite**
(teal is cool at 195°, coral warm at 29°) with a **neutral midpoint that is never a hue**.

| Role | Light | Dark |
|---|---|---|
| Credit pole (teal) | `#009a9a` | `#00abab` |
| Debit pole (coral) | `#e24a3c` | `#f45b4b` |
| Midpoint / zero | `surface-strong` #ebe6d6 | `#4a4a4a` (extension token — neutral, **not** teal-tinted) |

Separation teal↔coral: **CVD ΔE 11.7, normal ΔE 29.9.**

`brand-teal` #1a3a3a is **not** the teal pole. At 11.80:1 on cream it is effectively black, and
its chroma (0.038) is below the floor — it reads as *ink*, not as a hue, and would kill the
two-hue read the diverging pair depends on. **The teal pole takes a mid-step.**

The dark midpoint is a **true neutral**, deliberately not derived from the dark hairline: an
alpha-white over `surface-dark-elevated` inherits that surface's teal tint, which would put a
faint *teal* at the midpoint — the exact anti-pattern (the midpoint must read as "nothing", and
a teal midpoint biases the credit pole).

**Debits are not errors.** The `error` token is never used for outflow. But the measurement above
shows the coral pole sits ΔE **2.7** from `error` #ef4444 — perceptually the same red. Avoiding
the *token* is therefore not sufficient, and the mitigation is structural rather than chromatic:

- Debits are **below the zero line**. Position, not color, carries the sign — the strongest
  available secondary encoding, and it is intrinsic to the form.
- Status ships with **icon + label, never color alone** (the system-wide rule), so a failed
  transfer is legible as failed without reference to its red.
- The trail's direction is a **labelled badge** ("Sent" / "Received"), not a colored cell.

A reader never has to distinguish debit-coral from error-red by hue, because neither ever carries
its meaning by hue alone.

### Chart chrome

Recessive by default — the data is the only loud thing on the card.

| Role | Light | Dark |
|---|---|---|
| Chart surface | `canvas` #fffaf0 | `surface-dark-elevated` #1a2a2a |
| Gridline | `hairline-soft` #f0f0f0 | `rgba(255,255,255,0.06)` |
| Axis / baseline | `hairline` #e5e5e5 | `rgba(255,255,255,0.10)` |
| Axis labels | `muted` #6a6a6a | `on-dark-soft` #a0a0a0 |
| Tooltip surface | `canvas` + `hairline`, `rounded.md` | `surface-dark-elevated` + hairline |

Gridlines and axes are **solid hairlines** — never dashed. Marks are thin; 2px surface gap
between adjacent fills rather than a border. Values wear **text tokens**, never the series color.

---

## 3. Fluid responsive

→ [ADR-0005](../adr/0005-fluid-responsive-strategy.md)

`DESIGN.md` ships breakpoints (768 / 1024 / 1440), 44px touch targets, and a collapsing strategy
— but it is **fixed-step**: "hero h1 72→36px" snaps at 768px. The extension **interpolates
between the system's own documented mobile and desktop values** with `clamp()`. The endpoints are
not new: 72px and 36px are both from the source. Only the path between them is added.

| Token | Mobile (documented) | Desktop (documented) | Fluid |
|---|---|---|---|
| `display-xl` | 36px | 72px | `clamp(2.25rem, 1.06rem + 5.29vw, 4.5rem)` |
| `display-lg` | 32px | 56px | `clamp(2rem, 1.21rem + 3.53vw, 3.5rem)` |
| `display-md` | 28px | 40px | `clamp(1.75rem, 1.36rem + 1.76vw, 2.5rem)` |
| `display-sm` | 24px | 32px | `clamp(1.5rem, 1.24rem + 1.18vw, 2rem)` |
| Section rhythm | 24px | 32px | `clamp(1.5rem, 1.24rem + 1.18vw, 2rem)` |

Interpolation runs **375px → 1440px**, the system's own mobile-to-wide span. Letter-spacing
tracks in `em` (`-0.05em`) so it scales with the size rather than needing its own ramp.

### Rules

- **No page-level horizontal scroll, ever.** Charts reflow with their container; they are never
  a fixed-width canvas in a scroller.
- **Trail → stacked cards below 768px.** Not a horizontally scrolling table. A table with 6
  columns cannot be made narrow; below 768px each row becomes a card with the timestamp and
  amount as its header and the rest as labelled pairs. See §4.
- Cat cards and charts: **2-up desktop → 1-up mobile** (the system's "reduce columns rather than
  scaling").
- Top-up preset pills **wrap**; they never shrink below the 44px touch target.
- 44px minimum touch target holds at every breakpoint — it is a floor, not a desktop value.

### Section rhythm — 96px does not survive

`spacing.section` (96px) is **marketing rhythm**, for a long-scroll page where each band is one
idea. A dashboard is a dense working surface: at 96px between bands the total, the cat cards and
the trail cannot be seen together, which defeats the point of a dashboard. MeowPay uses
**`spacing.xl` (32px)** between sections and a **1280px max container** (the system's own
documented max). This is a deliberate departure from *"anchor every band with 96px vertical
rhythm"*, scoped to the product surface only.

---

## 4. Product-surface components

None of these exist in `DESIGN.md`. Each is built from source tokens.

**Brand voltage — middle.** Saturated cards on non-data sections; **neutral surfaces under all
data**. Charts and the trail never sit on a saturated fill: it fights legibility and contradicts
recessive chrome. `product-mockup-card` (canvas + hairline, `rounded.lg`, 24px padding) is the
system's literal fit for a data card — it is the component Clay uses to hold *product UI
fragments*, which is exactly what these are.

### `data-table`

The trail. Rows separated by `hairline-soft` (#f0f0f0), header in `caption-uppercase`, numeric
columns in **`tabular-nums`**. No zebra striping, no vertical rules — the hairline is the only
separator, consistent with the system's flat elevation model. Row height 44px (the touch-target
floor doubles as row rhythm).

Columns: timestamp · cat · counterparty · direction badge · amount · running `balance_after` ·
source badge.

**Below 768px → stacked cards** (`rounded.md`, hairline, 16px padding), one per row.

### `badge-pill` — semantic variants

The source ships one `badge-pill` (cream fill, `caption`, `rounded.pill`, 4px×12px). The
extension adds variants, holding its shape and type:

| Variant | Fill | Text | Use |
|---|---|---|---|
| `badge-pill-credit` | mint tint | `ink` | inbound |
| `badge-pill-debit` | coral tint | `ink` | outbound |
| `badge-pill-agent` | **`brand-lavender`** #b8a4ed | `ink` | `source='agent'` |
| `badge-pill-manual` | `surface-card` (default) | `ink` | `source='manual'` |
| `badge-pill-system` | `surface-strong` | `muted` | `welcome_grant`, `topup` |

`badge-pill-agent` is lavender **on the system's own instruction** — its Iteration Guide assigns
lavender to "AI-agent products". Every badge carries a **label**; the fill is redundant encoding,
never the message.

### `chart-card`

`product-mockup-card` + a header row (title in `title-md`, optional legend right). The legend is
present whenever there are ≥2 series. Sized to include the x-axis band — a fixed height that
excludes axis labels produces a nested scrollbar.

### `dialog`

Confirm-transfer and new-cat. `surface-card` fill light / `surface-dark-elevated` dark,
`rounded.lg` (16px — content-card radius, not feature-card 24px), 24px padding, scrim
`rgba(10,10,10,0.4)`. Actions right-aligned: `button-primary` confirm, `button-secondary` cancel.
Max width 420px; full-width minus 16px gutters below 480px.

### `toast`

Transfer result. `canvas` + hairline light / `surface-dark-elevated` dark, `rounded.md`, 16px
padding, bottom-right desktop → top full-width mobile. Carries **icon + label**; success and
failure are never distinguished by color alone. Failure surfaces the backend's
`failure_reason` verbatim.

### `empty-state`

No cats yet. Centered in a `product-mockup-card`: `display-sm` headline, `body-md` sub, one
`button-primary` ("Create your first cat").

> **No illustration.** The system's most-recognized element is its 3D claymation, and the empty
> state is exactly where a marketing site would put one. Claymation is **commissioned art**, and
> `DESIGN.md` says so — *"not system tokens"*. Substituting flat vector art is an explicit
> "Don't". The gap is acknowledged rather than faked with a stock illustration that would read as
> off-brand. The empty state is typographic.

---

## 5. Reconciliations

Where the source's rules and the product's needs appear to conflict, and how each resolves.

### "Never document hover" vs. chart tooltips

**No conflict.** The Iteration Guide's *"Never document hover"* and *"Don't add hover state
styling beyond what the system already encodes"* are about **decorative hover styling** — the
lift-and-shadow reflex the system deliberately refuses ("Subtle drop shadow … rare").

A chart crosshair and tooltip are **functional interaction**, not styling: on a dense
time-series they are the mechanism by which a value is read at all. The rule bans decoration,
not interaction.

The obligation this creates: a tooltip **enhances, never gates**. Every value it shows is also
reachable — the trail table is the chart's table-view twin, and keyboard focus shows what hover
shows. Hit targets meet ~24px even where the mark is thinner.

### 96px section rhythm → 32px

See §3. Marketing rhythm vs. dashboard density. Scoped to the product surface; `spacing.section`
is untouched for any marketing page.

### Plain Black is unavailable

The source's own Known Gaps: *"Plain Black is licensed to Clay and not available as a public web
font."* Its own substitution note names the answer: **Inter at weight 500 with -0.05em
letter-spacing**. Loaded via `next/font` (self-hosted, no layout shift, no external request).

We follow the system's own instruction. Weight stays at **500** — *"Don't bold display weight
beyond 500"*. The `em` letter-spacing is what makes the fluid ramp in §3 work without a second
ramp.

### shadcn ships cool grays

shadcn/ui's default CSS variables are **cool gray** (`--background` #ffffff, `--border` a
slate). Adopting them unmodified would violate the system's single most emphatic rule:

> *Don't use cool grays for canvas. The cream tint is non-negotiable.*

The defaults are therefore **re-tokenized, not overridden per-component**: `--background`,
`--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--border`, `--input`, `--ring`
and `--radius` are redefined to Clay tokens in `globals.css`, for **both modes**. Re-tokenizing
at the variable layer means every shadcn component inherits Clay without a single component
patch — and a component added later is correct by default rather than correct if someone
remembers.

`--radius` maps to `rounded.md` (12px), the system's button/input radius.

### Figures

Proportional figures for the **total hero** — `tabular-nums` on a large standalone number makes
`121` look loose. `tabular-nums` **only** where digits align vertically: trail rows, axis ticks,
cat-card balances in a grid.

---

## 6. Token additions

The complete set of values this document adds. Everything else is `DESIGN.md`.

```
chart-series-1        #a87f00   (ochre  — both modes)
chart-series-2        #009d81   (mint   — both modes)
chart-series-3        #d16100   (peach  — both modes)
chart-series-4        #009a9a   (teal   — both modes)
chart-series-5        #e24a3c   (coral  — both modes)

chart-seq-teal        light  #00bcbc #009a9a #007879 #005959
                      dark   #00caca #00abab #008989 #006969

chart-diverge-credit  light #009a9a   dark #00abab
chart-diverge-debit   light #e24a3c   dark #f45b4b
chart-neutral         light #ebe6d6   dark #4a4a4a

chart-grid            light #f0f0f0            dark rgba(255,255,255,0.06)
chart-axis            light #e5e5e5            dark rgba(255,255,255,0.10)
hairline-dark                                  dark rgba(255,255,255,0.10)
```

Five values are genuinely new: the **dark hairline**, the **dark chart grid**, the **dark
neutral midpoint** `#4a4a4a`, and the dark diverging poles. Everything else is a Clay hue at a
different lightness — same hue angle, stepped until it passed. The brand is preserved; only the
job changed.

## Known gaps (this document)

- **No illustrations.** Claymation is commissioned; see §4. The single largest divergence from
  the brand's actual voice, and it is a scope decision, not a design one.
- **Dark mode loses a text hierarchy step** — `muted` does not survive the inversion (§1).
- **The categorical palette caps at 5 series** (§2). Not a limitation of the method — a property
  of Clay's warm-clustered hue wheel.
- **Animation and transition timings** are out of scope in the source and remain so here.
- The chart palette is validated for **color**. Layout — label collision, tick density, reflow —
  is verified by rendering at 375 / 768 / 1440px in both modes, not by the validator.
